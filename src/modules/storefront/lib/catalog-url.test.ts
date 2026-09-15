import test from "node:test";
import assert from "node:assert/strict";

import {
  isActivePriceBucket,
  parseCatalogSearchParams,
  buildCatalogHref,
  hasActiveFilters,
  PRICE_BUCKETS,
  CATALOG_PATH,
} from "./catalog-url.ts";

test("isActivePriceBucket matches when both bounds equal the query's bounds", () => {
  const bucket = PRICE_BUCKETS[1];
  assert.equal(
    isActivePriceBucket(bucket, {
      minPriceCents: bucket.minPriceCents,
      maxPriceCents: bucket.maxPriceCents,
    }),
    true,
  );
});

test("isActivePriceBucket does not match when only one bound coincides", () => {
  const bucket = PRICE_BUCKETS[1];
  assert.equal(
    isActivePriceBucket(bucket, {
      minPriceCents: bucket.minPriceCents,
      maxPriceCents: 999_999,
    }),
    false,
  );
});

test("parseCatalogSearchParams falls back to the default query for an invalid parameter", () => {
  const result = parseCatalogSearchParams({ sort: "not-a-real-sort" });
  assert.equal(result.sort, "newest");
  assert.equal(result.page, 1);
});

test("parseCatalogSearchParams collapses a repeated parameter to its last value", () => {
  const result = parseCatalogSearchParams({ category: ["laptops", "monitores"] });
  assert.equal(result.category, "monitores");
});

test("parseCatalogSearchParams parses a valid query", () => {
  const result = parseCatalogSearchParams({ q: "mouse", page: "2" });
  assert.equal(result.q, "mouse");
  assert.equal(result.page, 2);
});

test("buildCatalogHref returns the bare path when the query has only defaults", () => {
  assert.equal(buildCatalogHref({}), CATALOG_PATH);
});

test("buildCatalogHref omits the page parameter when it resets to 1 by a filter change", () => {
  const href = buildCatalogHref({ page: 3 }, { q: "mouse" });
  assert.equal(href, "/products?q=mouse");
});

test("buildCatalogHref merges the patch onto the current query", () => {
  const href = buildCatalogHref({ q: "mouse" }, { category: "laptops" });
  assert.ok(href.includes("q=mouse"));
  assert.ok(href.includes("category=laptops"));
});

test("buildCatalogHref omits the sort parameter when it is the default", () => {
  const href = buildCatalogHref({}, { sort: "newest" });
  assert.ok(!href.includes("sort="));
});

test("buildCatalogHref keeps a non-default sort parameter", () => {
  const href = buildCatalogHref({}, { sort: "price-asc" });
  assert.ok(href.includes("sort=price-asc"));
});

test("buildCatalogHref omits an empty-string value", () => {
  const href = buildCatalogHref({}, { q: "" });
  assert.equal(href, CATALOG_PATH);
});

test("hasActiveFilters is false for an empty query", () => {
  assert.equal(hasActiveFilters({}), false);
});

test("hasActiveFilters is true when any filter field is set", () => {
  assert.equal(hasActiveFilters({ q: "mouse" }), true);
  assert.equal(hasActiveFilters({ inStock: true }), true);
  assert.equal(hasActiveFilters({ onSale: false }), true);
});
