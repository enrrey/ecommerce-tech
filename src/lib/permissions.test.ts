import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";

import { UnauthorizedError, ForbiddenError } from "./api-errors.ts";
import type { AuthorizedActor } from "@/modules/roles/types/user-role.types";

type ClerkAuthResult = { userId: string | null };

// `t.mock.module` se restaura solo al terminar el test (a diferencia del
// tracker global `mock` de "node:test"), así que cada test queda aislado sin
// necesidad de un `finally` manual.
async function loadPermissionsModule(
  t: TestContext,
  authResult: ClerkAuthResult,
  actor: AuthorizedActor | null,
) {
  t.mock.module("@clerk/nextjs/server", {
    exports: { auth: async () => authResult },
  });
  t.mock.module("@/server/repositories/user.repository", {
    exports: { findActorByClerkId: async () => actor },
  });

  // `loadActor` memoiza con `React.cache()` dentro del módulo: cada caso
  // necesita su propia instancia para no arrastrar el resultado cacheado de
  // un caso anterior.
  return import(`./permissions.ts?case-${Math.random()}`);
}

function actorWith(permissionCodes: string[]): AuthorizedActor {
  return { id: "user-row-1", permissionCodes } as AuthorizedActor;
}

test("getPermissionCodes returns the actor's permission codes", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: "clerk_1" },
    actorWith(["products.create", "products.update"]),
  );
  assert.deepEqual(await mod.getPermissionCodes("clerk_1"), [
    "products.create",
    "products.update",
  ]);
});

test("getPermissionCodes returns an empty array when the actor does not exist", async (t) => {
  const mod = await loadPermissionsModule(t, { userId: "clerk_2" }, null);
  assert.deepEqual(await mod.getPermissionCodes("clerk_2"), []);
});

test("can returns false when there is no active session", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: null },
    actorWith(["products.create"]),
  );
  assert.equal(await mod.can("products.create"), false);
});

test("can returns true when the current user has the permission code", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: "clerk_3" },
    actorWith(["products.create"]),
  );
  assert.equal(await mod.can("products.create"), true);
});

test("can returns false when the current user lacks the permission code", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: "clerk_4" },
    actorWith(["orders.update_status"]),
  );
  assert.equal(await mod.can("products.create"), false);
});

test("requirePermission throws UnauthorizedError when there is no session", async (t) => {
  const mod = await loadPermissionsModule(t, { userId: null }, null);
  await assert.rejects(
    () => mod.requirePermission("products.create"),
    UnauthorizedError,
  );
});

test("requirePermission throws ForbiddenError when the session has no matching actor row", async (t) => {
  const mod = await loadPermissionsModule(t, { userId: "clerk_5" }, null);
  await assert.rejects(
    () => mod.requirePermission("products.create"),
    ForbiddenError,
  );
});

test("requirePermission throws ForbiddenError when the actor lacks the permission code", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: "clerk_6" },
    actorWith(["orders.update_status"]),
  );
  await assert.rejects(
    () => mod.requirePermission("products.create"),
    ForbiddenError,
  );
});

test("requirePermission returns the actor's users.id when the permission matches", async (t) => {
  const mod = await loadPermissionsModule(
    t,
    { userId: "clerk_7" },
    actorWith(["products.create"]),
  );
  assert.equal(await mod.requirePermission("products.create"), "user-row-1");
});
