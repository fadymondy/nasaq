import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTestRunDuration, settleTestRunSteps, testRunCounts, testRunStepStatus, upsertTestRunStep } from "../src/components/test-run-stream/test-run-stream-logic.ts";

test("statuses normalise; unknown ones are still running", () => {
  assert.equal(testRunStepStatus("ok"), "ok");
  assert.equal(testRunStepStatus("success"), "ok");
  assert.equal(testRunStepStatus("failed"), "error");
  assert.equal(testRunStepStatus("skipped"), "skipped");
  assert.equal(testRunStepStatus("fetching"), "running");
});

test("upsert updates a step in place by id, else by name, and appends new ones", () => {
  let list = upsertTestRunStep([], { name: "Fetch", status: "running" });
  list = upsertTestRunStep(list, { name: "Parse", status: "running" });
  list = upsertTestRunStep(list, { name: "Fetch", status: "ok", count: 4 });
  assert.deepEqual(list.map((s) => `${s.name}:${s.status}`), ["Fetch:ok", "Parse:running"]);
  assert.equal(list[0].count, 4);
  list = upsertTestRunStep(list, { id: "p2", name: "Parse", status: "ok" });
  assert.equal(list.length, 3);
});

test("settling marks running steps skipped and counts add up", () => {
  const list = settleTestRunSteps([{ name: "a", status: "ok" }, { name: "b", status: "error" }, { name: "c", status: "running" }]);
  assert.equal(list[2].status, "skipped");
  assert.deepEqual(testRunCounts(list), { ok: 1, error: 1, skipped: 1, running: 0, total: 3 });
});

test("durations read naturally", () => {
  assert.equal(formatTestRunDuration(850), "850 ms");
  assert.equal(formatTestRunDuration(2400), "2.4 s");
  assert.equal(formatTestRunDuration(65_000), "1 m 05 s");
});
