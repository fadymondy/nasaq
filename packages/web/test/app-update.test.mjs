import assert from "node:assert/strict";
import { test } from "node:test";
import { clampUpdatePercent, countBelow, formatUpdateSize, formatUpdateTime, formatUpdateSpeed, isUpdateRequired, minBuildProblem, secondsLeft } from "../src/components/app-update/app-update-format.ts";

test("isUpdateRequired compares builds against the minimum", () => {
  assert.equal(isUpdateRequired(120, 130), true);
  assert.equal(isUpdateRequired(130, 130), false);
  assert.equal(isUpdateRequired(90, null), false);
  assert.equal(isUpdateRequired(90, undefined), false);
});

test("clampUpdatePercent keeps 0..100", () => {
  assert.equal(clampUpdatePercent(-5), 0);
  assert.equal(clampUpdatePercent(140), 100);
  assert.equal(clampUpdatePercent(Number.NaN), 0);
  assert.equal(clampUpdatePercent(42.5), 42.5);
});

test("formatUpdateSize and formatUpdateSpeed", () => {
  assert.equal(formatUpdateSize(512), "512 byte");
  assert.match(formatUpdateSize(12.4 * 1024 * 1024), /^12\.4 MB$/);
  assert.match(formatUpdateSpeed(3 * 1024 * 1024), /MB\/s$/);
  assert.match(formatUpdateSpeed(1024, "ar"), /\/ث$/);
});

test("secondsLeft and formatUpdateTime", () => {
  assert.equal(secondsLeft(1000, 400, 100), 6);
  assert.equal(secondsLeft(1000, 400, 0), null);
  assert.equal(formatUpdateTime(65), "1:05");
  assert.equal(formatUpdateTime(12), "0:12");
});

test("countBelow sums users on old builds", () => {
  const builds = [
    { build: 100, users: 5 },
    { build: 120, users: 20 },
    { build: 130, users: 70 },
  ];
  assert.equal(countBelow(builds, 120), 5);
  assert.equal(countBelow(builds, 131), 95);
});

test("minBuildProblem validates", () => {
  assert.equal(minBuildProblem(120, 130), null);
  assert.equal(minBuildProblem(-1, 130), "invalid");
  assert.equal(minBuildProblem(1.5, 130), "invalid");
  assert.equal(minBuildProblem(140, 130), "too-high");
});
