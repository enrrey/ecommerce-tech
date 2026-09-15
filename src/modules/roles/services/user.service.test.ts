import test from "node:test";
import assert from "node:assert/strict";

test("getUsers requests /admin/users and returns the users with their roles", async (t) => {
  const get = t.mock.fn(async () => ({ data: [{ id: "user-1", roleSlugs: ["admin"] }] }));
  t.mock.module("@/lib/axios", { exports: { api: { get } } });

  const { getUsers } = await import(`./user.service.ts?case-${Math.random()}`);

  const users = await getUsers();

  assert.equal(get.mock.calls[0].arguments[0], "/admin/users");
  assert.deepEqual(users, [{ id: "user-1", roleSlugs: ["admin"] }]);
});
