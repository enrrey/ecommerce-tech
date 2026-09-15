import test from "node:test";
import assert from "node:assert/strict";

async function loadService(t: import("node:test").TestContext) {
  const get = t.mock.fn(async () => ({ data: [{ id: "c1" }] }));
  const post = t.mock.fn(async () => ({ data: { id: "c1" } }));
  const patch = t.mock.fn(async () => ({ data: { id: "c1" } }));
  const del = t.mock.fn(async () => ({ data: undefined }));

  t.mock.module("@/lib/axios", { exports: { api: { get, post, patch, delete: del } } });

  const mod = await import(`./category.service.ts?case-${Math.random()}`);

  return { ...mod, get, post, patch, delete: del };
}

test("getCategories requests the category list and returns the response data", async (t) => {
  const { getCategories, get } = await loadService(t);

  const categories = await getCategories();

  assert.equal(get.mock.calls[0].arguments[0], "/categories");
  assert.deepEqual(categories, [{ id: "c1" }]);
});

test("createCategory posts the input to /categories and returns the created category", async (t) => {
  const { createCategory, post } = await loadService(t);

  const input = { name: "Laptops" };
  const category = await createCategory(input as never);

  assert.deepEqual(post.mock.calls[0].arguments, ["/categories", input]);
  assert.deepEqual(category, { id: "c1" });
});

test("updateCategory patches /categories/:id with the given fields", async (t) => {
  const { updateCategory, patch } = await loadService(t);

  const input = { name: "Nuevo nombre" };
  await updateCategory("c1", input as never);

  assert.deepEqual(patch.mock.calls[0].arguments, ["/categories/c1", input]);
});

test("deleteCategory sends a DELETE request to /categories/:id", async (t) => {
  const { deleteCategory, delete: del } = await loadService(t);

  await deleteCategory("c1");

  assert.equal(del.mock.calls[0].arguments[0], "/categories/c1");
});
