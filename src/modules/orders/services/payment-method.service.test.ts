import test from "node:test";
import assert from "node:assert/strict";

async function loadService(t: import("node:test").TestContext) {
  const get = t.mock.fn(async () => ({ data: [{ id: "pm1" }] }));
  const post = t.mock.fn(async () => ({ data: { url: "https://stripe.test/setup" } }));
  const patch = t.mock.fn(async () => ({ data: undefined }));
  const del = t.mock.fn(async () => ({ data: undefined }));

  t.mock.module("@/lib/axios", { exports: { api: { get, post, patch, delete: del } } });

  const mod = await import(`./payment-method.service.ts?case-${Math.random()}`);

  return { ...mod, get, post, patch, delete: del };
}

test("postSetupSession posts to /payment-methods/setup-session with no body", async (t) => {
  const { postSetupSession, post } = await loadService(t);

  const result = await postSetupSession();

  assert.equal(post.mock.calls[0].arguments[0], "/payment-methods/setup-session");
  assert.equal(post.mock.calls[0].arguments.length, 1);
  assert.deepEqual(result, { url: "https://stripe.test/setup" });
});

test("getPaymentMethods requests /payment-methods and returns the saved cards", async (t) => {
  const { getPaymentMethods, get } = await loadService(t);

  const methods = await getPaymentMethods();

  assert.equal(get.mock.calls[0].arguments[0], "/payment-methods");
  assert.deepEqual(methods, [{ id: "pm1" }]);
});

test("deletePaymentMethod sends a DELETE request to /payment-methods/:id", async (t) => {
  const { deletePaymentMethod, delete: del } = await loadService(t);

  await deletePaymentMethod("pm1");

  assert.equal(del.mock.calls[0].arguments[0], "/payment-methods/pm1");
});

test("setDefaultPaymentMethod patches /payment-methods/:id/default with no body", async (t) => {
  const { setDefaultPaymentMethod, patch } = await loadService(t);

  await setDefaultPaymentMethod("pm1");

  assert.equal(patch.mock.calls[0].arguments[0], "/payment-methods/pm1/default");
  assert.equal(patch.mock.calls[0].arguments.length, 1);
});
