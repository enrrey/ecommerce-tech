import test from "node:test";
import assert from "node:assert/strict";

async function loadService(t: import("node:test").TestContext) {
  const get = t.mock.fn(async (url: string) =>
    url.endsWith("/receipt")
      ? { data: { id: "order-1" } }
      : { data: [{ id: "order-1" }] },
  );

  t.mock.module("@/lib/axios", { exports: { api: { get } } });

  const mod = await import(`./order-history.service.ts?case-${Math.random()}`);

  return { ...mod, get };
}

test("getMyOrders requests /orders/mine with the given date range as params", async (t) => {
  const { getMyOrders, get } = await loadService(t);

  const query = { from: "2026-01-01" };
  const orders = await getMyOrders(query);

  assert.deepEqual(get.mock.calls[0].arguments, ["/orders/mine", { params: query }]);
  assert.deepEqual(orders, [{ id: "order-1" }]);
});

test("getMyOrders defaults to an empty query when none is given", async (t) => {
  const { getMyOrders, get } = await loadService(t);

  await getMyOrders();

  assert.deepEqual(get.mock.calls[0].arguments[1], { params: {} });
});

test("getOrderReceipt requests /orders/:id/receipt", async (t) => {
  const { getOrderReceipt, get } = await loadService(t);

  const receipt = await getOrderReceipt("order-1");

  assert.equal(get.mock.calls[0].arguments[0], "/orders/order-1/receipt");
  assert.deepEqual(receipt, { id: "order-1" });
});
