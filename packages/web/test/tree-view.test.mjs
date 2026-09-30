import assert from "node:assert/strict";
import { test } from "node:test";
import { findTypeahead, flattenTree, getAncestorIds, getKeyAction, isExpandable, nextSelection } from "../src/components/tree-view/tree-helpers.ts";

const items = [
  {
    id: "docs",
    textValue: "Documents",
    children: [
      { id: "cv", textValue: "CV.pdf" },
      { id: "letters", textValue: "Letters", children: [{ id: "l1", textValue: "Letter one" }] },
    ],
  },
  { id: "photos", textValue: "Photos", hasChildren: true },
  { id: "notes", textValue: "Notes" },
  { id: "music", textValue: "Music", disabled: true },
  { id: "misc", textValue: "Misc" },
];

const ids = (flat) => flat.map((row) => row.id);

test("only expanded branches are flattened, with level, posinset and setsize", () => {
  assert.deepEqual(ids(flattenTree(items, new Set())), ["docs", "photos", "notes", "music", "misc"]);
  const flat = flattenTree(items, new Set(["docs", "letters"]));
  assert.deepEqual(ids(flat), ["docs", "cv", "letters", "l1", "photos", "notes", "music", "misc"]);
  const l1 = flat.find((row) => row.id === "l1");
  assert.equal(l1.level, 3);
  assert.equal(l1.parentId, "letters");
  const letters = flat.find((row) => row.id === "letters");
  assert.deepEqual([letters.posInSet, letters.setSize, letters.level], [2, 2, 2]);
});

test("a node under a collapsed ancestor is hidden even if it is marked expanded", () => {
  assert.deepEqual(ids(flattenTree(items, new Set(["letters"]))), ["docs", "photos", "notes", "music", "misc"]);
});

test("expandable: loaded children, or hasChildren while unloaded", () => {
  assert.equal(isExpandable(items[0]), true);
  assert.equal(isExpandable(items[1]), true);
  assert.equal(isExpandable(items[2]), false);
  assert.equal(isExpandable({ id: "x", hasChildren: true, children: [] }), false);
});

test("Up and Down move through enabled rows and stop at the ends", () => {
  const flat = flattenTree(items, new Set());
  assert.deepEqual(getKeyAction(flat, "docs", "ArrowDown"), { type: "focus", id: "photos" });
  assert.deepEqual(getKeyAction(flat, "notes", "ArrowDown"), { type: "focus", id: "misc" }, "skips the disabled row");
  assert.deepEqual(getKeyAction(flat, "misc", "ArrowUp"), { type: "focus", id: "notes" });
  assert.equal(getKeyAction(flat, "misc", "ArrowDown"), null);
  assert.equal(getKeyAction(flat, "docs", "ArrowUp"), null);
});

test("Home and End go to the first and last enabled row", () => {
  const flat = flattenTree(items, new Set(["docs"]));
  assert.deepEqual(getKeyAction(flat, "notes", "Home"), { type: "focus", id: "docs" });
  assert.deepEqual(getKeyAction(flat, "docs", "End"), { type: "focus", id: "misc" });
});

test("Right expands a collapsed branch, then enters it; Left collapses, then goes to the parent", () => {
  const closed = flattenTree(items, new Set());
  assert.deepEqual(getKeyAction(closed, "docs", "ArrowRight"), { type: "expand", id: "docs" });
  assert.equal(getKeyAction(closed, "notes", "ArrowRight"), null, "a leaf does nothing");
  const open = flattenTree(items, new Set(["docs"]));
  assert.deepEqual(getKeyAction(open, "docs", "ArrowRight"), { type: "focus", id: "cv" });
  assert.deepEqual(getKeyAction(open, "docs", "ArrowLeft"), { type: "collapse", id: "docs" });
  assert.deepEqual(getKeyAction(open, "cv", "ArrowLeft"), { type: "focus", id: "docs" });
  assert.equal(getKeyAction(open, "notes", "ArrowLeft"), null, "a root leaf has no parent");
});

test("in RTL the horizontal arrows swap", () => {
  const closed = flattenTree(items, new Set());
  assert.deepEqual(getKeyAction(closed, "docs", "ArrowLeft", "rtl"), { type: "expand", id: "docs" });
  assert.equal(getKeyAction(closed, "docs", "ArrowRight", "rtl"), null);
  const open = flattenTree(items, new Set(["docs"]));
  assert.deepEqual(getKeyAction(open, "docs", "ArrowLeft", "rtl"), { type: "focus", id: "cv" });
  assert.deepEqual(getKeyAction(open, "docs", "ArrowRight", "rtl"), { type: "collapse", id: "docs" });
  assert.deepEqual(getKeyAction(open, "cv", "ArrowRight", "rtl"), { type: "focus", id: "docs" });
});

test("a lazy branch expands so the caller can load it", () => {
  const flat = flattenTree(items, new Set());
  assert.deepEqual(getKeyAction(flat, "photos", "ArrowRight"), { type: "expand", id: "photos" });
});

test("other keys are not navigation", () => {
  const flat = flattenTree(items, new Set());
  assert.equal(getKeyAction(flat, "docs", "a"), null);
  assert.equal(getKeyAction(flat, "docs", "Enter"), null);
});

test("typeahead finds the next row by prefix, wrapping, and skips disabled rows", () => {
  const flat = flattenTree(items, new Set());
  assert.equal(findTypeahead(flat, "docs", "n"), "notes");
  assert.equal(findTypeahead(flat, "docs", "ph"), "photos");
  assert.equal(findTypeahead(flat, "notes", "d"), "docs", "wraps");
  assert.equal(findTypeahead(flat, "docs", "mu"), null, "disabled Music is skipped");
  assert.equal(findTypeahead(flat, "docs", "z"), null);
  assert.equal(findTypeahead(flat, "docs", ""), null);
});

test("typeahead: repeating a letter cycles, a longer prefix keeps the current row", () => {
  const rows = [{ id: "a1", textValue: "Alpha" }, { id: "a2", textValue: "Apple" }, { id: "b", textValue: "Beta" }];
  const flat = flattenTree(rows, new Set());
  assert.equal(findTypeahead(flat, "a1", "a"), "a2");
  assert.equal(findTypeahead(flat, "a2", "a"), "a1");
  assert.equal(findTypeahead(flat, "a1", "aa"), "a2");
  assert.equal(findTypeahead(flat, "a1", "al"), "a1");
});

test("selection: single replaces, multiple toggles, none is inert", () => {
  assert.deepEqual(nextSelection(["a"], "b", "single"), ["b"]);
  assert.deepEqual(nextSelection(["b"], "b", "single"), ["b"]);
  assert.deepEqual(nextSelection(["a"], "b", "multiple"), ["a", "b"]);
  assert.deepEqual(nextSelection(["a", "b"], "a", "multiple"), ["b"]);
  assert.deepEqual(nextSelection(["a"], "b", "none"), ["a"]);
});

test("ancestor ids give the path to reveal a node", () => {
  assert.deepEqual(getAncestorIds(items, "l1"), ["docs", "letters"]);
  assert.deepEqual(getAncestorIds(items, "docs"), []);
  assert.deepEqual(getAncestorIds(items, "missing"), []);
});
