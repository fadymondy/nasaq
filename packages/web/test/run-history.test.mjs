import assert from "node:assert/strict";
import { test } from "node:test";
import { countRuns, failingStep, filterRuns, formatRunDuration, orderSpans, rawRun, runLength, sortRuns, stepBars } from "../src/components/run-history/run-model.ts";

const runs = [
  { id: "a", name: "Sync", status: "success", startedAt: 1000, steps: [] },
  { id: "b", name: "Report", status: "error", startedAt: 3000, error: "Timeout", steps: [{ id: "s1", name: "x", status: "success" }, { id: "s2", name: "y", status: "error" }] },
  { id: "c", name: "Sync", status: "running", startedAt: 2000, trigger: "Webhook", steps: [] },
];

test("newest first, filtered and searched", () => {
  assert.deepEqual(sortRuns(runs).map((r) => r.id), ["b", "c", "a"]);
  assert.deepEqual(filterRuns(runs, "failed").map((r) => r.id), ["b"]);
  assert.deepEqual(filterRuns(runs, "running").map((r) => r.id), ["c"]);
  assert.deepEqual(filterRuns(runs, "all", "sync").map((r) => r.id), ["c", "a"]);
  assert.deepEqual(filterRuns(runs, "all", "timeout").map((r) => r.id), ["b"]);
  assert.deepEqual(countRuns(runs), { all: 3, failed: 1, success: 1, running: 1 });
});

test("finds the failing step", () => {
  assert.equal(failingStep(runs[1]).id, "s2");
  assert.equal(failingStep(runs[0]), undefined);
});

test("step bars share one axis", () => {
  const bars = stepBars([{ id: "1", name: "a", status: "success", startedAtMs: 0, durationMs: 500 }, { id: "2", name: "b", status: "success", startedAtMs: 500, durationMs: 500 }]);
  assert.deepEqual(bars.map((b) => [b.left, b.width]), [[0, 50], [50, 50]]);
  // steps with no start time follow the one before
  const seq = stepBars([{ id: "1", name: "a", status: "success", durationMs: 100 }, { id: "2", name: "b", status: "success", durationMs: 300 }]);
  assert.equal(seq[1].left, 25);
  assert.deepEqual(stepBars([]), []);
  assert.ok(stepBars([{ id: "1", name: "a", status: "skipped" }])[0].width > 0);
});

test("durations", () => {
  assert.equal(formatRunDuration(850), "850 ms");
  assert.equal(formatRunDuration(3400), "3.4 s");
  assert.equal(formatRunDuration(12500), "12.5 s");
  assert.equal(formatRunDuration(2000), "2 s");
  assert.equal(formatRunDuration(125_000), "2 min 05 s");
  assert.equal(formatRunDuration(125_000, true), "2 د 05 ث");
  assert.equal(runLength({ id: "x", status: "success", startedAt: 0, steps: [{ id: "1", name: "a", status: "success", startedAtMs: 100, durationMs: 400 }] }), 500);
  assert.equal(runLength({ id: "x", status: "success", startedAt: 0, durationMs: 90, steps: [] }), 90);
});

test("spans are ordered with their depth", () => {
  const ordered = orderSpans([
    { id: "c", parentId: "b", name: "c", startMs: 20, durationMs: 5 },
    { id: "a", name: "a", startMs: 0, durationMs: 100 },
    { id: "b", parentId: "a", name: "b", startMs: 10, durationMs: 50 },
    { id: "o", parentId: "gone", name: "orphan", startMs: 30, durationMs: 1 },
  ]);
  assert.deepEqual(ordered.map((o) => [o.span.id, o.depth]), [["a", 0], ["b", 1], ["c", 2], ["o", 0]]);
  // a parent cycle does not hang
  assert.equal(orderSpans([{ id: "p", parentId: "q", name: "p", startMs: 0, durationMs: 1 }, { id: "q", parentId: "p", name: "q", startMs: 1, durationMs: 1 }]).length, 2);
});

test("raw view drops screenshots", () => {
  const raw = JSON.parse(rawRun({ id: "x", status: "success", startedAt: 0, steps: [{ id: "1", name: "a", status: "success", screenshots: [{ src: "data:...", alt: "x" }] }] }));
  assert.equal(raw.steps[0].screenshots, undefined);
  assert.deepEqual(JSON.parse(rawRun({ id: "x", status: "success", startedAt: 0, steps: [], payload: { a: 1 } })), { a: 1 });
});
