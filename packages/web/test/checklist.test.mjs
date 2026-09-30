import assert from "node:assert/strict";
import { test } from "node:test";
import { attachmentSize, checklistProgress, isItemDone, subtaskState, toggleItem } from "../src/components/checklist/checklist-logic.ts";

const items = () => [
  { id: "a", text: "A", done: false },
  { id: "b", text: "B", done: false, subtasks: [{ id: "b1", text: "b1", done: true }, { id: "b2", text: "b2", done: false }] },
];

test("progress counts leaf tasks", () => {
  assert.deepEqual(checklistProgress(items()), { done: 1, total: 3, percent: 33 });
  assert.deepEqual(checklistProgress([]), { done: 0, total: 0, percent: 0 });
});

test("a parent is derived from its subtasks", () => {
  const [, b] = items();
  assert.equal(isItemDone(b), false);
  assert.equal(subtaskState(b), "some");
  assert.equal(subtaskState({ id: "x", text: "", done: true }), "self");
});

test("toggleItem cascades down and derives up", () => {
  const down = toggleItem(items(), "b", true);
  assert.equal(down[1].subtasks.every((s) => s.done), true);
  assert.equal(down[1].done, true);
  const up = toggleItem(items(), "b2", true);
  assert.equal(up[1].done, true);
  const off = toggleItem(up, "b1", false);
  assert.equal(off[1].done, false);
});

test("attachmentSize", () => {
  assert.equal(attachmentSize(512), "512 B");
  assert.equal(attachmentSize(1536), "1.5 KB");
  assert.equal(attachmentSize(3 * 1024 * 1024), "3.0 MB");
});
