import assert from "node:assert/strict";
import { test } from "node:test";
import { cronToSimple, describeCron, isValidCron, nextRuns, parseCron, simpleToCron, zonedInstant } from "../src/components/cron-builder/cron.ts";

const iso = (list) => list.map((d) => d.toISOString());

test("parses fields, lists, ranges, steps and names", () => {
  const r = parseCron("*/15 9-17 1,15 jan-mar mon-fri");
  assert.ok(r.ok);
  assert.deepEqual(r.value.minutes, [0, 15, 30, 45]);
  assert.deepEqual(r.value.hours, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(r.value.days, [1, 15]);
  assert.deepEqual(r.value.months, [1, 2, 3]);
  assert.deepEqual(r.value.weekdays, [1, 2, 3, 4, 5]);
  assert.equal(parseCron("0 0 * * 7").value.weekdays[0], 0);
  assert.deepEqual(parseCron("@daily").value.hours, [0]);
});

test("rejects bad expressions with the field at fault", () => {
  assert.equal(parseCron("").error.code, "empty");
  assert.equal(parseCron("* * * *").error.code, "fields");
  assert.deepEqual(parseCron("60 * * * *").error, { code: "range", field: 0, token: "60" });
  assert.equal(parseCron("* 24 * * *").error.field, 1);
  assert.equal(parseCron("* * 0 * *").error.code, "range");
  assert.equal(parseCron("*/0 * * * *").error.code, "step");
  assert.equal(parseCron("a * * * *").error.code, "syntax");
  assert.equal(parseCron("5-1 * * * *").error.code, "range");
  assert.equal(isValidCron("0 9 * * 1-5"), true);
});

test("next runs in UTC", () => {
  const from = Date.UTC(2026, 8, 30, 8, 30); // Wed 30 Sep 2026
  assert.deepEqual(iso(nextRuns("0 9 * * *", { from, count: 3 })), ["2026-09-30T09:00:00.000Z", "2026-10-01T09:00:00.000Z", "2026-10-02T09:00:00.000Z"]);
  assert.deepEqual(iso(nextRuns("*/20 * * * *", { from, count: 3 })), ["2026-09-30T08:40:00.000Z", "2026-09-30T09:00:00.000Z", "2026-09-30T09:20:00.000Z"]);
  // strictly after `from`
  assert.equal(nextRuns("30 8 * * *", { from, count: 1 })[0].toISOString(), "2026-10-01T08:30:00.000Z");
  assert.deepEqual(iso(nextRuns("0 9 * * 1-5", { from: Date.UTC(2026, 9, 2, 10), count: 2 })), ["2026-10-05T09:00:00.000Z", "2026-10-06T09:00:00.000Z"]);
});

test("day of month and day of week both set means either", () => {
  const from = Date.UTC(2026, 8, 30, 12);
  // 1st of the month OR any Monday
  assert.deepEqual(iso(nextRuns("0 0 1 * 1", { from, count: 3 })), ["2026-10-01T00:00:00.000Z", "2026-10-05T00:00:00.000Z", "2026-10-12T00:00:00.000Z"]);
});

test("leap day and month rollover", () => {
  assert.equal(nextRuns("0 0 29 2 *", { from: Date.UTC(2026, 0, 1), count: 1 })[0].toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(nextRuns("0 0 31 * *", { from: Date.UTC(2026, 8, 30, 12), count: 1 })[0].toISOString(), "2026-10-31T00:00:00.000Z");
  assert.deepEqual(nextRuns("0 0 30 2 *", { from: Date.UTC(2026, 0, 1), count: 1 }), []);
});

test("time zones", () => {
  const from = Date.UTC(2026, 8, 30, 0, 0);
  // Riyadh is UTC+3 all year
  assert.equal(nextRuns("0 9 * * *", { from, timeZone: "Asia/Riyadh", count: 1 })[0].toISOString(), "2026-09-30T06:00:00.000Z");
  // New York is on daylight time in September (UTC-4) and standard time in January (UTC-5)
  assert.equal(nextRuns("0 9 * * *", { from, timeZone: "America/New_York", count: 1 })[0].toISOString(), "2026-09-30T13:00:00.000Z");
  assert.equal(nextRuns("0 9 * * *", { from: Date.UTC(2026, 0, 10), timeZone: "America/New_York", count: 1 })[0].toISOString(), "2026-01-10T14:00:00.000Z");
  assert.deepEqual(nextRuns("0 9 * * *", { from, timeZone: "Not/AZone" }), []);
});

test("a wall-clock time inside a daylight saving gap is skipped", () => {
  // 8 March 2026: New York jumps from 02:00 to 03:00
  assert.equal(zonedInstant(2026, 3, 8, 2, 30, "America/New_York"), null);
  const runs = nextRuns("30 2 * * *", { from: Date.UTC(2026, 2, 7, 12), timeZone: "America/New_York", count: 3 });
  assert.equal(runs.length, 3);
  assert.ok(!runs.some((d) => d.toISOString().startsWith("2026-03-08")));
});

test("simple form round trips", () => {
  const cases = ["* * * * *", "*/15 * * * *", "30 * * * *", "0 */6 * * *", "45 7 * * *", "0 9 * * 1,3,5", "30 8 15 * *"];
  for (const c of cases) assert.equal(simpleToCron(cronToSimple(c)), c);
  assert.equal(cronToSimple("0 9 * * 1-5"), null);
  assert.equal(cronToSimple("0 9 * 3 *"), null);
  assert.equal(cronToSimple("nonsense"), null);
  assert.equal(simpleToCron({ frequency: "weekly", every: 1, minute: 0, time: "10:05", days: [], dayOfMonth: 1 }), "5 10 * * 1");
});

test("describes in English and Arabic", () => {
  assert.equal(describeCron("* * * * *", "en"), "Every minute");
  assert.equal(describeCron("*/5 * * * *", "en"), "Every 5 minutes");
  assert.equal(describeCron("0 * * * *", "en"), "Every hour, on the hour");
  assert.equal(describeCron("0 9 * * *", "en"), "At 09:00, every day");
  assert.equal(describeCron("0 9 * * 1-5", "en"), "At 09:00, on weekdays");
  assert.equal(describeCron("30 8 * * 1,3", "en"), "At 08:30, on Monday and Wednesday");
  assert.equal(describeCron("0 9 1 * *", "en"), "At 09:00, on day 1 of the month");
  assert.equal(describeCron("0 9 1 1,7 *", "en"), "At 09:00, on day 1 of the month, in January and July");
  assert.equal(describeCron("@daily", "en"), "At 00:00, every day");
  assert.equal(describeCron("0 9 * * 1-5", "ar"), "عند 09:00، من الاثنين إلى الجمعة");
  assert.equal(describeCron("*/2 * * * *", "ar"), "كل دقيقتين");
  assert.equal(describeCron("*/5 * * * *", "ar"), "كل 5 دقائق");
  assert.equal(describeCron("0 9 * * *", "ar"), "عند 09:00، كل يوم");
  assert.equal(describeCron("1-5,10 9 * * *", "en"), null);
  assert.equal(describeCron("bad", "en"), null);
});
