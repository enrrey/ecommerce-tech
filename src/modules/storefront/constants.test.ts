import test from "node:test";
import assert from "node:assert/strict";

import { tileGradient, TILE_GRADIENTS } from "./constants.ts";

test("tileGradient returns the first gradient for an empty seed", () => {
  assert.equal(tileGradient(""), TILE_GRADIENTS[0]);
});

test("tileGradient is deterministic for the same seed", () => {
  assert.equal(tileGradient("dell-xps-13-plus"), tileGradient("dell-xps-13-plus"));
});

test("tileGradient always returns one of the known gradient classes", () => {
  for (const seed of ["a", "ab", "product-slug", "x".repeat(50)]) {
    assert.ok(TILE_GRADIENTS.includes(tileGradient(seed) as (typeof TILE_GRADIENTS)[number]));
  }
});

test("tileGradient distributes single-character seeds by character code modulo the gradient count", () => {
  // "a" = 97, 97 % 4 = 1
  assert.equal(tileGradient("a"), TILE_GRADIENTS[1]);
});
