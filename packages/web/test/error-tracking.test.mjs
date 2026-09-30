import assert from "node:assert/strict";
import { test } from "node:test";
import { countByStatus, filterByLevel, formatDuration, frameLocation, httpTone, seriesTrend, sortIssues, totalEvents } from "../src/components/error-tracking/error-tracking-format.ts";

const i = (id, level, status, lastSeen, count = 1) => ({ id, level, status, lastSeen, count });

test("sortIssues puts unresolved first, then severity, then recency", () => {
  const out = sortIssues([i("a", "fatal", "resolved", 5), i("b", "warning", "unresolved", 1), i("c", "error", "unresolved", 2), i("d", "error", "unresolved", 9)]);
  assert.deepEqual(out.map((x) => x.id), ["d", "c", "b", "a"]);
});

test("countByStatus and totalEvents", () => {
  assert.deepEqual(countByStatus([i("a", "error", "resolved", 1), i("b", "error", "ignored", 1), i("c", "error", "resolved", 1)]), { unresolved: 0, resolved: 2, ignored: 1 });
  assert.equal(totalEvents([1, 2, 3]), 6);
  assert.equal(totalEvents(undefined), 0);
});

test("seriesTrend compares halves", () => {
  assert.equal(seriesTrend([1, 1, 5, 6]), "up");
  assert.equal(seriesTrend([6, 5, 1, 1]), "down");
  assert.equal(seriesTrend([3, 3, 3, 3]), "flat");
  assert.equal(seriesTrend([1, 2]), "flat");
  assert.equal(seriesTrend([0, 0, 0, 0]), "flat");
});

test("frameLocation drops missing parts", () => {
  assert.equal(frameLocation({ file: "a.ts", line: 3, column: 9 }), "a.ts:3:9");
  assert.equal(frameLocation({ file: "a.ts", line: 3 }), "a.ts:3");
  assert.equal(frameLocation({ file: "a.ts" }), "a.ts");
});

test("httpTone and formatDuration", () => {
  assert.equal(httpTone(200), "success");
  assert.equal(httpTone(302), "info");
  assert.equal(httpTone(404), "warning");
  assert.equal(httpTone(503), "danger");
  assert.equal(httpTone(0), "danger");
  assert.equal(formatDuration(840), "840 ms");
  assert.equal(formatDuration(1400), "1.4 s");
  assert.equal(formatDuration(-1), "");
});

test("filterByLevel", () => {
  const rows = [{ level: "error" }, { level: "log" }, {}];
  assert.equal(filterByLevel(rows, []).length, 3);
  assert.deepEqual(filterByLevel(rows, ["error"]), [{ level: "error" }]);
});
