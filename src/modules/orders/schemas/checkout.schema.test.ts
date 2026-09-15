import test from "node:test";
import assert from "node:assert/strict";

import { createCheckoutSessionSchema } from "./checkout.schema.ts";

const VALID_PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

test("createCheckoutSessionSchema accepts a single valid line", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: 1 }],
  });
  assert.equal(result.success, true);
});

test("createCheckoutSessionSchema rejects an empty cart", () => {
  const result = createCheckoutSessionSchema.safeParse({ items: [] });
  assert.equal(result.success, false);
});

test("createCheckoutSessionSchema rejects a quantity below 1", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: 0 }],
  });
  assert.equal(result.success, false);
});

test("createCheckoutSessionSchema rejects a quantity above the maximum", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: 100 }],
  });
  assert.equal(result.success, false);
});

test("createCheckoutSessionSchema accepts the maximum allowed quantity", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: 99 }],
  });
  assert.equal(result.success, true);
});

test("createCheckoutSessionSchema rejects a non-integer quantity", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: 1.5 }],
  });
  assert.equal(result.success, false);
});

test("createCheckoutSessionSchema coerces a numeric string quantity", () => {
  const result = createCheckoutSessionSchema.parse({
    items: [{ productId: VALID_PRODUCT_ID, quantity: "3" }],
  });
  assert.equal(result.items[0].quantity, 3);
});

test("createCheckoutSessionSchema rejects a non-UUID productId", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [{ productId: "not-a-uuid", quantity: 1 }],
  });
  assert.equal(result.success, false);
});

test("createCheckoutSessionSchema accepts multiple lines", () => {
  const result = createCheckoutSessionSchema.safeParse({
    items: [
      { productId: VALID_PRODUCT_ID, quantity: 1 },
      { productId: "22222222-2222-4222-8222-222222222222", quantity: 2 },
    ],
  });
  assert.equal(result.success, true);
});
