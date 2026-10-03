import assert from "node:assert/strict";
import { test } from "node:test";
import { initials } from "../src/components/avatar/initials.ts";

test("first and last word, upper-cased", () => {
  assert.equal(initials("ada lovelace"), "AL");
  assert.equal(initials("  Grace  "), "G");
  assert.equal(initials(""), "");
});

test("Arabic names", () => {
  assert.equal(initials("فادي منذر"), "فم");
});

test("leading punctuation is skipped, punctuation-only words ignored", () => {
  assert.equal(initials("(Test) 5 سائق تجريبي"), "Tت");
  assert.equal(initials("Ahmad - Driver"), "AD");
  assert.equal(initials("\"Sam\""), "S");
});

test("emoji stay whole", () => {
  assert.equal(initials("🎉 Party"), "🎉P");
});
