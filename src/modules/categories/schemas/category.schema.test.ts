import test from "node:test";
import assert from "node:assert/strict";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from "./category.schema.ts";

test("createCategorySchema trims the name", () => {
  const result = createCategorySchema.parse({
    name: "  Laptops  ",
    slug: "laptops",
  });
  assert.equal(result.name, "Laptops");
});

test("createCategorySchema trims and lowercases the slug", () => {
  const result = createCategorySchema.parse({
    name: "Laptops",
    slug: "  LAPTOPS  ",
  });
  assert.equal(result.slug, "laptops");
});

test("createCategorySchema rejects a slug with invalid characters", () => {
  const result = createCategorySchema.safeParse({
    name: "Laptops",
    slug: "Laptops_Gaming!",
  });
  assert.equal(result.success, false);
});

test("createCategorySchema rejects a name shorter than 2 characters", () => {
  const result = createCategorySchema.safeParse({ name: "L", slug: "laptops" });
  assert.equal(result.success, false);
});

test("createCategorySchema defaults isActive to true when omitted", () => {
  const result = createCategorySchema.parse({
    name: "Laptops",
    slug: "laptops",
  });
  assert.equal(result.isActive, true);
});

test("createCategorySchema normalizes an empty description to null", () => {
  const result = createCategorySchema.parse({
    name: "Laptops",
    slug: "laptops",
    description: "",
  });
  assert.equal(result.description, null);
});

test("updateCategorySchema rejects an empty patch", () => {
  assert.equal(updateCategorySchema.safeParse({}).success, false);
});

test("updateCategorySchema accepts a patch with a single field", () => {
  assert.equal(
    updateCategorySchema.safeParse({ name: "Nuevo nombre" }).success,
    true,
  );
});

test("categoryIdSchema accepts a valid UUID", () => {
  assert.equal(
    categoryIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success,
    true,
  );
});

test("categoryIdSchema rejects a non-UUID string", () => {
  assert.equal(categoryIdSchema.safeParse("not-a-uuid").success, false);
});
