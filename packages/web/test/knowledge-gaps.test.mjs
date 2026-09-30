import assert from "node:assert/strict";
import test from "node:test";
import { gapCounts, gapTransitions, groupGaps, hitShare } from "../src/components/knowledge-gaps/knowledge-gaps-math.ts";

const gaps = [
  { id: "a", status: "open", hits: 2, lastSeen: "2026-09-01" },
  { id: "b", status: "open", hits: 9, lastSeen: "2026-08-01" },
  { id: "c", status: "open", hits: 2, lastSeen: "2026-09-20" },
  { id: "d", status: "indexed", hits: 4, lastSeen: "2026-09-02" },
  { id: "e", status: "dismissed", hits: 1, lastSeen: "not a date" },
];

test("groupGaps groups by status, most asked first then most recent", () => {
  const g = groupGaps(gaps);
  assert.deepEqual(g.open.map((x) => x.id), ["b", "c", "a"]);
  assert.deepEqual(g.indexed.map((x) => x.id), ["d"]);
  assert.deepEqual(g.dismissed.map((x) => x.id), ["e"]);
});

test("gapCounts counts each status", () => {
  assert.deepEqual(gapCounts(gaps), { open: 3, indexed: 1, dismissed: 1 });
});

test("gapTransitions lists the other statuses", () => {
  assert.deepEqual(gapTransitions("open"), ["indexed", "dismissed"]);
  assert.deepEqual(gapTransitions("dismissed"), ["open", "indexed"]);
});

test("hitShare is relative to the max and safe on zero", () => {
  assert.equal(hitShare(5, 10), 0.5);
  assert.equal(hitShare(20, 10), 1);
  assert.equal(hitShare(3, 0), 0);
  assert.equal(hitShare(0, 10), 0);
});
