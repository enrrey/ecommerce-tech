import test from "node:test";
import assert from "node:assert/strict";

async function loadService(t: import("node:test").TestContext) {
  const get = t.mock.fn(async (url: string) => {
    if (url === "/public/categories") return { data: [{ slug: "laptops" }] };
    if (url === "/public/brands") return { data: ["Dell", "Sony"] };
    return { data: { items: [], page: 1, pageSize: 12, total: 0 } };
  });

  t.mock.module("@/lib/axios", { exports: { api: { get } } });

  const mod = await import(`./public-catalog.service.ts?case-${Math.random()}`);

  return { ...mod, get };
}

test("getPublicProducts requests /public/products with the query as params", async (t) => {
  const { getPublicProducts, get } = await loadService(t);

  const query = { q: "mouse" };
  const page = await getPublicProducts(query);

  assert.deepEqual(get.mock.calls[0].arguments, ["/public/products", { params: query }]);
  assert.equal(page.total, 0);
});

test("getPublicProducts defaults to an empty query when none is given", async (t) => {
  const { getPublicProducts, get } = await loadService(t);

  await getPublicProducts();

  assert.deepEqual(get.mock.calls[0].arguments[1], { params: {} });
});

test("getPublicCategories requests /public/categories", async (t) => {
  const { getPublicCategories, get } = await loadService(t);

  const categories = await getPublicCategories();

  assert.equal(get.mock.calls[0].arguments[0], "/public/categories");
  assert.deepEqual(categories, [{ slug: "laptops" }]);
});

test("getPublicBrands requests /public/brands", async (t) => {
  const { getPublicBrands, get } = await loadService(t);

  const brands = await getPublicBrands();

  assert.equal(get.mock.calls[0].arguments[0], "/public/brands");
  assert.deepEqual(brands, ["Dell", "Sony"]);
});
