import test from "node:test";
import assert from "node:assert/strict";

import {
  roleSlugSchema,
  assignRoleSchema,
  userIdParamSchema,
  revokeRoleParamsSchema,
} from "./user-role.schema.ts";
import { ROLE_SEED } from "@/server/db/seed-data";

test("roleSlugSchema accepts every slug present in the role seed", () => {
  for (const role of ROLE_SEED) {
    assert.equal(roleSlugSchema.safeParse(role.slug).success, true);
  }
});

test("roleSlugSchema rejects a slug that is not in the role seed", () => {
  assert.equal(roleSlugSchema.safeParse("not_a_real_role").success, false);
});

test("assignRoleSchema requires a valid roleSlug field", () => {
  assert.equal(assignRoleSchema.safeParse({ roleSlug: "admin" }).success, true);
  assert.equal(assignRoleSchema.safeParse({ roleSlug: "made_up" }).success, false);
});

test("userIdParamSchema validates the id as a UUID", () => {
  assert.equal(
    userIdParamSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111" })
      .success,
    true,
  );
  assert.equal(userIdParamSchema.safeParse({ id: "not-a-uuid" }).success, false);
});

test("revokeRoleParamsSchema validates both the user id and the role slug", () => {
  const valid = revokeRoleParamsSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    roleSlug: "manager",
  });
  assert.equal(valid.success, true);

  const invalidRole = revokeRoleParamsSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    roleSlug: "made_up",
  });
  assert.equal(invalidRole.success, false);
});
