import test from "node:test";
import assert from "node:assert/strict";

import { cn, slugify, formatPriceFromCents } from "./utils.ts";

test("cn merges plain class names", () => {
  assert.equal(cn("a", "b"), "a b");
});

test("cn resolves conflicting Tailwind utilities keeping the last one", () => {
  assert.equal(cn("p-2", "p-4"), "p-4");
});

test("cn drops falsy values (undefined, null, false)", () => {
  assert.equal(cn("a", undefined, null, false, "b"), "a b");
});

test("cn returns an empty string when given no usable input", () => {
  assert.equal(cn(), "");
});

test("slugify strips diacritics from letters", () => {
  assert.equal(slugify("Café con leche"), "cafe-con-leche");
});

test("slugify lowercases the input", () => {
  assert.equal(slugify("SSD NVMe"), "ssd-nvme");
});

test("slugify replaces non-alphanumeric runs with a single hyphen", () => {
  assert.equal(slugify("Monitor 27'' 4K!!"), "monitor-27-4k");
});

test("slugify trims leading and trailing hyphens", () => {
  assert.equal(slugify("  --Teclado--  "), "teclado");
});

test("slugify returns an empty string for input with no alphanumeric characters", () => {
  assert.equal(slugify("###"), "");
});

test("formatPriceFromCents formats zero cents as zero currency", () => {
  assert.equal(formatPriceFromCents(0), "0,00 US$");
});

test("formatPriceFromCents converts cents to whole currency units", () => {
  assert.equal(formatPriceFromCents(100), "1,00 US$");
});

test("formatPriceFromCents keeps two decimal places for non-round cents", () => {
  assert.equal(formatPriceFromCents(1099), "10,99 US$");
});

test("formatPriceFromCents formats large amounts with thousands", () => {
  assert.equal(formatPriceFromCents(100000), "1000,00 US$");
});

test("formatPriceFromCents formats negative cents with a leading minus sign", () => {
  assert.equal(formatPriceFromCents(-500), "-5,00 US$");
});
