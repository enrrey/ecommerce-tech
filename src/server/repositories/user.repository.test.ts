import test from "node:test";
import assert from "node:assert/strict";

import { createSequentialDbMock } from "@/test-utils/mocks/drizzle";

async function loadUserRepository(t: import("node:test").TestContext, rows: unknown[]) {
  const dbMock = createSequentialDbMock(rows);
  t.mock.module("@/server/db", { exports: { db: dbMock } });
  return import(`./user.repository.ts?case-${Math.random()}`);
}

test("findActorByClerkId returns null when the user has no active row", async (t) => {
  const { findActorByClerkId } = await loadUserRepository(t, []);
  assert.equal(await findActorByClerkId("clerk_1"), null);
});

test("findActorByClerkId deduplicates permission codes across joined rows", async (t) => {
  const { findActorByClerkId } = await loadUserRepository(t, [
    { id: "user-1", code: "products.create" },
    { id: "user-1", code: "products.create" },
    { id: "user-1", code: "products.update" },
  ]);

  const actor = await findActorByClerkId("clerk_1");
  assert.deepEqual(
    [...actor.permissionCodes].sort(),
    ["products.create", "products.update"],
  );
});

test("findActorByClerkId filters out null codes left by a user with no roles", async (t) => {
  const { findActorByClerkId } = await loadUserRepository(t, [
    { id: "user-1", code: null },
  ]);

  const actor = await findActorByClerkId("clerk_1");
  assert.deepEqual(actor.permissionCodes, []);
  assert.equal(actor.id, "user-1");
});
