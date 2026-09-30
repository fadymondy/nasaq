import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPatch, dueState, estimateSummary, formatHours, isOpenIssue, parentCandidates, parseEstimate, subIssueProgress } from "../src/components/issue-view/issue-logic.ts";

const statuses = [
  { id: "todo", name: "Todo", hue: "gray", stage: "todo" },
  { id: "doing", name: "Doing", hue: "blue", stage: "active" },
  { id: "done", name: "Done", hue: "green", stage: "done" },
  { id: "nope", name: "Canceled", hue: "red", stage: "canceled" },
];
const issue = (extra = {}) => ({ id: "i1", key: "NSQ-1", title: "T", statusId: "todo", priority: "medium", type: "task", labelIds: [], projectId: "p", createdAt: 0, ...extra });

test("due state: overdue, today, soon, later; finished issues are never overdue", () => {
  const now = new Date(2026, 9, 10, 15, 0).getTime();
  assert.equal(dueState(null, now), "none");
  assert.equal(dueState("2026-10-09", now), "overdue");
  assert.equal(dueState("2026-10-09", now, false), "later");
  assert.equal(dueState("2026-10-10", now), "today");
  assert.equal(dueState("2026-10-13", now), "soon");
  assert.equal(dueState("2026-10-14", now), "later");
});

test("estimates parse and format", () => {
  assert.equal(parseEstimate("2"), 2);
  assert.equal(parseEstimate("1,5"), 1.5);
  assert.equal(parseEstimate("2h 30m"), 2.5);
  assert.equal(parseEstimate("45m"), 0.75);
  assert.equal(parseEstimate(""), null);
  assert.equal(parseEstimate("abc"), null);
  assert.equal(parseEstimate("-1"), null);
  assert.equal(formatHours(2.5), "2h 30m");
  assert.equal(formatHours(0), "0m");
  assert.equal(formatHours(1), "1h");
});

test("estimate summary flags going over", () => {
  assert.deepEqual(estimateSummary(7200, 4), { loggedHours: 2, estimateHours: 4, ratio: 0.5, over: false });
  assert.equal(estimateSummary(18000, 4).over, true);
  assert.equal(estimateSummary(3600, null).ratio, null);
});

test("moving into a done status stamps completedAt, moving out clears it", () => {
  const done = applyPatch(issue(), { statusId: "done" }, statuses, 1000);
  assert.equal(done.completedAt, 1000);
  assert.equal(done.updatedAt, 1000);
  const back = applyPatch(done, { statusId: "doing" }, statuses, 2000);
  assert.equal(back.completedAt, null);
  assert.equal(applyPatch(issue(), { title: "x" }, statuses, 5).completedAt, undefined);
});

test("open means neither done nor canceled", () => {
  assert.equal(isOpenIssue(issue(), statuses), true);
  assert.equal(isOpenIssue(issue({ statusId: "done" }), statuses), false);
  assert.equal(isOpenIssue(issue({ statusId: "nope" }), statuses), false);
});

test("sub-issue progress", () => {
  assert.deepEqual(subIssueProgress([{ statusId: "done" }, { statusId: "todo" }, { statusId: "todo" }], statuses), { done: 1, total: 3, percent: 33 });
  assert.deepEqual(subIssueProgress([], statuses), { done: 0, total: 0, percent: 0 });
});

test("a parent cannot be the issue itself or one of its descendants", () => {
  const all = [{ id: "a" }, { id: "b", parentId: "a" }, { id: "c", parentId: "b" }, { id: "d" }];
  assert.deepEqual(parentCandidates("a", all).map((x) => x.id), ["d"]);
  assert.deepEqual(parentCandidates("c", all).map((x) => x.id), ["a", "b", "d"]);
});
