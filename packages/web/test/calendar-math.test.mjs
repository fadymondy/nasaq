import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, addMonths, clampDay, dayKey, getWeekStartsOn, isSameDay, monthMatrix, startOfWeek } from "../src/components/calendar/calendar-math.ts";

const d = (y, m, day) => new Date(y, m - 1, day);

test("week start follows the locale", () => {
  assert.equal(getWeekStartsOn("en-US"), 0);
  assert.equal(getWeekStartsOn("en-GB"), 1);
  assert.equal(getWeekStartsOn("ar-SA"), 0);
  assert.equal(getWeekStartsOn("ar-EG"), 6);
});

test("month matrix: September 2026 starts on a Tuesday", () => {
  const sunday = monthMatrix(d(2026, 9, 15), 0);
  assert.equal(sunday.length, 5);
  assert.ok(sunday.every((row) => row.length === 7));
  assert.equal(dayKey(sunday[0][0]), "2026-08-30");
  assert.equal(dayKey(sunday[0][2]), "2026-09-01");
  assert.equal(dayKey(sunday[4][6]), "2026-10-03");

  const monday = monthMatrix(d(2026, 9, 15), 1);
  assert.equal(dayKey(monday[0][0]), "2026-08-31");

  const saturday = monthMatrix(d(2026, 9, 15), 6);
  assert.equal(dayKey(saturday[0][0]), "2026-08-29");
  assert.equal(saturday[0][0].getDay(), 6);
});

test("month matrix: a month that fits four weeks and fixed six-row grids", () => {
  const feb = monthMatrix(d(2026, 2, 1), 0);
  assert.equal(feb.length, 4);
  assert.equal(dayKey(feb[0][0]), "2026-02-01");
  assert.equal(monthMatrix(d(2026, 2, 1), 0, true).length, 6);
});

test("addMonths clamps the day and addDays crosses month edges", () => {
  assert.ok(isSameDay(addMonths(d(2026, 1, 31), 1), d(2026, 2, 28)));
  assert.ok(isSameDay(addMonths(d(2024, 1, 31), 1), d(2024, 2, 29)));
  assert.ok(isSameDay(addMonths(d(2026, 3, 15), -12), d(2025, 3, 15)));
  assert.ok(isSameDay(addDays(d(2026, 12, 31), 1), d(2027, 1, 1)));
});

test("startOfWeek and clampDay", () => {
  assert.equal(dayKey(startOfWeek(d(2026, 9, 29), 6)), "2026-09-26");
  assert.equal(dayKey(clampDay(d(2026, 9, 1), d(2026, 9, 10), d(2026, 9, 20))), "2026-09-10");
  assert.equal(dayKey(clampDay(d(2026, 9, 30), d(2026, 9, 10), d(2026, 9, 20))), "2026-09-20");
});
