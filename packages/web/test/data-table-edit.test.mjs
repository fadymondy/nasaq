import assert from "node:assert/strict";
import { test } from "node:test";
import { groupActions, keyboardMenuPoint } from "../src/components/context-menu/context-actions-helpers.ts";
import { cellKey, coerceEditValue, nextCell, sameCellValue } from "../src/components/data-table/cell-edit-logic.ts";

test("numbers parse Latin and Arabic-Indic digits; blanks become null; junk is rejected", () => {
  assert.deepEqual(coerceEditValue("number", " 42.5 "), { ok: true, value: 42.5 });
  assert.deepEqual(coerceEditValue("number", "١٢٫٥"), { ok: true, value: 12.5 });
  assert.deepEqual(coerceEditValue("number", "1,200"), { ok: true, value: 1200 });
  assert.deepEqual(coerceEditValue("number", ""), { ok: true, value: null });
  assert.deepEqual(coerceEditValue("number", "12abc"), { ok: false, reason: "number" });
  assert.deepEqual(coerceEditValue("number", "Infinity"), { ok: false, reason: "number" });
});

test("dates must be ISO calendar dates", () => {
  assert.deepEqual(coerceEditValue("date", "2026-03-04"), { ok: true, value: "2026-03-04" });
  assert.deepEqual(coerceEditValue("date", ""), { ok: true, value: null });
  assert.equal(coerceEditValue("date", "04/03/2026").ok, false);
  assert.equal(coerceEditValue("date", "2026-13-40").ok, false);
});

test("text is kept as typed", () => {
  assert.deepEqual(coerceEditValue("text", "  hi "), { ok: true, value: "  hi " });
});

test("empty text and null are the same value; other values compare strictly", () => {
  assert.equal(sameCellValue("", null), true);
  assert.equal(sameCellValue(undefined, ""), true);
  assert.equal(sameCellValue(0, null), false);
  assert.equal(sameCellValue("a", "a"), true);
  assert.equal(sameCellValue(false, null), false);
});

test("cell keys do not collide", () => {
  assert.notEqual(cellKey("a", "bc"), cellKey("ab", "c"));
});

test("nextCell moves down within the column and stops at the edges", () => {
  const all = () => true;
  assert.deepEqual(nextCell({ row: 0, col: 1 }, "down", 3, 3, all), { row: 1, col: 1 });
  assert.equal(nextCell({ row: 2, col: 1 }, "down", 3, 3, all), null);
  assert.deepEqual(nextCell({ row: 2, col: 1 }, "up", 3, 3, all), { row: 1, col: 1 });
  assert.equal(nextCell({ row: 0, col: 1 }, "up", 3, 3, all), null);
});

test("nextCell walks editable columns and wraps rows", () => {
  const editable = (_r, c) => c === 1 || c === 3;
  assert.deepEqual(nextCell({ row: 0, col: 1 }, "right", 2, 4, editable), { row: 0, col: 3 });
  assert.deepEqual(nextCell({ row: 0, col: 3 }, "right", 2, 4, editable), { row: 1, col: 1 });
  assert.equal(nextCell({ row: 1, col: 3 }, "right", 2, 4, editable), null);
  assert.deepEqual(nextCell({ row: 1, col: 1 }, "left", 2, 4, editable), { row: 0, col: 3 });
  assert.equal(nextCell({ row: 0, col: 1 }, "left", 2, 4, editable), null);
});

test("nextCell skips rows where the cell is read-only", () => {
  const editable = (r) => r !== 1;
  assert.deepEqual(nextCell({ row: 0, col: 0 }, "down", 3, 1, editable), { row: 2, col: 0 });
});

test("actions are grouped in first-seen order", () => {
  const groups = groupActions([{ id: "a" }, { id: "b", group: "x" }, { id: "c" }, { id: "d", group: "y" }, { id: "e", group: "x" }]);
  assert.deepEqual(
    groups.map((g) => g.map((a) => a.id)),
    [["a", "c"], ["b", "e"], ["d"]],
  );
  assert.deepEqual(groupActions([]), []);
});

test("the keyboard menu opens at the inline start of the row", () => {
  const rect = { left: 100, right: 500, top: 200, height: 40 };
  assert.deepEqual(keyboardMenuPoint(rect, false), { x: 124, y: 220 });
  assert.deepEqual(keyboardMenuPoint(rect, true), { x: 476, y: 220 });
});
