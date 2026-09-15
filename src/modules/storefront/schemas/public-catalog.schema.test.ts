import test from "node:test";
import assert from "node:assert/strict";

import {
  publicProductQuerySchema,
  PRICE_RANGE_MESSAGE,
  PUBLIC_PRODUCT_SORTS,
  DEFAULT_PUBLIC_PAGE_SIZE,
  MAX_PUBLIC_PAGE_SIZE,
} from "./public-catalog.schema.ts";

test("publicProductQuerySchema fills in every default for an empty query", () => {
  const result = publicProductQuerySchema.parse({});
  assert.equal(result.sort, PUBLIC_PRODUCT_SORTS[0]);
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, DEFAULT_PUBLIC_PAGE_SIZE);
  assert.equal(result.q, undefined);
});

test("publicProductQuerySchema treats an empty string q as no filter", () => {
  const result = publicProductQuerySchema.parse({ q: "" });
  assert.equal(result.q, undefined);
});

test("publicProductQuerySchema trims and lowercases the category", () => {
  const result = publicProductQuerySchema.parse({ category: "  LAPTOPS  " });
  assert.equal(result.category, "laptops");
});

test("publicProductQuerySchema rejects a category with invalid characters", () => {
  const result = publicProductQuerySchema.safeParse({ category: "Laptops!" });
  assert.equal(result.success, false);
});

test("publicProductQuerySchema coerces minPriceCents and maxPriceCents from strings", () => {
  const result = publicProductQuerySchema.parse({
    minPriceCents: "1000",
    maxPriceCents: "2000",
  });
  assert.equal(result.minPriceCents, 1000);
  assert.equal(result.maxPriceCents, 2000);
});

test("publicProductQuerySchema rejects an inverted price range", () => {
  const result = publicProductQuerySchema.safeParse({
    minPriceCents: 2000,
    maxPriceCents: 1000,
  });
  assert.equal(result.success, false);
  assert.equal(result.error?.issues[0].message, PRICE_RANGE_MESSAGE);
});

test("publicProductQuerySchema accepts an equal min and max price", () => {
  const result = publicProductQuerySchema.safeParse({
    minPriceCents: 1000,
    maxPriceCents: 1000,
  });
  assert.equal(result.success, true);
});

test("publicProductQuerySchema transforms the inStock flag to a real boolean", () => {
  assert.equal(publicProductQuerySchema.parse({ inStock: "true" }).inStock, true);
  assert.equal(publicProductQuerySchema.parse({ inStock: "false" }).inStock, false);
});

test("publicProductQuerySchema treats an empty inStock string as no filter", () => {
  const result = publicProductQuerySchema.parse({ inStock: "" });
  assert.equal(result.inStock, undefined);
});

test("publicProductQuerySchema rejects an invalid inStock value", () => {
  const result = publicProductQuerySchema.safeParse({ inStock: "yes" });
  assert.equal(result.success, false);
});

test("publicProductQuerySchema rejects a sort value outside the supported list", () => {
  const result = publicProductQuerySchema.safeParse({ sort: "cheapest" });
  assert.equal(result.success, false);
});

test("publicProductQuerySchema rejects a page below 1", () => {
  const result = publicProductQuerySchema.safeParse({ page: 0 });
  assert.equal(result.success, false);
});

test("publicProductQuerySchema rejects a pageSize above the maximum", () => {
  const result = publicProductQuerySchema.safeParse({
    pageSize: MAX_PUBLIC_PAGE_SIZE + 1,
  });
  assert.equal(result.success, false);
});
