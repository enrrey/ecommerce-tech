import test from "node:test";
import assert from "node:assert/strict";

import { escapeLikePattern } from "./product.repository.ts";

test("escapeLikePattern leaves plain text unchanged", () => {
  assert.equal(escapeLikePattern("laptop"), "laptop");
});

test("escapeLikePattern escapes a percent sign", () => {
  assert.equal(escapeLikePattern("50%"), "50\\%");
});

test("escapeLikePattern escapes an underscore", () => {
  assert.equal(escapeLikePattern("a_b"), "a\\_b");
});

test("escapeLikePattern escapes a literal backslash", () => {
  assert.equal(escapeLikePattern("a\\b"), "a\\\\b");
});

test("escapeLikePattern escapes multiple wildcards in the same term", () => {
  assert.equal(escapeLikePattern("50%_off"), "50\\%\\_off");
});

test("escapeLikePattern returns an empty string unchanged", () => {
  assert.equal(escapeLikePattern(""), "");
});
