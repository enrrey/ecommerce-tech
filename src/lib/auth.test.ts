import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { UnauthorizedError } from "./api-errors.ts";

async function withAuthMock<T>(
  authImpl: () => Promise<{ userId: string | null }>,
  run: () => Promise<T>,
): Promise<T> {
  const clerkMock = mock.module("@clerk/nextjs/server", {
    exports: { auth: authImpl },
  });

  try {
    return await run();
  } finally {
    clerkMock.restore();
  }
}

test("requireAuth returns the Clerk userId when there is an active session", async () => {
  await withAuthMock(
    async () => ({ userId: "user_123" }),
    async () => {
      const { requireAuth } = await import(
        `./auth.ts?session-${Math.random()}`
      );
      assert.equal(await requireAuth(), "user_123");
    },
  );
});

test("requireAuth throws UnauthorizedError when there is no session", async () => {
  await withAuthMock(
    async () => ({ userId: null }),
    async () => {
      const { requireAuth } = await import(
        `./auth.ts?session-${Math.random()}`
      );
      await assert.rejects(() => requireAuth(), UnauthorizedError);
    },
  );
});
