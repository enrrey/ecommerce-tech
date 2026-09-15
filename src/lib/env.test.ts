import test from "node:test";
import assert from "node:assert/strict";

import { requireEnv } from "./env.ts";

test("requireEnv returns the value when the variable is set", () => {
  process.env.TEST_UNIT_VAR = "some-value";
  try {
    assert.equal(requireEnv("TEST_UNIT_VAR"), "some-value");
  } finally {
    delete process.env.TEST_UNIT_VAR;
  }
});

test("requireEnv throws when the variable is missing", () => {
  delete process.env.TEST_UNIT_MISSING;
  assert.throws(
    () => requireEnv("TEST_UNIT_MISSING"),
    /Variable de entorno faltante: TEST_UNIT_MISSING/,
  );
});

test("requireEnv throws when the variable is set to an empty string", () => {
  process.env.TEST_UNIT_EMPTY = "";
  try {
    assert.throws(
      () => requireEnv("TEST_UNIT_EMPTY"),
      /Variable de entorno faltante: TEST_UNIT_EMPTY/,
    );
  } finally {
    delete process.env.TEST_UNIT_EMPTY;
  }
});
