import test from "node:test";
import assert from "node:assert/strict";

import {
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./admin-order.schema.ts";
import { ORDER_STATUS_TARGETS } from "../lib/order-status-transitions";

const UUID = "11111111-1111-4111-8111-111111111111";

test("orderIdParamSchema accepts a UUID", () => {
  const parsed = orderIdParamSchema.safeParse({ id: UUID });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.id, UUID);
});

test("orderIdParamSchema rejects an id that is not a UUID", () => {
  assert.equal(orderIdParamSchema.safeParse({ id: "order-1" }).success, false);
  assert.equal(orderIdParamSchema.safeParse({ id: "" }).success, false);
});

test("orderIdParamSchema rejects a missing or non-string id", () => {
  assert.equal(orderIdParamSchema.safeParse({}).success, false);
  assert.equal(orderIdParamSchema.safeParse({ id: 1 }).success, false);
});

test("updateOrderStatusSchema accepts every status the panel can assign", () => {
  for (const status of ORDER_STATUS_TARGETS) {
    assert.equal(
      updateOrderStatusSchema.safeParse({ status }).success,
      true,
      status,
    );
  }
});

test("updateOrderStatusSchema rejects pending, which is not a valid target", () => {
  assert.equal(
    updateOrderStatusSchema.safeParse({ status: "pending" }).success,
    false,
  );
});

test("updateOrderStatusSchema rejects a status outside the state machine", () => {
  assert.equal(
    updateOrderStatusSchema.safeParse({ status: "refunded" }).success,
    false,
  );
  assert.equal(
    updateOrderStatusSchema.safeParse({ status: "PAID" }).success,
    false,
  );
});

test("updateOrderStatusSchema rejects a missing or non-string status", () => {
  assert.equal(updateOrderStatusSchema.safeParse({}).success, false);
  assert.equal(updateOrderStatusSchema.safeParse({ status: 1 }).success, false);
  assert.equal(updateOrderStatusSchema.safeParse(null).success, false);
});
