import test from "node:test";
import assert from "node:assert/strict";

test("postCheckoutSession posts the cart lines and returns the checkout URL", async (t) => {
  const post = t.mock.fn(async () => ({ data: { url: "https://stripe.test/session" } }));
  t.mock.module("@/lib/axios", { exports: { api: { post } } });

  const { postCheckoutSession } = await import(
    `./checkout.service.ts?case-${Math.random()}`
  );

  const input = { items: [{ productId: "p1", quantity: 1 }] };
  const result = await postCheckoutSession(input as never);

  assert.deepEqual(post.mock.calls[0].arguments, ["/checkout/session", input]);
  assert.deepEqual(result, { url: "https://stripe.test/session" });
});
