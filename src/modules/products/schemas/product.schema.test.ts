import test from "node:test";
import assert from "node:assert/strict";

import {
  priceToCents,
  hasValidCompareAtPrice,
  createProductSchema,
  createProductApiSchema,
  updateProductApiSchema,
  updateProductSchema,
  productIdSchema,
} from "./product.schema.ts";

test("priceToCents converts a decimal string to integer cents", () => {
  assert.equal(priceToCents.parse("1299.90"), 129990);
});

test("priceToCents converts a plain number to integer cents", () => {
  assert.equal(priceToCents.parse(10), 1000);
});

test("priceToCents accepts zero", () => {
  assert.equal(priceToCents.parse(0), 0);
});

test("priceToCents accepts the maximum allowed amount", () => {
  assert.equal(priceToCents.parse(200_000), 20_000_000);
});

test("priceToCents rejects a negative amount", () => {
  assert.equal(priceToCents.safeParse(-1).success, false);
});

test("priceToCents rejects an amount above the maximum", () => {
  assert.equal(priceToCents.safeParse(200_000.01).success, false);
});

test("priceToCents rejects more than two decimal places", () => {
  assert.equal(priceToCents.safeParse(1299.905).success, false);
});

test("priceToCents rejects a non-numeric string", () => {
  assert.equal(priceToCents.safeParse("abc").success, false);
});

test("hasValidCompareAtPrice accepts a null compareAtPriceCents", () => {
  assert.equal(
    hasValidCompareAtPrice({ priceCents: 1000, compareAtPriceCents: null }),
    true,
  );
});

test("hasValidCompareAtPrice accepts a compareAtPriceCents strictly above the price", () => {
  assert.equal(
    hasValidCompareAtPrice({ priceCents: 1000, compareAtPriceCents: 1001 }),
    true,
  );
});

test("hasValidCompareAtPrice rejects a compareAtPriceCents equal to the price", () => {
  assert.equal(
    hasValidCompareAtPrice({ priceCents: 1000, compareAtPriceCents: 1000 }),
    false,
  );
});

test("hasValidCompareAtPrice rejects a compareAtPriceCents below the price", () => {
  assert.equal(
    hasValidCompareAtPrice({ priceCents: 1000, compareAtPriceCents: 999 }),
    false,
  );
});

test("createProductSchema reports the compareAtPriceCents field when the discount is invalid", () => {
  const result = createProductSchema.safeParse({
    categoryId: "11111111-1111-4111-8111-111111111111",
    sku: "ABC-123",
    name: "Producto",
    slug: "producto",
    priceCents: "100.00",
    compareAtPriceCents: "50.00",
    stock: 1,
  });

  assert.equal(result.success, false);
  assert.equal(result.error?.issues[0].path[0], "compareAtPriceCents");
});

test("createProductSchema defaults isActive to true when omitted", () => {
  const result = createProductSchema.parse({
    categoryId: "11111111-1111-4111-8111-111111111111",
    sku: "ABC-123",
    name: "Producto",
    slug: "producto",
    priceCents: "100.00",
    stock: 1,
  });

  assert.equal(result.isActive, true);
});

test("createProductApiSchema defaults compareAtPriceCents to null when omitted", () => {
  const result = createProductApiSchema.parse({
    categoryId: "11111111-1111-4111-8111-111111111111",
    sku: "ABC-123",
    name: "Producto",
    slug: "producto",
    priceCents: 10000,
    stock: 1,
  });

  assert.equal(result.compareAtPriceCents, null);
});

test("createProductApiSchema rejects a compareAtPriceCents that is not a real discount", () => {
  const result = createProductApiSchema.safeParse({
    categoryId: "11111111-1111-4111-8111-111111111111",
    sku: "ABC-123",
    name: "Producto",
    slug: "producto",
    priceCents: 10000,
    compareAtPriceCents: 5000,
    stock: 1,
  });

  assert.equal(result.success, false);
});

test("updateProductApiSchema rejects an empty patch", () => {
  assert.equal(updateProductApiSchema.safeParse({}).success, false);
});

test("updateProductApiSchema accepts a patch with a single field", () => {
  assert.equal(
    updateProductApiSchema.safeParse({ name: "Nuevo nombre" }).success,
    true,
  );
});

test("updateProductApiSchema rejects a patch where compareAtPriceCents is not above priceCents", () => {
  const result = updateProductApiSchema.safeParse({
    priceCents: 10000,
    compareAtPriceCents: 10000,
  });
  assert.equal(result.success, false);
});

test("updateProductApiSchema skips the cross-field check when only one price field is sent", () => {
  const result = updateProductApiSchema.safeParse({ priceCents: 5000 });
  assert.equal(result.success, true);
});

test("updateProductSchema rejects an empty patch", () => {
  assert.equal(updateProductSchema.safeParse({}).success, false);
});

test("productIdSchema accepts a valid UUID", () => {
  assert.equal(
    productIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success,
    true,
  );
});

test("productIdSchema rejects a non-UUID string", () => {
  assert.equal(productIdSchema.safeParse("not-a-uuid").success, false);
});
