import test from "node:test";
import assert from "node:assert/strict";

import { NotFoundError } from "@/lib/api-errors";
import { createSequentialDbMock } from "@/test-utils/mocks/drizzle";

async function loadUserRoleRepository(
  t: import("node:test").TestContext,
  ...resultsInOrder: unknown[]
) {
  const dbMock = createSequentialDbMock(...resultsInOrder);
  t.mock.module("@/server/db", { exports: { db: dbMock } });
  return import(`./user-role.repository.ts?case-${Math.random()}`);
}

const input = { userId: "user-1", roleSlug: "manager", actorId: "actor-1" };

test("assignRoleToUser creates the assignment and audits it when the role exists", async (t) => {
  const { assignRoleToUser } = await loadUserRoleRepository(
    t,
    [{ id: "role-1" }],
    [{ userId: "user-1", roleId: "role-1", assignedBy: "actor-1" }],
    [{ id: "log-1" }],
  );

  const assignment = await assignRoleToUser(input);
  assert.equal(assignment.roleId, "role-1");
});

test("assignRoleToUser throws NotFoundError when the role slug does not exist", async (t) => {
  const { assignRoleToUser } = await loadUserRoleRepository(t, []);
  await assert.rejects(() => assignRoleToUser(input), NotFoundError);
});

test("revokeRoleFromUser deletes the assignment and audits it when it existed", async (t) => {
  const { revokeRoleFromUser } = await loadUserRoleRepository(
    t,
    [{ id: "role-1" }],
    [{ userId: "user-1", roleId: "role-1" }],
    [{ id: "log-1" }],
  );

  const revoked = await revokeRoleFromUser(input);
  assert.equal(revoked?.roleId, "role-1");
});

test("revokeRoleFromUser returns null and skips the audit log when the user did not have the role", async (t) => {
  const { revokeRoleFromUser } = await loadUserRoleRepository(
    t,
    [{ id: "role-1" }],
    [],
  );

  // Solo hay dos resultados en cola: si el código intentara escribir el log
  // de auditoría de todos modos, la tercera llamada lanzaría por cola vacía.
  assert.equal(await revokeRoleFromUser(input), null);
});

test("revokeRoleFromUser throws NotFoundError when the role slug does not exist", async (t) => {
  const { revokeRoleFromUser } = await loadUserRoleRepository(t, []);
  await assert.rejects(() => revokeRoleFromUser(input), NotFoundError);
});
