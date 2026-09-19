import test from "node:test";
import assert from "node:assert/strict";

import {
  canTransition,
  ORDER_STATUSES,
  ORDER_STATUS_TARGETS,
  ORDER_STATUS_TRANSITIONS,
} from "./order-status-transitions.ts";

// La tabla del spec 020, transcrita tal cual: lo que no está aquí es 409.
const VALID_TRANSITIONS = [
  ["pending", "paid"],
  ["pending", "canceled"],
  ["paid", "canceled"],
] as const;

test("canTransition accepts every transition listed in the spec", () => {
  for (const [from, to] of VALID_TRANSITIONS) {
    assert.equal(canTransition(from, to), true, `${from} → ${to}`);
  }
});

test("canTransition rejects every pair outside the spec table", () => {
  const allowed = new Set(VALID_TRANSITIONS.map(([from, to]) => `${from}→${to}`));

  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      if (allowed.has(`${from}→${to}`)) {
        continue;
      }

      assert.equal(canTransition(from, to), false, `${from} → ${to}`);
    }
  }
});

test("canTransition treats canceled as a terminal state", () => {
  assert.equal(canTransition("canceled", "paid"), false);
  assert.equal(canTransition("canceled", "pending"), false);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.canceled, []);
});

test("canTransition forbids going back to pending", () => {
  assert.equal(canTransition("paid", "pending"), false);
  assert.equal(canTransition("canceled", "pending"), false);
});

test("canTransition forbids re-applying the same status", () => {
  for (const status of ORDER_STATUSES) {
    assert.equal(canTransition(status, status), false, `${status} → ${status}`);
  }
});

test("canTransition rejects a status that is not part of the machine", () => {
  assert.equal(canTransition("refunded", "paid"), false);
  assert.equal(canTransition("pending", "shipped"), false);
  assert.equal(canTransition("", ""), false);
});

test("ORDER_STATUS_TARGETS lists exactly the statuses reachable from somewhere", () => {
  const reachable = new Set(Object.values(ORDER_STATUS_TRANSITIONS).flat());

  assert.deepEqual([...ORDER_STATUS_TARGETS].sort(), [...reachable].sort());
});
