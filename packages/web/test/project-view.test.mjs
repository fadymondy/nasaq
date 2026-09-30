import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, budgetState, burndown, daysBetween, issueSpan, moveIssue, projectTotals, statusCounts, timelineBars, timelineRange } from "../src/components/project-view/project-logic.ts";

const statuses = [
  { id: "todo", name: "Todo", hue: "gray", stage: "todo" },
  { id: "doing", name: "Doing", hue: "blue", stage: "active" },
  { id: "done", name: "Done", hue: "green", stage: "done" },
  { id: "no", name: "Canceled", hue: "red", stage: "canceled" },
];
const noon = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const mk = (id, statusId, extra = {}) => ({ id, key: id.toUpperCase(), title: id, statusId, priority: "medium", type: "task", labelIds: [], projectId: "p", createdAt: noon(2026, 10, 1), ...extra });

test("day arithmetic on civil dates", () => {
  assert.equal(addDays("2026-10-30", 3), "2026-11-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-10-01", "2026-10-11"), 10);
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2);
});

test("status counts keep empty statuses in order", () => {
  assert.deepEqual(statusCounts([mk("a", "doing"), mk("b", "doing")], statuses).map((c) => c.count), [0, 2, 0, 0]);
});

test("totals: canceled issues leave the percentage; overdue only counts open ones", () => {
  const t = projectTotals([mk("a", "done"), mk("b", "todo", { dueDate: "2026-10-01" }), mk("c", "no"), mk("d", "done", { dueDate: "2026-09-01" })], statuses, "2026-10-10");
  assert.deepEqual(t, { total: 4, open: 1, done: 2, overdue: 1, percent: 67 });
  assert.equal(projectTotals([], statuses, "2026-10-10").percent, 0);
});

test("burndown counts issues from creation to completion and stops at today", () => {
  const issues = [mk("a", "done", { createdAt: noon(2026, 10, 1), completedAt: noon(2026, 10, 3) }), mk("b", "todo", { createdAt: noon(2026, 10, 1) }), mk("c", "todo", { createdAt: noon(2026, 10, 2) })];
  const pts = burndown(issues, "2026-10-01", "2026-10-05", "2026-10-03");
  assert.deepEqual(pts.map((p) => p.remaining), [2, 3, 2, null, null]);
  assert.equal(pts[0].ideal, 2);
  assert.equal(pts[4].ideal, 0);
  assert.equal(pts.length, 5);
});

test("budget state", () => {
  assert.deepEqual(budgetState(1000, 250), { ratio: 0.25, remaining: 750, over: false });
  assert.equal(budgetState(1000, 1200).over, true);
  assert.deepEqual(budgetState(null, 5), { ratio: 0, remaining: 0, over: false });
});

test("spans come from start or creation to due or completion", () => {
  assert.deepEqual(issueSpan(mk("a", "todo", { dueDate: "2026-10-09" })), { start: "2026-10-01", end: "2026-10-09" });
  assert.deepEqual(issueSpan(mk("a", "todo", { startDate: "2026-10-05", dueDate: "2026-10-03" })), { start: "2026-10-03", end: "2026-10-05" });
  assert.equal(issueSpan(mk("a", "todo")), null);
});

test("timeline bars sit inside the range", () => {
  const issues = [mk("a", "todo", { startDate: "2026-10-01", dueDate: "2026-10-05" }), mk("b", "done", { startDate: "2026-10-06", dueDate: "2026-10-10" }), mk("c", "todo")];
  const range = timelineRange(issues);
  assert.deepEqual(range, { start: "2026-10-01", end: "2026-10-10" });
  const bars = timelineBars(issues, range, statuses);
  assert.equal(bars.length, 2);
  assert.equal(bars[0].offset, 0);
  assert.equal(bars[0].width, 50);
  assert.equal(bars[1].offset, 50);
  assert.equal(bars[1].done, true);
  assert.equal(timelineRange([mk("c", "todo")]), null);
});

test("a board drop changes status and position, and stamps completion", () => {
  const issues = [mk("a", "todo"), mk("b", "todo"), mk("c", "doing"), mk("d", "doing")];
  const ids = (list, s) => list.filter((i) => i.statusId === s).map((i) => i.id);
  const moved = moveIssue(issues, "a", "doing", 1, statuses, 99);
  assert.deepEqual(ids(moved, "doing"), ["c", "a", "d"]);
  assert.deepEqual(ids(moved, "todo"), ["b"]);
  assert.equal(moveIssue(issues, "a", "done", 0, statuses, 99).find((i) => i.id === "a").completedAt, 99);
  assert.deepEqual(ids(moveIssue(issues, "b", "doing", 5, statuses), "doing"), ["c", "d", "b"]);
  assert.deepEqual(ids(moveIssue(issues, "a", "todo", 1, statuses), "todo"), ["b", "a"]);
  assert.equal(moveIssue(issues, "zzz", "doing", 0, statuses).length, 4);
});

import { filterFeed, filterMemories, groupByDay, memoryTags, parseTags } from "../src/components/project-view/project-logic.ts";

test("feed filters by kind and person and groups newest day first", () => {
  const items = [
    { id: "a", kind: "issue", actor: { name: "Sara" }, title: "a", at: noon(2026, 10, 1) },
    { id: "b", kind: "comment", actor: { name: "Omar" }, title: "b", at: noon(2026, 10, 2) },
    { id: "c", actor: { name: "Sara" }, title: "c", at: new Date(2026, 9, 2, 15).getTime() },
  ];
  assert.deepEqual(filterFeed(items, { kind: "comment" }).map((i) => i.id), ["b"]);
  assert.deepEqual(filterFeed(items, { kind: "other" }).map((i) => i.id), ["c"]);
  assert.deepEqual(filterFeed(items, { actor: "Sara", kind: "all" }).map((i) => i.id), ["a", "c"]);
  const groups = groupByDay(items);
  assert.deepEqual(groups.map((g) => g.day), ["2026-10-02", "2026-10-01"]);
  assert.deepEqual(groups[0].items.map((i) => i.id), ["c", "b"]);
});

test("memories filter by text, tags and kind, and count tags", () => {
  const m = [
    { id: "1", text: "Stripe webhooks retry 3 times", tags: ["billing", "api"], at: noon(2026, 9, 1) },
    { id: "2", kind: "decision", text: "Use Postgres", tags: ["api"], source: "Kickoff call", at: noon(2026, 9, 5) },
  ];
  assert.deepEqual(filterMemories(m, {}).map((x) => x.id), ["2", "1"]);
  assert.deepEqual(filterMemories(m, { query: "kickoff" }).map((x) => x.id), ["2"]);
  assert.deepEqual(filterMemories(m, { tags: ["api", "billing"] }).map((x) => x.id), ["1"]);
  assert.deepEqual(filterMemories(m, { kind: "decision" }).map((x) => x.id), ["2"]);
  assert.deepEqual(memoryTags(m), [{ tag: "api", count: 2 }, { tag: "billing", count: 1 }]);
  assert.deepEqual(parseTags("API, #billing,, api"), ["api", "billing"]);
});
