import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampColumnSize,
  inRange,
  isActiveRange,
  nextSorting,
  orderByPinning,
  pinColumnIn,
  pinOffsets,
  rangeBound,
  sortTableRows,
} from "../src/components/data-table/data-table-logic.ts";

test("a plain header click cycles asc, desc, off and replaces other keys", () => {
  assert.deepEqual(nextSorting([], "a"), [{ id: "a", direction: "asc" }]);
  assert.deepEqual(nextSorting([{ id: "a", direction: "asc" }], "a"), [{ id: "a", direction: "desc" }]);
  assert.deepEqual(nextSorting([{ id: "a", direction: "desc" }], "a"), []);
  assert.deepEqual(nextSorting([{ id: "a", direction: "asc" }], "b"), [{ id: "b", direction: "asc" }]);
  assert.deepEqual(
    nextSorting(
      [
        { id: "a", direction: "asc" },
        { id: "b", direction: "desc" },
      ],
      "b",
    ),
    [{ id: "b", direction: "desc" }],
  );
});

test("an additive click appends, flips to desc, then removes the key", () => {
  const one = [{ id: "a", direction: "asc" }];
  const two = nextSorting(one, "b", true);
  assert.deepEqual(two, [
    { id: "a", direction: "asc" },
    { id: "b", direction: "asc" },
  ]);
  const flipped = nextSorting(two, "b", true);
  assert.deepEqual(flipped[1], { id: "b", direction: "desc" });
  assert.deepEqual(nextSorting(flipped, "b", true), one);
});

test("multi-key sort: later keys break ties, nulls stay last both ways, ties keep order", () => {
  const rows = [
    { id: 1, team: "b", n: 2 },
    { id: 2, team: "a", n: 5 },
    { id: 3, team: "b", n: 9 },
    { id: 4, team: null, n: 1 },
    { id: 5, team: "a", n: 5 },
  ];
  const by = (id) => (r) => r[id];
  const asc = sortTableRows(
    rows,
    [
      { id: "team", direction: "asc" },
      { id: "n", direction: "desc" },
    ],
    by,
  );
  assert.deepEqual(
    asc.map((r) => r.id),
    [2, 5, 3, 1, 4],
  );
  const desc = sortTableRows(rows, [{ id: "team", direction: "desc" }], by);
  assert.deepEqual(desc.at(-1).id, 4);
  assert.deepEqual(
    sortTableRows([{ v: "item 10" }, { v: "item 9" }], [{ id: "v", direction: "asc" }], by).map((r) => r.v),
    ["item 9", "item 10"],
  );
  assert.deepEqual(sortTableRows(rows, [{ id: "missing", direction: "asc" }], () => undefined), rows);
});

test("range bounds: numbers, dates, and a max date that covers the whole day", () => {
  assert.equal(rangeBound(5, "min"), 5);
  assert.equal(rangeBound("", "min"), null);
  assert.equal(rangeBound("12.5", "max"), 12.5);
  assert.equal(rangeBound("2026-03-01", "min"), Date.UTC(2026, 2, 1));
  assert.equal(rangeBound("2026-03-01", "max"), Date.UTC(2026, 2, 2) - 1);
  assert.equal(isActiveRange({ min: null, max: "" }), false);
  assert.equal(isActiveRange({ max: 0 }), true);
});

test("inRange is inclusive and rejects rows without a value", () => {
  assert.equal(inRange(10, { min: 10, max: 20 }), true);
  assert.equal(inRange(20, { min: 10, max: 20 }), true);
  assert.equal(inRange(21, { min: 10, max: 20 }), false);
  assert.equal(inRange(null, { min: 1 }), false);
  assert.equal(inRange(null, {}), true);
  assert.equal(inRange("2026-03-01T18:00:00Z", { min: "2026-03-01", max: "2026-03-01" }), true);
  assert.equal(inRange(new Date(Date.UTC(2026, 2, 2)), { max: "2026-03-01" }), false);
});

test("pinning orders columns, moves them between sides and gives sticky offsets", () => {
  assert.deepEqual(orderByPinning(["a", "b", "c", "d"], { start: ["c"], end: ["a"] }), ["c", "b", "d", "a"]);
  assert.deepEqual(orderByPinning(["a", "b"], { start: ["zz", "b"] }), ["b", "a"]);
  assert.deepEqual(pinColumnIn({ start: ["a"], end: [] }, "a", "end"), { start: [], end: ["a"] });
  assert.deepEqual(pinColumnIn({ start: ["a", "b"] }, "a", null), { start: ["b"], end: [] });
  assert.deepEqual(
    pinOffsets([
      { id: "sel", pin: "start", width: 40 },
      { id: "name", pin: "start", width: 200 },
      { id: "mid", pin: null, width: 300 },
      { id: "amt", pin: "end", width: 120 },
      { id: "act", pin: "end", width: 48 },
    ]),
    { sel: 0, name: 40, act: 0, amt: 48 },
  );
});

test("column sizes stay inside their limits", () => {
  assert.equal(clampColumnSize(10), 48);
  assert.equal(clampColumnSize(5000), 960);
  assert.equal(clampColumnSize(120.4, 100, 300), 120);
  assert.equal(clampColumnSize(90, 100, 300), 100);
});
