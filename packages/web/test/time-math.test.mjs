import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, buildGrid, dateKey, formatClock, formatHours, parseDuration, parseTime, startOfWeek, weekKeys } from "../src/components/time-tracker/time-math.ts";

test("formatClock and formatHours", () => {
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(-4), "0:00:00");
  assert.equal(formatHours(5400), "1:30");
  assert.equal(formatHours(59), "0:00");
});

test("parseDuration reads the common shapes", () => {
  assert.equal(parseDuration("1:30"), 5400);
  assert.equal(parseDuration("1.5"), 5400);
  assert.equal(parseDuration("1.5h"), 5400);
  assert.equal(parseDuration("90m"), 5400);
  assert.equal(parseDuration("2h 15m"), 8100);
  assert.equal(parseDuration("45"), 2700);
  assert.equal(parseDuration("٢:٣٠"), 9000);
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration(""), null);
});

test("parseTime", () => {
  assert.equal(parseTime("09:30"), 570);
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("9:5"), null);
});

test("weeks start on the requested day", () => {
  const wed = new Date(2026, 8, 30);
  assert.equal(dateKey(startOfWeek(wed, 0)), "2026-09-27");
  assert.equal(dateKey(startOfWeek(wed, 1)), "2026-09-28");
  assert.equal(dateKey(startOfWeek(wed, 6)), "2026-09-26");
  assert.deepEqual(weekKeys(new Date(2026, 8, 28)).slice(-2), ["2026-10-03", "2026-10-04"]);
  assert.equal(dateKey(addDays(new Date(2026, 11, 31), 1)), "2027-01-01");
});

test("buildGrid pivots rows and totals, ignoring other weeks", () => {
  const days = ["2026-09-28", "2026-09-29"];
  const entries = [
    { date: "2026-09-28", seconds: 3600, p: "a" },
    { date: "2026-09-29", seconds: 1800, p: "a" },
    { date: "2026-09-29", seconds: 600, p: "b" },
    { date: "2026-10-05", seconds: 999, p: "b" },
  ];
  const grid = buildGrid(entries, days, (e) => e.p);
  assert.equal(grid.total, 6000);
  assert.deepEqual(grid.columns, { "2026-09-28": 3600, "2026-09-29": 2400 });
  assert.equal(grid.rows.length, 2);
  assert.equal(grid.rows[0].total, 5400);
});
