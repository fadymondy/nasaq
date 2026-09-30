import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_FACETS, clamp01, facetValues, filterHits, hasFacetFilters, highlightParts, scoreLevel, toggleInSet } from "../src/components/semantic-search/semantic-search-math.ts";

const hits = [
  { score: 0.9, group: "facts", kind: "note", source: "slack", importance: 0.9 },
  { score: 0.6, group: "facts", kind: "doc", source: "notion", importance: 0.2 },
  { score: 0.3, group: "events", kind: "note", source: "slack" },
];

test("scoreLevel buckets at 0.5 and 0.75", () => {
  assert.equal(scoreLevel(0.75), "strong");
  assert.equal(scoreLevel(0.74), "good");
  assert.equal(scoreLevel(0.5), "good");
  assert.equal(scoreLevel(0.49), "weak");
});

test("clamp01 handles out-of-range and NaN", () => {
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(Number.NaN), 0);
});

test("facetValues counts and orders by frequency", () => {
  assert.deepEqual(facetValues(hits, "group"), [{ value: "facts", count: 2 }, { value: "events", count: 1 }]);
  assert.deepEqual(facetValues(hits, "source").map((f) => f.value), ["slack", "notion"]);
});

test("filterHits ANDs fields, ORs values, and applies high importance", () => {
  const sel = { ...EMPTY_FACETS, group: new Set(["facts"]), kind: new Set(["note", "doc"]) };
  assert.equal(filterHits(hits, sel, false).length, 2);
  assert.equal(filterHits(hits, sel, true).length, 1);
  assert.equal(filterHits(hits, EMPTY_FACETS, false).length, 3);
  assert.equal(filterHits(hits, EMPTY_FACETS, true).length, 1);
});

test("hasFacetFilters and toggleInSet", () => {
  assert.equal(hasFacetFilters(EMPTY_FACETS, false), false);
  assert.equal(hasFacetFilters(EMPTY_FACETS, true), true);
  const a = toggleInSet(new Set(), "x");
  assert.deepEqual([...a], ["x"]);
  assert.deepEqual([...toggleInSet(a, "x")], []);
});

test("highlightParts marks query words, escapes regex characters, ignores short words", () => {
  const parts = highlightParts("Reset your password today", "password reset");
  assert.deepEqual(parts.filter((p) => p.match).map((p) => p.text), ["Reset", "password"]);
  assert.deepEqual(highlightParts("a (b) c", "(b)").map((p) => p.match), [false]);
  assert.deepEqual(highlightParts("plain", "").map((p) => p.match), [false]);
  assert.equal(highlightParts("كلمة مرور", "مرور").filter((p) => p.match)[0].text, "مرور");
});
