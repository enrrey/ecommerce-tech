import test from "node:test";
import assert from "node:assert/strict";

import { myOrdersQuerySchema, DATE_RANGE_MESSAGE } from "./order-history.schema.ts";

test("myOrdersQuerySchema accepts an empty query with no date filter", () => {
  const result = myOrdersQuerySchema.parse({});
  assert.equal(result.from, undefined);
  assert.equal(result.to, undefined);
});

test("myOrdersQuerySchema treats an empty string 'from' as no filter", () => {
  const result = myOrdersQuerySchema.parse({ from: "", to: "" });
  assert.equal(result.from, undefined);
  assert.equal(result.to, undefined);
});

test("myOrdersQuerySchema accepts a valid ascending date range", () => {
  const result = myOrdersQuerySchema.safeParse({
    from: "2026-01-01",
    to: "2026-01-31",
  });
  assert.equal(result.success, true);
});

test("myOrdersQuerySchema accepts equal from and to dates", () => {
  const result = myOrdersQuerySchema.safeParse({
    from: "2026-01-01",
    to: "2026-01-01",
  });
  assert.equal(result.success, true);
});

test("myOrdersQuerySchema rejects a from date after the to date", () => {
  const result = myOrdersQuerySchema.safeParse({
    from: "2026-02-01",
    to: "2026-01-01",
  });
  assert.equal(result.success, false);
  assert.equal(result.error?.issues[0].message, DATE_RANGE_MESSAGE);
});

test("myOrdersQuerySchema accepts only a from date", () => {
  const result = myOrdersQuerySchema.safeParse({ from: "2026-01-01" });
  assert.equal(result.success, true);
});

test("myOrdersQuerySchema rejects a malformed date", () => {
  const result = myOrdersQuerySchema.safeParse({ from: "01-01-2026" });
  assert.equal(result.success, false);
});
