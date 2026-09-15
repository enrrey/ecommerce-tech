import test from "node:test";
import assert from "node:assert/strict";

import { roleLabel } from "./constants.ts";
import { ROLE_SEED } from "@/server/db/seed-data";

test("roleLabel returns the seeded display name for a known role slug", () => {
  assert.equal(roleLabel("admin"), "Administrador");
});

test("roleLabel falls back to the raw slug for a role outside the seed", () => {
  assert.equal(roleLabel("custom_role"), "custom_role");
});

test("roleLabel resolves every seeded role slug to its own name", () => {
  for (const role of ROLE_SEED) {
    assert.equal(roleLabel(role.slug), role.name);
  }
});
