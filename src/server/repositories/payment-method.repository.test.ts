import test from "node:test";
import assert from "node:assert/strict";

import { createSequentialDbMock } from "@/test-utils/mocks/drizzle";

test("setDefaultPaymentMethod unsets the previous default before marking the new one", async (t) => {
  // Orden real, no cosmético: el UPDATE inverso chocaría contra el UNIQUE
  // parcial "un solo default por usuario" (ver comentario en la fuente).
  const dbMock = createSequentialDbMock(undefined, undefined);
  t.mock.module("@/server/db", { exports: { db: dbMock } });

  const { setDefaultPaymentMethod } = await import(
    `./payment-method.repository.ts?case-${Math.random()}`
  );

  await setDefaultPaymentMethod("user-1", "pm-1");

  const setCalls = dbMock.calls.filter((call) => call.method === "set");
  assert.deepEqual(setCalls[0].args[0], { isDefault: false });
  assert.deepEqual(setCalls[1].args[0], { isDefault: true });
});
