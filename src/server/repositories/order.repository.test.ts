import test from "node:test";
import assert from "node:assert/strict";

import { ConflictError, NotFoundError } from "@/lib/api-errors";
import {
  createSequentialDbMock,
  type SequentialDbMock,
} from "@/test-utils/mocks/drizzle";
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

// --- updateOrderStatus (spec 020) ---------------------------------------
// Orden de llamadas al mock: SELECT ... FOR UPDATE → UPDATE orders →
// [SELECT líneas + UPDATE products si el destino es `paid`] → INSERT audit_logs.

type AuditLogValues = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: { before: { status: string }; after: { status: string } };
  severity: string;
};

/** Lo que se pasó a `.values()`: el único INSERT de estas transiciones es el log. */
function auditLogInput(dbMock: SequentialDbMock): AuditLogValues {
  const call = dbMock.calls.find((recorded) => recorded.method === "values");

  assert.ok(call, "se esperaba un INSERT con .values() para el audit log");

  return call.args[0] as AuditLogValues;
}

function countCalls(dbMock: SequentialDbMock, method: string): number {
  return dbMock.calls.filter((recorded) => recorded.method === method).length;
}

const actorId = "actor-1";

test("updateOrderStatus throws NotFoundError when the order does not exist", async (t) => {
  const dbMock = createSequentialDbMock([]);
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      updateOrderStatus({ orderId: "missing", nextStatus: "paid", actorId }),
    NotFoundError,
  );
});

test("updateOrderStatus throws ConflictError on a forbidden transition without touching the row or the log", async (t) => {
  // Solo el SELECT tiene resultado en cola: cualquier escritura posterior
  // fallaría por cola vacía antes de llegar al assert de abajo (AC3).
  const dbMock = createSequentialDbMock([{ status: "canceled" }]);
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      updateOrderStatus({ orderId: "order-1", nextStatus: "paid", actorId }),
    ConflictError,
  );

  assert.equal(countCalls(dbMock, "update"), 0);
  assert.equal(countCalls(dbMock, "insert"), 0);
});

test("updateOrderStatus refuses to re-apply the status the order already has", async (t) => {
  const dbMock = createSequentialDbMock([{ status: "canceled" }]);
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      updateOrderStatus({
        orderId: "order-1",
        nextStatus: "canceled",
        actorId,
      }),
    ConflictError,
  );

  assert.equal(countCalls(dbMock, "update"), 0);
});

test("updateOrderStatus throws ConflictError when the row changed between the SELECT and the UPDATE", async (t) => {
  const dbMock = createSequentialDbMock([{ status: "pending" }], []);
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await assert.rejects(
    () =>
      updateOrderStatus({ orderId: "order-1", nextStatus: "paid", actorId }),
    ConflictError,
  );

  assert.equal(countCalls(dbMock, "insert"), 0);
});

test("updateOrderStatus marks a pending order as paid and decrements the stock of its lines", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "pending" }],
    [{ id: "order-1", status: "paid" }],
    [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ],
    [],
    [],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  const order = await updateOrderStatus({
    orderId: "order-1",
    nextStatus: "paid",
    actorId,
  });

  assert.equal(order.status, "paid");
  // UPDATE de la orden + un UPDATE de stock por línea.
  assert.equal(countCalls(dbMock, "update"), 3);
});

test("updateOrderStatus audits pending → paid as order.status_changed", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "pending" }],
    [{ id: "order-1", status: "paid" }],
    [],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await updateOrderStatus({ orderId: "order-1", nextStatus: "paid", actorId });

  const log = auditLogInput(dbMock);
  assert.equal(log.action, "order.status_changed");
  assert.equal(log.severity, "info");
  assert.equal(log.actorId, actorId);
  assert.equal(log.entityType, "order");
  assert.equal(log.entityId, "order-1");
});

test("updateOrderStatus cancels a pending order without restocking anything", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "pending" }],
    [{ id: "order-1", status: "canceled" }],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  const order = await updateOrderStatus({
    orderId: "order-1",
    nextStatus: "canceled",
    actorId,
  });

  assert.equal(order.status, "canceled");
  // Solo el UPDATE de la orden: cancelar no toca `products` (deuda del spec 019).
  assert.equal(countCalls(dbMock, "update"), 1);
});

test("updateOrderStatus cancels a paid order and audits it as order.canceled", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "paid" }],
    [{ id: "order-1", status: "canceled" }],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await updateOrderStatus({
    orderId: "order-1",
    nextStatus: "canceled",
    actorId,
  });

  const log = auditLogInput(dbMock);
  assert.equal(log.action, "order.canceled");
  assert.equal(log.severity, "warning");
  assert.equal(countCalls(dbMock, "update"), 1);
});

test("updateOrderStatus writes exactly one audit row per transition", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "pending" }],
    [{ id: "order-1", status: "canceled" }],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await updateOrderStatus({
    orderId: "order-1",
    nextStatus: "canceled",
    actorId,
  });

  assert.equal(countCalls(dbMock, "insert"), 1);
});

test("updateOrderStatus logs only the status in changes, with no customer or payment data", async (t) => {
  const dbMock = createSequentialDbMock(
    [{ status: "pending" }],
    [
      {
        id: "order-1",
        status: "canceled",
        userId: "user-1",
        totalCents: 3000,
        stripePaymentIntentId: "pi_test_1",
      },
    ],
    [{ id: "log-1" }],
  );
  const { updateOrderStatus } = await loadOrderRepository(t, dbMock);

  await updateOrderStatus({
    orderId: "order-1",
    nextStatus: "canceled",
    actorId,
  });

  assert.deepEqual(auditLogInput(dbMock).changes, {
    before: { status: "pending" },
    after: { status: "canceled" },
  });
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

test("listAllOrders returns an empty array without querying items when there are no orders", async (t) => {
  const dbMock = createSequentialDbMock([]);
  const { listAllOrders } = await loadOrderRepository(t, dbMock);

  assert.deepEqual(await listAllOrders(), []);
});

test("listAllOrders groups line items under their matching order", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      {
        order: { id: "order-1" },
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      {
        order: { id: "order-2" },
        firstName: "Alan",
        lastName: "Turing",
        email: "alan@example.com",
      },
    ],
    [
      { orderId: "order-1", productName: "Mouse" },
      { orderId: "order-1", productName: "Pad" },
      { orderId: "order-2", productName: "Keyboard" },
    ],
  );
  const { listAllOrders } = await loadOrderRepository(t, dbMock);

  const orders = await listAllOrders();
  assert.equal(orders[0].items.length, 2);
  assert.equal(orders[1].items.length, 1);
});

test("listAllOrders composes the customer name from first and last name", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      {
        order: { id: "order-1" },
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
    ],
    [],
  );
  const { listAllOrders } = await loadOrderRepository(t, dbMock);

  const orders = await listAllOrders();
  assert.equal(orders[0].customerName, "Ada Lovelace");
  assert.equal(orders[0].customerEmail, "ada@example.com");
});

test("listAllOrders skips the missing half of the name", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      {
        order: { id: "order-1" },
        firstName: "Ada",
        lastName: null,
        email: "ada@example.com",
      },
    ],
    [],
  );
  const { listAllOrders } = await loadOrderRepository(t, dbMock);

  const orders = await listAllOrders();
  assert.equal(orders[0].customerName, "Ada");
});

test("listAllOrders falls back to the email when the customer has no name", async (t) => {
  const dbMock = createSequentialDbMock(
    [
      {
        order: { id: "order-1" },
        firstName: null,
        lastName: null,
        email: "ada@example.com",
      },
    ],
    [],
  );
  const { listAllOrders } = await loadOrderRepository(t, dbMock);

  const orders = await listAllOrders();
  assert.equal(orders[0].customerName, "ada@example.com");
});
