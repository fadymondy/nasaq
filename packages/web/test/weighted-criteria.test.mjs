import assert from "node:assert/strict";
import { test } from "node:test";
import { addCriterion, criteriaShares, cycleWeight } from "../src/components/weighted-criteria-card/weighted-criteria-logic.ts";

const list = [
  { id: "a", label: "Price", weight: "high", enabled: true },
  { id: "b", label: "Speed", weight: "low", enabled: true },
  { id: "c", label: "Support", weight: "medium", enabled: false },
];

test("cycleWeight goes low, medium, high and back", () => {
  assert.equal(cycleWeight("low"), "medium");
  assert.equal(cycleWeight("medium"), "high");
  assert.equal(cycleWeight("high"), "low");
});

test("criteriaShares weights enabled criteria and sums to 1", () => {
  const s = criteriaShares(list);
  assert.equal(s.get("a"), 0.75);
  assert.equal(s.get("b"), 0.25);
  assert.equal(s.get("c"), 0);
  assert.equal(criteriaShares(list.map((c) => ({ ...c, enabled: false }))).size, 0);
});

test("addCriterion trims, skips blanks and duplicates, and marks custom", () => {
  assert.equal(addCriterion(list, "   ", "x").length, 3);
  assert.equal(addCriterion(list, " price ", "x").length, 3);
  const next = addCriterion(list, "  Data   residency ", "x");
  assert.deepEqual(next[3], { id: "x", label: "Data residency", weight: "medium", enabled: true, custom: true });
});
