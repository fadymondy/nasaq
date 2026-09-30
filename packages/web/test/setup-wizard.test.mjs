import assert from "node:assert/strict";
import { test } from "node:test";
import { clampStep, elapsedSeconds, missingSteps, setupProgress } from "../src/components/setup-wizard/setup-model.ts";

const steps = [{ id: "a" }, { id: "b", optional: true }, { id: "c" }];

test("missingSteps reports required steps the server has not completed", () => {
  assert.deepEqual(missingSteps(steps, ["a"]).map((s) => s.id), ["c"]);
  assert.deepEqual(missingSteps(steps, ["a", "c"]), []);
  assert.deepEqual(missingSteps(steps, undefined), []);
});

test("setupProgress and clampStep", () => {
  assert.equal(setupProgress(1, 4), 25);
  assert.equal(setupProgress(9, 4), 100);
  assert.equal(setupProgress(0, 0), 0);
  assert.equal(clampStep(-2, 3), 0);
  assert.equal(clampStep(7, 3), 2);
  assert.equal(clampStep(1, 0), 0);
});

test("elapsedSeconds floors and never goes negative", () => {
  assert.equal(elapsedSeconds(1000, 3999), 2);
  assert.equal(elapsedSeconds(5000, 1000), 0);
});
