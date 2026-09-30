import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blankRow,
  changeColumnType,
  coerceCell,
  filterRows,
  parseOptions,
  pushHistory,
  redoHistory,
  sortRows,
  summarize,
  toCsv,
  undoHistory,
  validateTable,
} from "../src/components/content-table-editor/content-table-math.ts";

const columns = [
  { id: "t", label: "Title", type: "text", required: true },
  { id: "n", label: "Words", type: "number" },
  { id: "s", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "live", label: "Live" }] },
  { id: "u", label: "Link", type: "url" },
];
const rows = [
  { id: "1", cells: { t: "Beta", n: 20, s: "live", u: "https://a.example" } },
  { id: "2", cells: { t: "alpha", n: null, s: "draft", u: "nope" } },
  { id: "3", cells: { t: "", n: 5, s: null, u: null } },
];

test("coerceCell handles each type and Arabic digits separators", () => {
  assert.equal(coerceCell("number", "1,250.5"), 1250.5);
  assert.equal(coerceCell("number", "1٬250٫5"), 1250.5);
  assert.equal(coerceCell("number", "abc"), null);
  assert.equal(coerceCell("number", ""), null);
  assert.equal(coerceCell("checkbox", "yes"), true);
  assert.deepEqual(coerceCell("tags", "a, b,,c"), ["a", "b", "c"]);
  assert.equal(coerceCell("date", "2026-09-30T10:00"), "2026-09-30");
  assert.equal(coerceCell("date", "tomorrow"), null);
  assert.equal(coerceCell("text", 12), "12");
});

test("sortRows orders by type and keeps empties last in both directions", () => {
  const asc = sortRows(rows, columns, { column: "n", direction: "asc" }).map((r) => r.id);
  const desc = sortRows(rows, columns, { column: "n", direction: "desc" }).map((r) => r.id);
  assert.deepEqual(asc, ["3", "1", "2"]);
  assert.deepEqual(desc, ["1", "3", "2"]);
  assert.deepEqual(sortRows(rows, columns, { column: "t", direction: "asc" }).map((r) => r.id), ["2", "1", "3"]);
  assert.equal(sortRows(rows, columns, null), rows);
});

test("filterRows matches the shown label of select cells", () => {
  assert.deepEqual(filterRows(rows, columns, "LIVE").map((r) => r.id), ["1"]);
  assert.deepEqual(filterRows(rows, columns, "alp").map((r) => r.id), ["2"]);
  assert.equal(filterRows(rows, columns, "  ").length, 3);
});

test("summarize sums numbers and counts checks", () => {
  assert.deepEqual(summarize(rows, columns[1]), { filled: 2, total: 3, sum: 25, average: 12.5, min: 5, max: 20 });
  const box = { id: "c", label: "Done", type: "checkbox" };
  assert.equal(summarize([{ id: "a", cells: { c: true } }, { id: "b", cells: { c: false } }], box).checked, 1);
});

test("validateTable flags required and malformed links", () => {
  const issues = validateTable({ columns, rows });
  assert.deepEqual(issues.map((i) => `${i.rowId}:${i.columnId}:${i.issue}`), ["2:u:url", "3:t:required"]);
});

test("changeColumnType converts what it can", () => {
  const next = changeColumnType({ columns, rows }, "n", "text");
  assert.equal(next.rows[0].cells.n, "20");
  const back = changeColumnType(next, "n", "number");
  assert.equal(back.rows[0].cells.n, 20);
  assert.equal(changeColumnType({ columns, rows }, "n", "number").columns[1], columns[1]);
});

test("blankRow fills every column", () => {
  const row = blankRow([...columns, { id: "k", label: "Tags", type: "tags" }, { id: "d", label: "Done", type: "checkbox" }]);
  assert.equal(row.cells.t, null);
  assert.deepEqual(row.cells.k, []);
  assert.equal(row.cells.d, false);
});

test("parseOptions dedupes and accepts Arabic commas", () => {
  assert.deepEqual(parseOptions("Draft\nLive, Draft، Archived").map((o) => o.label), ["Draft", "Live", "Archived"]);
});

test("history undo and redo", () => {
  let h = { past: [], present: 1, future: [] };
  h = pushHistory(h, 2);
  h = pushHistory(h, 3);
  h = undoHistory(h);
  assert.equal(h.present, 2);
  h = redoHistory(h);
  assert.equal(h.present, 3);
  assert.equal(redoHistory(h), h);
  h = undoHistory(undoHistory(h));
  assert.equal(undoHistory(h), h);
  assert.deepEqual(pushHistory(h, 9).future, []);
});

test("toCsv quotes commas, quotes and newlines, and uses labels", () => {
  const csv = toCsv({ columns: columns.slice(0, 3), rows: [{ id: "x", cells: { t: 'Say "hi", ok', n: 3, s: "live" } }] });
  assert.equal(csv, 'Title,Words,Status\r\n"Say ""hi"", ok",3,Live');
});
