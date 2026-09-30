import assert from "node:assert/strict";
import test from "node:test";
import { closeEditorTab, closeOtherEditorTabs, editorCursorAt, editorSaveNeedsAttention, editorTabKeyTarget, editorTextStats, orderEditorTabs } from "../src/components/editor-chrome/editor-chrome-model.ts";

const tab = (id, extra = {}) => ({ id, title: id, ...extra });

test("editorCursorAt counts lines and columns from 1", () => {
  assert.deepEqual(editorCursorAt("ab\ncde\nf", 0), { line: 1, column: 1 });
  assert.deepEqual(editorCursorAt("ab\ncde\nf", 5), { line: 2, column: 3 });
  assert.deepEqual(editorCursorAt("ab\ncde\nf", 99), { line: 3, column: 2 });
});

test("editorTextStats counts words and characters in English and Arabic", () => {
  const s = editorTextStats("Hello brave world");
  assert.equal(s.words, 3);
  assert.equal(s.characters, 17);
  assert.equal(editorTextStats("مرحبا بالعالم الجميل").words, 3);
  assert.equal(editorTextStats("").words, 0);
});

test("closeEditorTab activates the neighbour, preferring the next", () => {
  const tabs = [tab("a"), tab("b"), tab("c")];
  assert.deepEqual(closeEditorTab(tabs, "b", "b"), { tabs: [tabs[0], tabs[2]], activeId: "c" });
  assert.equal(closeEditorTab(tabs, "c", "c").activeId, "b");
  assert.equal(closeEditorTab(tabs, "c", "a").activeId, "c");
  assert.equal(closeEditorTab([tab("a")], "a", "a").activeId, null);
});

test("closeOtherEditorTabs keeps the target and pinned tabs", () => {
  const tabs = [tab("a", { pinned: true }), tab("b"), tab("c")];
  assert.deepEqual(closeOtherEditorTabs(tabs, "a", "c").tabs.map((t) => t.id), ["a", "c"]);
});

test("orderEditorTabs puts pinned tabs first, keeping order", () => {
  const tabs = [tab("a"), tab("b", { pinned: true }), tab("c"), tab("d", { pinned: true })];
  assert.deepEqual(orderEditorTabs(tabs).map((t) => t.id), ["b", "d", "a", "c"]);
});

test("editorTabKeyTarget follows the reading direction", () => {
  const ids = ["a", "b", "c"];
  assert.equal(editorTabKeyTarget(ids, "b", "ArrowRight", "ltr"), "c");
  assert.equal(editorTabKeyTarget(ids, "b", "ArrowRight", "rtl"), "a");
  assert.equal(editorTabKeyTarget(ids, "c", "ArrowRight", "ltr"), "a");
  assert.equal(editorTabKeyTarget(ids, "b", "Home", "ltr"), "a");
  assert.equal(editorTabKeyTarget(ids, "b", "End", "ltr"), "c");
  assert.equal(editorTabKeyTarget(ids, "b", "x", "ltr"), null);
});

test("editorSaveNeedsAttention flags only error and offline", () => {
  assert.equal(editorSaveNeedsAttention("error"), true);
  assert.equal(editorSaveNeedsAttention("offline"), true);
  assert.equal(editorSaveNeedsAttention("saved"), false);
  assert.equal(editorSaveNeedsAttention("dirty"), false);
});
