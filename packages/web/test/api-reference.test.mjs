import assert from "node:assert/strict";
import { test } from "node:test";
import { countByAccess, filterTools, foldTool, formatCall, groupTools, sampleValue } from "../src/components/api-reference/api-reference-format.ts";

const tools = [
  { id: "1", name: "create_issue", summary: "Open an issue", category: "Issues", scope: "issues:write", access: "write", args: [{ name: "title" }] },
  { id: "2", name: "list_issues", summary: "List issues", category: "Issues", scope: "issues:read" },
  { id: "3", name: "delete_task", summary: "Delete a task", category: "Tasks", scope: "tasks:write", access: "destructive" },
];

test("foldTool treats separators as spaces", () => {
  assert.equal(foldTool("Create_Issue-Now"), "create issue now");
});

test("filterTools by query, category and access", () => {
  assert.deepEqual(filterTools(tools, { query: "create issue" }).map((t) => t.id), ["1"]);
  assert.deepEqual(filterTools(tools, { query: "title" }).map((t) => t.id), ["1"]);
  assert.deepEqual(filterTools(tools, { category: "Tasks" }).map((t) => t.id), ["3"]);
  assert.deepEqual(filterTools(tools, { access: "read" }).map((t) => t.id), ["2"]);
  assert.equal(filterTools(tools, {}).length, 3);
  assert.deepEqual(filterTools(tools, { query: "issues:read" }).map((t) => t.id), ["2"]);
});

test("groupTools keeps first-seen order", () => {
  assert.deepEqual(groupTools(tools).map((g) => [g.category, g.tools.length]), [["Issues", 2], ["Tasks", 1]]);
});

test("countByAccess defaults to read", () => {
  assert.deepEqual(countByAccess(tools), { read: 1, write: 1, destructive: 1 });
});

test("formatCall and sampleValue", () => {
  assert.equal(formatCall("x", { a: 1 }), '{\n  "tool": "x",\n  "arguments": {\n    "a": 1\n  }\n}');
  assert.equal(sampleValue("string", "title"), "<title>");
  assert.equal(sampleValue("integer"), 1);
  assert.equal(sampleValue("boolean"), true);
  assert.deepEqual(sampleValue("string[]"), []);
});
