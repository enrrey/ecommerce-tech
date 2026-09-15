import test from "node:test";
import assert from "node:assert/strict";

import { cardBrandLabel, formatCardExpiry, orderStatusPresentation } from "./constants.ts";

test("cardBrandLabel translates a known Stripe brand code", () => {
  assert.equal(cardBrandLabel("visa"), "Visa");
});

test("cardBrandLabel falls back to the raw code for an unknown brand", () => {
  assert.equal(cardBrandLabel("some_new_brand"), "some_new_brand");
});

test("formatCardExpiry pads a single-digit month with a leading zero", () => {
  assert.equal(formatCardExpiry({ expMonth: 3, expYear: 2029 }), "03/2029");
});

test("formatCardExpiry keeps a two-digit month unchanged", () => {
  assert.equal(formatCardExpiry({ expMonth: 12, expYear: 2029 }), "12/2029");
});

test("orderStatusPresentation returns the mapped presentation for a known status", () => {
  const presentation = orderStatusPresentation("paid");
  assert.equal(presentation.label, "Pagado");
  assert.equal(presentation.variant, "default");
});

test("orderStatusPresentation falls back to the raw status label for an unknown status", () => {
  const presentation = orderStatusPresentation("refunded");
  assert.equal(presentation.label, "refunded");
  assert.equal(presentation.variant, "outline");
  assert.equal(presentation.notice, undefined);
});
