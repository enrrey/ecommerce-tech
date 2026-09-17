import test from "node:test";
import assert from "node:assert/strict";

import {
  isWithinRange,
  matchesCustomer,
  matchesStatus,
} from "./admin-order-filters.ts";

const customer = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
};

test("matchesCustomer accepts every order when the term is empty", () => {
  assert.equal(matchesCustomer(customer, "   "), true);
});

test("matchesCustomer matches a partial name ignoring case", () => {
  assert.equal(matchesCustomer(customer, "LOVE"), true);
});

test("matchesCustomer matches a partial email ignoring case", () => {
  assert.equal(matchesCustomer(customer, "EXAMPLE.COM"), true);
});

test("matchesCustomer rejects a term present in neither field", () => {
  assert.equal(matchesCustomer(customer, "turing"), false);
});

test("matchesStatus accepts every order with the sentinel value", () => {
  assert.equal(matchesStatus({ status: "paid" }, "all"), true);
});

test("matchesStatus keeps only the orders with the chosen status", () => {
  assert.equal(matchesStatus({ status: "paid" }, "paid"), true);
  assert.equal(matchesStatus({ status: "pending" }, "paid"), false);
});

test("isWithinRange includes both ends of the range", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };

  assert.equal(
    isWithinRange({ createdAt: "2026-09-01T00:00:00.000Z" }, range),
    true,
  );
  assert.equal(
    isWithinRange({ createdAt: "2026-09-30T23:59:59.000Z" }, range),
    true,
  );
});

test("isWithinRange excludes the days outside the range", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };

  assert.equal(
    isWithinRange({ createdAt: "2026-08-31T23:00:00.000Z" }, range),
    false,
  );
  assert.equal(
    isWithinRange({ createdAt: "2026-10-01T01:00:00.000Z" }, range),
    false,
  );
});

test("isWithinRange leaves the missing end without a bound", () => {
  assert.equal(
    isWithinRange({ createdAt: "2020-01-01T00:00:00.000Z" }, {
      to: "2026-09-30",
    }),
    true,
  );
  assert.equal(
    isWithinRange({ createdAt: "2030-01-01T00:00:00.000Z" }, {
      from: "2026-09-01",
    }),
    true,
  );
  assert.equal(isWithinRange({ createdAt: "2026-09-15T00:00:00.000Z" }, {}), true);
});
