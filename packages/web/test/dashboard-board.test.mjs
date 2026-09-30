import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPins, boardColumns, clampSpan, moveItem, nextItemId, normalizeLayout, reorderItems, resizeFromDelta, resizeItem, sameLayout, togglePin } from "../src/components/dashboard-board/board-math.ts";

const item = (id, extra = {}) => ({ id, type: "t", cols: 1, rows: 1, ...extra });
const ids = (l) => l.map((i) => i.id);

test("clampSpan rounds and stays in range", () => {
  assert.equal(clampSpan(2.6, 1, 4), 3);
  assert.equal(clampSpan(9, 1, 4), 4);
  assert.equal(clampSpan(-2, 1, 4), 1);
  assert.equal(clampSpan(Number.NaN, 2, 4), 2);
});

test("pinned items stay in front", () => {
  assert.deepEqual(ids(applyPins([item("a"), item("b", { pinned: true }), item("c")])), ["b", "a", "c"]);
});

test("reorder moves an item and keeps pins in front", () => {
  const l = [item("a", { pinned: true }), item("b"), item("c"), item("d")];
  assert.deepEqual(ids(reorderItems(l, "d", "b")), ["a", "d", "b", "c"]);
  assert.deepEqual(ids(reorderItems(l, "d", "a")), ["a", "d", "b", "c"]);
  assert.deepEqual(ids(reorderItems(l, "x", "b")), ["a", "b", "c", "d"]);
});

test("moveItem stays inside its group", () => {
  const l = [item("a", { pinned: true }), item("b"), item("c")];
  assert.deepEqual(ids(moveItem(l, "b", -1)), ["a", "b", "c"]);
  assert.deepEqual(ids(moveItem(l, "b", 1)), ["a", "c", "b"]);
  assert.deepEqual(ids(moveItem(l, "c", 1)), ["a", "b", "c"]);
});

test("pin toggles and moves the item forward", () => {
  const l = togglePin([item("a"), item("b")], "b");
  assert.deepEqual(ids(l), ["b", "a"]);
  assert.equal(l[0].pinned, true);
  assert.equal(togglePin(l, "b")[0].pinned, false);
});

test("resize clamps to the widget limits", () => {
  const l = resizeItem([item("a")], "a", 9, 0, { maxCols: 3, minRows: 1, maxRows: 2 });
  assert.equal(l[0].cols, 3);
  assert.equal(l[0].rows, 1);
});

test("resize from a pointer delta, mirrored in RTL", () => {
  const cell = { width: 100, height: 50 };
  assert.deepEqual(resizeFromDelta({ cols: 1, rows: 1 }, { x: 210, y: 60 }, cell), { cols: 3, rows: 2 });
  assert.deepEqual(resizeFromDelta({ cols: 2, rows: 2 }, { x: -110, y: 0 }, cell, {}, true), { cols: 3, rows: 2 });
  assert.deepEqual(resizeFromDelta({ cols: 2, rows: 2 }, { x: -500, y: -500 }, cell), { cols: 1, rows: 1 });
});

test("columns by width", () => {
  assert.equal(boardColumns(380), 1);
  assert.equal(boardColumns(700), 2);
  assert.equal(boardColumns(1200), 4);
});

test("normalize drops unknown types and repeats and clamps", () => {
  const out = normalizeLayout(
    [item("a", { cols: 9 }), item("a"), { id: "z", type: "gone", cols: 1, rows: 1 }, item("b", { pinned: true, rows: 7 })],
    [{ type: "t", maxCols: 3, maxRows: 2 }],
  );
  assert.deepEqual(out.map((i) => [i.id, i.cols, i.rows]), [["b", 1, 2], ["a", 3, 1]]);
});

test("next id and layout equality", () => {
  assert.equal(nextItemId([], "chart"), "chart");
  assert.equal(nextItemId([{ id: "chart" }, { id: "chart-2" }], "chart"), "chart-3");
  assert.equal(sameLayout([item("a", { settings: { x: 1, y: 2 } })], [item("a", { settings: { y: 2, x: 1 } })]), true);
  assert.equal(sameLayout([item("a")], [item("a", { pinned: true })]), false);
});
