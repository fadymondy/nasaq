import assert from "node:assert/strict";
import test from "node:test";
import { clampScore, scoreDimensionFill, scoreExplainerBand, scoreRemainder, sortScoreDimensions, sumScorePoints } from "../src/components/score-explainer/score-explainer-logic.ts";

test("bands", () => {
  assert.equal(scoreExplainerBand(90), "high");
  assert.equal(scoreExplainerBand(70), "high");
  assert.equal(scoreExplainerBand(69), "medium");
  assert.equal(scoreExplainerBand(40), "medium");
  assert.equal(scoreExplainerBand(39), "low");
  assert.equal(scoreExplainerBand(3, 5), "medium");
  assert.equal(scoreExplainerBand(5, 0), "low");
});

test("clamps", () => {
  assert.equal(clampScore(140), 100);
  assert.equal(clampScore(-3), 0);
  assert.equal(clampScore(Number.NaN), 0);
});

test("sort is stable and biggest first", () => {
  const list = [{ id: "a", points: 5 }, { id: "b", points: 20 }, { id: "c", points: 5 }];
  assert.deepEqual(sortScoreDimensions(list).map((d) => d.id), ["b", "a", "c"]);
});

test("remainder explains what no dimension does", () => {
  const dims = [{ points: 30 }, { points: 20 }];
  assert.equal(sumScorePoints(dims), 50);
  assert.equal(scoreRemainder(64, dims), 14);
  assert.equal(scoreRemainder(50.2, dims), 0);
  assert.equal(scoreRemainder(40, dims), -10);
});

test("fill uses the dimension's own ceiling", () => {
  assert.equal(scoreDimensionFill({ points: 10, maxPoints: 20 }), 0.5);
  assert.equal(scoreDimensionFill({ points: 10 }, 100), 0.1);
  assert.equal(scoreDimensionFill({ points: 30, maxPoints: 20 }), 1);
});
