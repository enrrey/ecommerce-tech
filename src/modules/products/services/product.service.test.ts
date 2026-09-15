import test from "node:test";
import assert from "node:assert/strict";

async function loadService(t: import("node:test").TestContext) {
  const get = t.mock.fn(async () => ({ data: [{ id: "p1" }] }));
  const post = t.mock.fn(async () => ({ data: { id: "p1" } }));
  const patch = t.mock.fn(async () => ({ data: { id: "p1" } }));
  const del = t.mock.fn(async () => ({ data: undefined }));

  t.mock.module("@/lib/axios", { exports: { api: { get, post, patch, delete: del } } });

  const mod = await import(`./product.service.ts?case-${Math.random()}`);

  return { ...mod, get, post, patch, delete: del };
}

test("getProducts requests the product list and returns the response data", async (t) => {
  const { getProducts, get } = await loadService(t);

  const products = await getProducts();

  assert.equal(get.mock.callCount(), 1);
  assert.equal(get.mock.calls[0].arguments[0], "/products");
  assert.deepEqual(products, [{ id: "p1" }]);
});

test("createProduct posts the input to /products and returns the created product", async (t) => {
  const { createProduct, post } = await loadService(t);

  const input = { name: "Producto" };
  const product = await createProduct(input as never);

  assert.deepEqual(post.mock.calls[0].arguments, ["/products", input]);
  assert.deepEqual(product, { id: "p1" });
});

test("updateProduct patches /products/:id with the given fields", async (t) => {
  const { updateProduct, patch } = await loadService(t);

  const input = { name: "Nuevo nombre" };
  await updateProduct("p1", input as never);

  assert.deepEqual(patch.mock.calls[0].arguments, ["/products/p1", input]);
});

test("deleteProduct sends a DELETE request to /products/:id", async (t) => {
  const { deleteProduct, delete: del } = await loadService(t);

  await deleteProduct("p1");

  assert.equal(del.mock.calls[0].arguments[0], "/products/p1");
});
