import assert from "node:assert/strict";
import test from "node:test";
import { citedNumbers, evidenceNumbers, stageProgress, uncitedEvidence } from "../src/components/research-run/research-run-math.ts";

const evidence = [{ id: "e1" }, { id: "e2" }, { id: "e3" }, { id: "e1" }];

test("evidenceNumbers numbers by first appearance", () => {
  assert.deepEqual([...evidenceNumbers(evidence)], [["e1", 1], ["e2", 2], ["e3", 3]]);
});

test("citedNumbers sorts, dedupes and drops unknown ids", () => {
  const n = evidenceNumbers(evidence);
  assert.deepEqual(citedNumbers(["e3", "e1", "e3", "zz"], n), [{ id: "e1", n: 1 }, { id: "e3", n: 3 }]);
  assert.deepEqual(citedNumbers(undefined, n), []);
});

test("stageProgress finds the running stage, else the first pending", () => {
  assert.deepEqual(stageProgress([{ id: "a", state: "done" }, { id: "b", state: "running" }, { id: "c", state: "pending" }]), { done: 1, total: 3, current: 1 });
  assert.deepEqual(stageProgress([{ id: "a", state: "done" }, { id: "b", state: "pending" }]), { done: 1, total: 2, current: 1 });
  assert.deepEqual(stageProgress([{ id: "a", state: "done" }]), { done: 1, total: 1, current: 0 });
  assert.deepEqual(stageProgress([]), { done: 0, total: 0, current: 0 });
});

test("uncitedEvidence returns evidence no block cites", () => {
  assert.deepEqual(uncitedEvidence([{ id: "e1" }, { id: "e2" }], [{ cites: ["e1"] }, {}]), [{ id: "e2" }]);
});
