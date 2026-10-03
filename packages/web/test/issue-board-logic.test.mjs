import assert from "node:assert/strict";
import { test } from "node:test";
import { boardIndex, EMPTY_ISSUE_FILTER, filterIssues, isIssueFilterActive } from "../src/components/issue-board/issue-board-logic.ts";

const issue = (id, statusId, extra = {}) => ({ id, key: `NSQ-${id}`, title: `Issue ${id}`, statusId, priority: "medium", type: "task", labelIds: [], projectId: "p", createdAt: 0, ...extra });

const issues = [
  issue("1", "todo", { title: "Fix login redirect", assigneeId: "sara", reporterId: "omar", labelIds: ["bug"] }),
  issue("2", "todo", { title: "مراجعة صفحة الدفع", assigneeId: "omar" }),
  issue("3", "todo", { title: "Billing export", reporterId: "sara" }),
  issue("4", "doing", { title: "Dark mode", assigneeId: "sara" }),
];
const labelName = (id) => ({ bug: "Bug" })[id];
const ids = (list) => list.map((i) => i.id);

test("search matches key, title and label names, folding Arabic", () => {
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, query: "nsq-3" }, labelName)), ["3"]);
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, query: "bug" }, labelName)), ["1"]);
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, query: "مراجعه" }, labelName)), ["2"]);
  assert.deepEqual(ids(filterIssues(issues, EMPTY_ISSUE_FILTER)), ["1", "2", "3", "4"]);
});

test("assignee and reporter filters, with 'none' for nobody", () => {
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, assigneeId: "sara" })), ["1", "4"]);
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, assigneeId: "none" })), ["3"]);
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, assigneeId: "sara", reporterId: "omar" })), ["1"]);
  assert.deepEqual(ids(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, reporterId: "none" })), ["2", "4"]);
  assert.equal(isIssueFilterActive(EMPTY_ISSUE_FILTER), false);
  assert.equal(isIssueFilterActive({ ...EMPTY_ISSUE_FILTER, query: "  " }), false);
  assert.equal(isIssueFilterActive({ ...EMPTY_ISSUE_FILTER, reporterId: "none" }), true);
});

test("a drop among filtered cards lands in the right place among all of them", () => {
  // todo column: 1, 2, 3. Only 1 and 3 are visible; 4 moves from doing.
  const visible = new Set(["1", "3", "4"]);
  assert.equal(boardIndex(issues, visible, "4", "todo", 0), 0); // before 1
  assert.equal(boardIndex(issues, visible, "4", "todo", 1), 2); // before 3, after hidden 2
  assert.equal(boardIndex(issues, visible, "4", "todo", 2), 3); // after 3
  // Moving within the column: 1 dropped after 3.
  assert.equal(boardIndex(issues, visible, "1", "todo", 1), 2);
  // An empty (or all-hidden) column takes the drop at its end.
  assert.equal(boardIndex(issues, new Set(["4"]), "4", "todo", 0), 3);
  assert.equal(boardIndex(issues, visible, "1", "review", 0), 0);
});
