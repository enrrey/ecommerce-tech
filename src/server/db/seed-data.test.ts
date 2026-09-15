import test from "node:test";
import assert from "node:assert/strict";

import {
  PERMISSION_SEED,
  ROLE_SEED,
  CATEGORY_SEED,
  PRODUCT_SEED,
  SUPER_ADMIN_ROLE_SLUG,
} from "./seed-data.ts";

test("every permission code is derived from its resource and action", () => {
  for (const permission of PERMISSION_SEED) {
    assert.equal(permission.code, `${permission.resource}.${permission.action}`);
  }
});

test("permission codes are unique", () => {
  const codes = PERMISSION_SEED.map((permission) => permission.code);
  assert.equal(new Set(codes).size, codes.length);
});

test("role slugs are unique", () => {
  const slugs = ROLE_SEED.map((role) => role.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every permission referenced by a role actually exists in PERMISSION_SEED", () => {
  const knownCodes = new Set(PERMISSION_SEED.map((permission) => permission.code));

  for (const role of ROLE_SEED) {
    for (const code of role.permissions) {
      assert.ok(
        knownCodes.has(code),
        `role "${role.slug}" references unknown permission "${code}"`,
      );
    }
  }
});

test("the super_admin role grants every permission that exists", () => {
  const superAdmin = ROLE_SEED.find((role) => role.slug === SUPER_ADMIN_ROLE_SLUG);
  const allCodes = PERMISSION_SEED.map((permission) => permission.code);

  assert.deepEqual([...superAdmin!.permissions].sort(), [...allCodes].sort());
});

test("the admin role grants every permission except roles.manage", () => {
  const admin = ROLE_SEED.find((role) => role.slug === "admin");
  assert.ok(!admin!.permissions.includes("roles.manage"));
  assert.equal(
    admin!.permissions.length,
    PERMISSION_SEED.length - 1,
  );
});

test("the customer role has no administrative permissions", () => {
  const customer = ROLE_SEED.find((role) => role.slug === "customer");
  assert.deepEqual(customer!.permissions, []);
});

test("category slugs are unique", () => {
  const slugs = CATEGORY_SEED.map((category) => category.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("product SKUs are unique", () => {
  const skus = PRODUCT_SEED.map((product) => product.sku);
  assert.equal(new Set(skus).size, skus.length);
});

test("product slugs are unique", () => {
  const slugs = PRODUCT_SEED.map((product) => product.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every seeded product references a category that exists", () => {
  const knownSlugs = new Set(CATEGORY_SEED.map((category) => category.slug));

  for (const product of PRODUCT_SEED) {
    assert.ok(
      knownSlugs.has(product.categorySlug),
      `product "${product.sku}" references unknown category "${product.categorySlug}"`,
    );
  }
});

test("every seeded price is an integer number of cents", () => {
  for (const product of PRODUCT_SEED) {
    assert.ok(Number.isInteger(product.priceCents), `${product.sku} priceCents`);
    if (product.compareAtPriceCents !== null) {
      assert.ok(
        Number.isInteger(product.compareAtPriceCents),
        `${product.sku} compareAtPriceCents`,
      );
    }
  }
});

test("every seeded compareAtPriceCents, when present, is strictly higher than priceCents", () => {
  for (const product of PRODUCT_SEED) {
    if (product.compareAtPriceCents !== null) {
      assert.ok(
        product.compareAtPriceCents > product.priceCents,
        `${product.sku} has a compareAtPriceCents that is not a real discount`,
      );
    }
  }
});
