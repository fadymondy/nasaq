import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  addYears,
  comparisonRange,
  countDays,
  currentWeek,
  dayInZone,
  isDay,
  isFutureWeek,
  lastDayOf,
  parseTimeRange,
  presetMs,
  resolveTimeRange,
  serializeTimeRange,
  shiftWeek,
  startOfDayInZone,
  startOfWeek,
  zoneOffsetLabel,
  zoneOffsetMs,
} from "../src/components/time-range-picker/time-range-math.ts";

const NOW = new Date("2026-09-30T10:30:00Z"); // a Wednesday

test("relative presets are windows ending now", () => {
  for (const [preset, ms] of [["1h", 3_600_000], ["6h", 21_600_000], ["24h", 86_400_000], ["7d", 604_800_000], ["30d", 2_592_000_000], ["15m", 900_000]]) {
    const r = resolveTimeRange({ kind: "relative", preset }, { now: NOW });
    assert.equal(r.to.getTime(), NOW.getTime());
    assert.equal(r.to.getTime() - r.from.getTime(), ms);
    assert.equal(presetMs(preset), ms);
  }
  assert.equal(presetMs("0h"), 0);
  assert.equal(presetMs("soon"), 0);
  assert.throws(() => resolveTimeRange({ kind: "relative", preset: "x" }, { now: NOW }));
});

test("days are validated and shifted without the local clock", () => {
  assert.ok(isDay("2028-02-29"));
  assert.ok(!isDay("2027-02-29"));
  assert.ok(!isDay("2026-13-01"));
  assert.ok(!isDay("2026-9-3"));
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(countDays("2026-09-01", "2026-09-30"), 30);
  assert.equal(addYears("2028-02-29", -1), "2027-02-28");
});

test("weeks start on the chosen weekday", () => {
  assert.equal(startOfWeek("2026-09-30", 1), "2026-09-28"); // Wednesday -> Monday
  assert.equal(startOfWeek("2026-09-30", 0), "2026-09-27"); // Sunday
  assert.equal(startOfWeek("2026-09-30", 6), "2026-09-26"); // Saturday
  assert.equal(startOfWeek("2026-09-28", 1), "2026-09-28");
  assert.deepEqual(currentWeek({ now: NOW, weekStartsOn: 0 }), { kind: "week", start: "2026-09-27" });
  const w = resolveTimeRange({ kind: "week", start: "2026-09-27" }, { timeZone: "UTC" });
  assert.equal(w.from.toISOString(), "2026-09-27T00:00:00.000Z");
  assert.equal(w.to.toISOString(), "2026-10-04T00:00:00.000Z");
});

test("the week navigator moves by whole weeks and stops at the future", () => {
  const week = currentWeek({ now: NOW, weekStartsOn: 0 });
  assert.deepEqual(shiftWeek(week, -1), { kind: "week", start: "2026-09-20" });
  assert.deepEqual(shiftWeek(shiftWeek(week, -2), 2), week);
  assert.equal(isFutureWeek(week, { now: NOW }), false);
  assert.equal(isFutureWeek(shiftWeek(week, 1), { now: NOW }), true);
  const rel = { kind: "relative", preset: "7d" };
  assert.equal(shiftWeek(rel, 1), rel);
});

test("time zones decide where a day starts", () => {
  assert.equal(zoneOffsetMs(NOW, "Asia/Riyadh"), 10_800_000);
  assert.equal(zoneOffsetLabel(NOW, "Asia/Riyadh"), "UTC+03:00");
  assert.equal(zoneOffsetLabel(NOW, "Asia/Kolkata"), "UTC+05:30");
  assert.equal(zoneOffsetLabel(NOW, "America/New_York"), "UTC-04:00"); // EDT
  assert.equal(startOfDayInZone("2026-09-30", "Asia/Riyadh").toISOString(), "2026-09-29T21:00:00.000Z");
  assert.equal(dayInZone(new Date("2026-09-30T22:00:00Z"), "Asia/Riyadh"), "2026-10-01");
  assert.equal(dayInZone(new Date("2026-09-30T22:00:00Z"), "UTC"), "2026-09-30");
  assert.equal(dayInZone(new Date("2026-09-30T02:00:00Z"), "America/Los_Angeles"), "2026-09-29");
  const custom = resolveTimeRange({ kind: "custom", from: "2026-09-01", to: "2026-09-30" }, { timeZone: "Asia/Riyadh" });
  assert.equal(custom.from.toISOString(), "2026-08-31T21:00:00.000Z");
  assert.equal(custom.to.toISOString(), "2026-09-30T21:00:00.000Z");
  assert.equal(lastDayOf(custom, "Asia/Riyadh"), "2026-09-30");
  // a reversed pick still resolves in order
  const swapped = resolveTimeRange({ kind: "custom", from: "2026-09-30", to: "2026-09-01" }, { timeZone: "UTC" });
  assert.equal(swapped.from.toISOString(), "2026-09-01T00:00:00.000Z");
});

test("daylight saving days are 23 or 25 hours, not 24", () => {
  const spring = resolveTimeRange({ kind: "custom", from: "2026-03-08", to: "2026-03-08" }, { timeZone: "America/New_York" });
  assert.equal((spring.to - spring.from) / 3_600_000, 23);
  assert.equal(spring.from.toISOString(), "2026-03-08T05:00:00.000Z");
  const autumn = resolveTimeRange({ kind: "custom", from: "2026-11-01", to: "2026-11-01" }, { timeZone: "America/New_York" });
  assert.equal((autumn.to - autumn.from) / 3_600_000, 25);
  const london = startOfDayInZone("2026-03-29", "Europe/London");
  assert.equal(london.toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(startOfDayInZone("2026-03-30", "Europe/London").toISOString(), "2026-03-29T23:00:00.000Z");
});

test("previous period is the same number of calendar days straight before", () => {
  const rel = comparisonRange({ kind: "relative", preset: "24h" }, "previous", { now: NOW });
  assert.equal(rel.to.toISOString(), "2026-09-29T10:30:00.000Z");
  assert.equal(rel.from.toISOString(), "2026-09-28T10:30:00.000Z");
  const week = comparisonRange({ kind: "week", start: "2026-09-27" }, "previous", { timeZone: "UTC" });
  assert.equal(week.from.toISOString(), "2026-09-20T00:00:00.000Z");
  assert.equal(week.to.toISOString(), "2026-09-27T00:00:00.000Z");
  const custom = comparisonRange({ kind: "custom", from: "2026-09-10", to: "2026-09-14" }, "previous", { timeZone: "UTC" });
  assert.equal(custom.from.toISOString(), "2026-09-05T00:00:00.000Z");
  assert.equal(custom.to.toISOString(), "2026-09-10T00:00:00.000Z");
  assert.equal(comparisonRange({ kind: "week", start: "2026-09-27" }, "none"), null);
});

test("previous period across a daylight saving change stays on whole local days", () => {
  const cur = { kind: "week", start: "2026-03-08" }; // New York springs forward on the 8th
  const prev = comparisonRange(cur, "previous", { timeZone: "America/New_York" });
  assert.equal(dayInZone(prev.from, "America/New_York"), "2026-03-01");
  assert.equal(prev.to.toISOString(), resolveTimeRange(cur, { timeZone: "America/New_York" }).from.toISOString());
  const before = comparisonRange({ kind: "week", start: "2026-03-01" }, "previous", { timeZone: "America/New_York" });
  assert.equal(dayInZone(before.from, "America/New_York"), "2026-02-22");
  assert.equal(startOfDayInZone("2026-03-01", "America/New_York").toISOString(), before.to.toISOString());
});

test("year comparison keeps the same days and clamps a leap day", () => {
  const y = comparisonRange({ kind: "custom", from: "2026-09-01", to: "2026-09-30" }, "year", { timeZone: "UTC" });
  assert.equal(y.from.toISOString(), "2025-09-01T00:00:00.000Z");
  assert.equal(y.to.toISOString(), "2025-10-01T00:00:00.000Z");
  const leap = comparisonRange({ kind: "custom", from: "2028-02-29", to: "2028-02-29" }, "year", { timeZone: "UTC" });
  assert.equal(leap.from.toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(leap.to.toISOString(), "2027-03-01T00:00:00.000Z");
  const rel = comparisonRange({ kind: "relative", preset: "7d" }, "year", { now: NOW });
  assert.equal(rel.to.toISOString(), "2025-09-30T10:30:00.000Z");
});

test("URL text round-trips and bad text is rejected", () => {
  for (const v of [
    { kind: "relative", preset: "24h" },
    { kind: "week", start: "2026-09-27" },
    { kind: "custom", from: "2026-09-01", to: "2026-09-15" },
  ]) assert.deepEqual(parseTimeRange(serializeTimeRange(v)), v);
  assert.deepEqual(parseTimeRange("2026-09-15..2026-09-01"), { kind: "custom", from: "2026-09-01", to: "2026-09-15" });
  for (const bad of ["", null, undefined, "week:2026-02-30", "2026-09-01", "1x", "0h", "a..b", "2026-09-01..2026-09-02..2026-09-03"]) assert.equal(parseTimeRange(bad), null, String(bad));
});
