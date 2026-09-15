import test from "node:test";
import assert from "node:assert/strict";

import { useCatalogFiltersStore } from "./catalog-filters.store.ts";

test("catalog filters store starts with an empty term", () => {
  useCatalogFiltersStore.setState({ term: "" });
  assert.equal(useCatalogFiltersStore.getState().term, "");
});

test("setTerm updates the search term", () => {
  useCatalogFiltersStore.getState().setTerm("mouse");
  assert.equal(useCatalogFiltersStore.getState().term, "mouse");
});

test("reset clears the search term back to an empty string", () => {
  useCatalogFiltersStore.getState().setTerm("mouse");
  useCatalogFiltersStore.getState().reset();
  assert.equal(useCatalogFiltersStore.getState().term, "");
});
