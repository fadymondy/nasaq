import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeFilterCount,
  cleanFieldValues,
  emptyReportFilters,
  filtersFromParams,
  filtersToParams,
  isValidViewName,
  markdownCell,
  reportToMarkdown,
  sameReportFilters,
  uniqueViewName,
  viewMatches,
} from "../src/components/report-filter-bar/report-filter-math.ts";
import { parseTimeRange, serializeTimeRange } from "../src/components/time-range-picker/time-range-math.ts";

const codec = { parse: parseTimeRange, serialize: serializeTimeRange };
const fields = [
  { id: "status", kind: "multi", options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost" }] },
  { id: "owner", kind: "select", options: [{ value: "sara", label: "Sara" }, { value: "omar", label: "Omar" }] },
  { id: "note", kind: "toggle" },
];
const defaults = emptyReportFilters(fields, { kind: "relative", preset: "30d" });

test("defaults give an empty query and read back", () => {
  assert.equal(filtersToParams(defaults, fields, defaults, codec).toString(), "");
  assert.deepEqual(filtersFromParams("", fields, defaults, codec), defaults);
});

test("state round-trips through the URL", () => {
  const state = { range: { kind: "custom", from: "2026-09-01", to: "2026-09-15" }, comparison: "previous", fields: { status: ["open", "won"], owner: ["sara"], note: [] } };
  const q = filtersToParams(state, fields, defaults, codec).toString();
  assert.match(q, /range=2026-09-01\.\.2026-09-15/);
  assert.match(q, /status=open&status=won/);
  assert.deepEqual(filtersFromParams(`?${q}`, fields, defaults, codec), state);
});

test("unknown keys, bad options and bad ranges fall back", () => {
  const s = filtersFromParams("range=garbage&compare=weird&status=open&status=nope&owner=zed&other=1", fields, defaults, codec);
  assert.deepEqual(s.range, defaults.range);
  assert.equal(s.comparison, "none");
  assert.deepEqual(s.fields.status, ["open"]);
  assert.deepEqual(s.fields.owner, []);
  assert.equal("other" in s.fields, false);
});

test("a single choice field keeps one value and a multi field drops duplicates", () => {
  assert.deepEqual(cleanFieldValues(fields[1], ["sara", "omar"]), ["sara"]);
  assert.deepEqual(cleanFieldValues(fields[0], ["won", "won", "", "open"]), ["won", "open"]);
});

test("clearing a field that has a default value survives the URL", () => {
  const withDefault = { ...defaults, fields: { ...defaults.fields, owner: ["sara"] } };
  const cleared = { ...withDefault, fields: { ...withDefault.fields, owner: [] } };
  const q = filtersToParams(cleared, fields, withDefault, codec);
  assert.equal(q.toString(), "owner=");
  assert.deepEqual(filtersFromParams(q, fields, withDefault, codec).fields.owner, []);
  assert.deepEqual(filtersFromParams("", fields, withDefault, codec).fields.owner, ["sara"]);
});

test("active count and sameness ignore multi order", () => {
  const a = { ...defaults, comparison: "year", fields: { ...defaults.fields, status: ["open", "won"] } };
  assert.equal(activeFilterCount(defaults, fields, defaults), 0);
  assert.equal(activeFilterCount(a, fields, defaults), 2);
  const b = { ...a, fields: { ...a.fields, status: ["won", "open"] } };
  assert.equal(sameReportFilters(a, b, fields), true);
  assert.equal(sameReportFilters(a, defaults, fields), false);
});

test("a saved view matches the filters it stores", () => {
  const state = { ...defaults, fields: { ...defaults.fields, owner: ["omar"] } };
  const view = { id: "v1", name: "Omar", query: filtersToParams(state, fields, defaults, codec).toString() };
  assert.equal(viewMatches(view, state, fields, defaults, codec), true);
  assert.equal(viewMatches(view, defaults, fields, defaults, codec), false);
});

test("view names are made unique and validated", () => {
  assert.equal(uniqueViewName("  Weekly  ", []), "Weekly");
  assert.equal(uniqueViewName("Weekly", ["weekly"]), "Weekly (2)");
  assert.equal(uniqueViewName("Weekly", ["Weekly", "Weekly (2)"]), "Weekly (3)");
  assert.equal(isValidViewName("   "), false);
  assert.equal(isValidViewName("x".repeat(61)), false);
  assert.equal(isValidViewName("Q3"), true);
});

test("markdown escapes cells and lays out the report", () => {
  assert.equal(markdownCell("a|b\nc"), String.raw`a\|b c`);
  assert.equal(markdownCell(null), "");
  const md = reportToMarkdown({
    title: "Profit",
    subtitle: "Q3",
    filters: [{ label: "Range", value: "Last 30 days" }],
    sections: [{ heading: "By project", stats: [{ label: "Margin", value: "32%" }], table: { columns: ["Project", "Revenue"], rows: [["A|B", 1200], ["C", null]] } }],
  });
  assert.equal(md, "# Profit\n\nQ3\n\n- **Range:** Last 30 days\n\n## By project\n\n- **Margin:** 32%\n\n| Project | Revenue |\n| --- | --- |\n| A\\|B | 1200 |\n| C |  |\n");
});
