import test from "node:test";
import assert from "node:assert/strict";

import { paymentMethodIdParamSchema } from "./payment-method.schema.ts";

test("paymentMethodIdParamSchema accepts a valid UUID", () => {
  assert.equal(
    paymentMethodIdParamSchema.safeParse("11111111-1111-4111-8111-111111111111")
      .success,
    true,
  );
});

test("paymentMethodIdParamSchema rejects a non-UUID string", () => {
  assert.equal(paymentMethodIdParamSchema.safeParse("not-a-uuid").success, false);
});
