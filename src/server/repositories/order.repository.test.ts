import test from "node:test";
import assert from "node:assert/strict";

import { ConflictError, NotFoundError } from "@/lib/api-errors";
import { createSequentialDbMock } from "@/test-utils/mocks/drizzle";
import { mergeLines, startOfNextDay } from "./order.repository.ts";

test("mergeLines keeps a single line per distinct product", () => {
  const merged = mergeLines([
    { productId: "p1", quantity: 1 },
    { productId: "p2", quantity: 3 },
  ]);
  assert.equal(merged.size, 2);
});

test("mergeLines sums the quantity of repeated products", () => {
  const merged = mergeLines([
    { productId: "p1", quantity: 2 },
    { productId: "p1", quantity: 3 },
  ]);
  assert.deepEqual(merged.get("p1"), { productId: "p1", quantity: 5 });
});

test("mergeLines returns an empty map for an empty cart", () => {
  const merged = mergeLines([]);
  assert.equal(merged.size, 0);
});

test("startOfNextDay returns midnight UTC of the following day", () => {
  assert.equal(startOfNextDay("2026-09-09"), "2026-09-10T00:00:00.000Z");
});

test("startOfNextDay rolls over correctly across a month boundary", () => {
  assert.equal(startOfNextDay("2026-01-31"), "2026-02-01T00:00:00.000Z");
});

test("startOfNextDay rolls over correctly across a year boundary", () => {
  assert.equal(startOfNextDay("2026-12-31"), "2027-01-01T00:00:00.000Z");
});

async function loadOrderRepository(t: import("node:test").TestContext, dbMock: unknown) {
  t.mock.module("@/server/db", { exports: { db: dbMock } });
  return import(`./order.repository.ts?case-${Math.random()}`);
}

test("createPendingOrder merges duplicate lines before validating stock", async (t) => {
  const dbMock = createSequentialDbMock(
    // catalogRows: un solo producto en el catálogo aunque el carrito lo pida dos veces
    [{ id: "p1", name: "Mouse", priceCents: 1000, stock: 10, isActive: true }],
    [{ id: "order-1", userId: "user-1", totalCents: 3000, status: "pending" }],
    [{ productId: "p1", productName: "Mouse", unitPriceCents: 1000, quantity: 3 }],
  );
  const { createPendingOrder } = await loadOrderRepository(t, dbMock);

  const order = await createPendingOrder({
    userId: "user-1",
    items: [
      { productId: "p1", quantity: 1 },
      { productId: "p1", quantity: 2 },
    ],
  });

  assert.equal(order.totalCents, 3000);
});

test("createPendingOrder throws NotFoundError when a product no longer exists", async (t) => {
  const dbMock = createSequentialDbMock([]);
  const { createPendingOrder } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      createPendingOrder({
        userId: "user-1",
        items: [{ productId: "missing", quantity: 1 }],
      }),
    NotFoundError,
  );
});

test("createPendingOrder throws ConflictError when the product is inactive", async (t) => {
  const dbMock = createSequentialDbMock([
    { id: "p1", name: "Mouse", priceCents: 1000, stock: 10, isActive: false },
  ]);
  const { createPendingOrder } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      createPendingOrder({
        userId: "user-1",
        items: [{ productId: "p1", quantity: 1 }],
      }),
    ConflictError,
  );
});

test("createPendingOrder throws ConflictError when there is not enough stock", async (t) => {
  const dbMock = createSequentialDbMock([
    { id: "p1", name: "Mouse", priceCents: 1000, stock: 1, isActive: true },
  ]);
  const { createPendingOrder } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      createPendingOrder({
        userId: "user-1",
        items: [{ productId: "p1", quantity: 2 }],
      }),
    ConflictError,
  );
});

test("createPendingOrder computes the total as an integer sum of unit price times quantity", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      { id: "p1", name: "Mouse", priceCents: 1099, stock: 10, isActive: true },
      { id: "p2", name: "Pad", priceCents: 501, stock: 10, isActive: true },
    ],
    [{ id: "order-1", userId: "user-1" }],
    [],
  );
  const { createPendingOrder } = await loadOrderRepository(t, dbMock);

  await createPendingOrder({
    userId: "user-1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 3 },
    ],
  });

  const insertOrderValues = dbMock.calls.find((call) => call.method === "values")
    ?.args[0] as { totalCents: number };

  // 1099*2 + 501*3 = 2198 + 1503 = 3701
  assert.equal(insertOrderValues.totalCents, 3701);
});

test("markOrderAsPaid returns false when no pending order matches the checkout session", async (t) => {
  // `.returning()` de Drizzle siempre da un array: vacío = ninguna fila afectada.
  const dbMock = createSequentialDbMock([]);
  const { markOrderAsPaid } = await loadOrderRepository(t, dbMock);

  assert.equal(await markOrderAsPaid("cs_test_1", "pi_test_1"), false);
});

test("markOrderAsPaid decrements stock for every line and returns true", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ id: "order-1" }],
    [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ],
    [],
    [],
  );
  const { markOrderAsPaid } = await loadOrderRepository(t, dbMock);

  assert.equal(await markOrderAsPaid("cs_test_1", "pi_test_1"), true);
});

test("markOrderAsPaid skips lines whose product was deleted from the catalog", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ id: "order-1" }],
    [{ productId: null, quantity: 1 }],
  );
  const { markOrderAsPaid } = await loadOrderRepository(t, dbMock);

  assert.equal(await markOrderAsPaid("cs_test_1", "pi_test_1"), true);
});

test("findOrderById returns null when the order does not exist", async (t) => {
  const dbMock = createSequentialDbMock([]);
  const { findOrderById } = await loadOrderRepository(t, dbMock);

  assert.equal(await findOrderById("missing"), null);
});

test("findOrderById attaches the order's items when it exists", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ id: "order-1", userId: "user-1" }],
    [{ id: "item-1", orderId: "order-1", productName: "Mouse" }],
  );
  const { findOrderById } = await loadOrderRepository(t, dbMock);

  const order = await findOrderById("order-1");
  assert.equal(order?.items.length, 1);
});

test("listOrdersByUser returns an empty array without querying items when there are no orders", async (t) => {
  const dbMock = createSequentialDbMock([]);
  const { listOrdersByUser } = await loadOrderRepository(t, dbMock);

  assert.deepEqual(await listOrdersByUser("user-1"), []);
});

test("listOrdersByUser groups line items under their matching order", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      { id: "order-1", userId: "user-1" },
      { id: "order-2", userId: "user-1" },
    ],
    [
      { orderId: "order-1", productName: "Mouse" },
      { orderId: "order-1", productName: "Pad" },
      { orderId: "order-2", productName: "Keyboard" },
    ],
  );
  const { listOrdersByUser } = await loadOrderRepository(t, dbMock);

  const orders = await listOrdersByUser("user-1");
  assert.equal(orders[0].items.length, 2);
  assert.equal(orders[1].items.length, 1);
});

test("listOrdersByUser leaves an order with no matching lines with an empty items array", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ id: "order-1", userId: "user-1" }],
    [],
  );
  const { listOrdersByUser } = await loadOrderRepository(t, dbMock);

  const orders = await listOrdersByUser("user-1");
  assert.deepEqual(orders[0].items, []);
});
