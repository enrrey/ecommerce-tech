import test from "node:test";
import assert from "node:assert/strict";

import { NotFoundError } from "@/lib/api-errors";

type FakeUser = {
  id: string;
  email: string;
  stripeCustomerId: string | null;
};

async function loadService(
  t: import("node:test").TestContext,
  user: FakeUser | null,
) {
  const createCustomer = t.mock.fn(async (args: { email: string }) => ({
    id: "cus_new_1",
    email: args.email,
  }));
  const setStripeCustomerId = t.mock.fn(async () => undefined);

  t.mock.module("@/lib/stripe", {
    exports: { stripe: { customers: { create: createCustomer } } },
  });
  t.mock.module("@/server/repositories/user.repository", {
    exports: {
      findUserById: async () => user,
      setStripeCustomerId,
    },
  });

  const mod = await import(
    `./stripe-customer.service.ts?case-${Math.random()}`
  );

  return { ...mod, createCustomer, setStripeCustomerId };
}

test("getOrCreateStripeCustomer throws NotFoundError when the user does not exist", async (t) => {
  const { getOrCreateStripeCustomer, createCustomer } = await loadService(
    t,
    null,
  );

  await assert.rejects(() => getOrCreateStripeCustomer("actor-1"), NotFoundError);
  assert.equal(createCustomer.mock.callCount(), 0);
});

test("getOrCreateStripeCustomer returns the existing Stripe customer id without calling Stripe", async (t) => {
  const { getOrCreateStripeCustomer, createCustomer, setStripeCustomerId } =
    await loadService(t, {
      id: "user-1",
      email: "a@example.com",
      stripeCustomerId: "cus_existing_1",
    });

  const id = await getOrCreateStripeCustomer("actor-1");

  assert.equal(id, "cus_existing_1");
  assert.equal(createCustomer.mock.callCount(), 0);
  assert.equal(setStripeCustomerId.mock.callCount(), 0);
});

test("getOrCreateStripeCustomer creates and persists a new Stripe customer when the user has none", async (t) => {
  const { getOrCreateStripeCustomer, createCustomer, setStripeCustomerId } =
    await loadService(t, {
      id: "user-1",
      email: "a@example.com",
      stripeCustomerId: null,
    });

  const id = await getOrCreateStripeCustomer("actor-1");

  assert.equal(id, "cus_new_1");
  assert.equal(createCustomer.mock.callCount(), 1);
  assert.deepEqual(createCustomer.mock.calls[0].arguments[0], {
    email: "a@example.com",
    metadata: { userId: "user-1" },
  });
  assert.deepEqual(setStripeCustomerId.mock.calls[0].arguments, [
    "user-1",
    "cus_new_1",
  ]);
});
