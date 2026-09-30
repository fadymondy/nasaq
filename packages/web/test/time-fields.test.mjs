import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";
// The model imports the time range maths without an extension (the bundler resolves it); Node needs ".ts".
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(specifier, context, next) {
      try { return await next(specifier, context); }
      catch (error) {
        if (specifier.startsWith(".") && !/\.\w+$/.test(specifier)) return next(specifier + ".ts", context);
        throw error;
      }
    }`),
);

const {
  convertWallTime,
  formatTimeSpan,
  formatUtcOffset,
  formatZoneClock,
  formatZoneDifference,
  isTimeInRange,
  listTimeZones,
  matchTimeZone,
  minutesToTimeValue,
  parseOffsetQuery,
  parseTimeInput,
  stepTimeValue,
  timeSpanMinutes,
  timeValueToMinutes,
  timeZoneCity,
  timeZoneOffsetMinutes,
  wallTimeInZone,
  zoneDayDifference,
  zonedWallTimeToInstant,
} = await import("../src/components/time-fields/time-fields-model.ts");

test("typed times: digits only", () => {
  assert.equal(parseTimeInput("930"), "09:30");
  assert.equal(parseTimeInput("0930"), "09:30");
  assert.equal(parseTimeInput("1745"), "17:45");
  assert.equal(parseTimeInput("2359"), "23:59");
  assert.equal(parseTimeInput("000"), "00:00");
  assert.equal(parseTimeInput("9"), "09:00");
  assert.equal(parseTimeInput("09"), "09:00");
  assert.equal(parseTimeInput("23"), "23:00");
});

test("typed times: separators", () => {
  assert.equal(parseTimeInput("9:30"), "09:30");
  assert.equal(parseTimeInput("9.30"), "09:30");
  assert.equal(parseTimeInput("9 30"), "09:30");
  assert.equal(parseTimeInput("9h30"), "09:30");
  assert.equal(parseTimeInput("14:05"), "14:05");
  assert.equal(parseTimeInput("  7:00  "), "07:00");
});

test("typed times: am and pm, including Arabic markers", () => {
  assert.equal(parseTimeInput("9:30 pm"), "21:30");
  assert.equal(parseTimeInput("930pm"), "21:30");
  assert.equal(parseTimeInput("12am"), "00:00");
  assert.equal(parseTimeInput("12 pm"), "12:00");
  assert.equal(parseTimeInput("9 م"), "21:00");
  assert.equal(parseTimeInput("9:15 ص"), "09:15");
  assert.equal(parseTimeInput("13pm"), null);
});

test("typed times: Arabic-Indic and Persian digits", () => {
  assert.equal(parseTimeInput("٠٩٣٠"), "09:30");
  assert.equal(parseTimeInput("۱۴:۰۵"), "14:05");
});

test("typed times: invalid input", () => {
  for (const bad of ["", " ", "abc", "1760", "975", "24", "2400", "25:00", "9:5", "9:60", "12345", "9:30:15", "1:2:3"]) {
    assert.equal(parseTimeInput(bad), null, bad);
  }
  assert.equal(parseTimeInput("24:00", { allowEndOfDay: true }), "24:00");
  assert.equal(parseTimeInput("2400", { allowEndOfDay: true }), "24:00");
  assert.equal(parseTimeInput("24:30", { allowEndOfDay: true }), null);
});

test("minutes and values round trip", () => {
  assert.equal(timeValueToMinutes("09:30"), 570);
  assert.equal(timeValueToMinutes("24:00"), 1440);
  assert.equal(timeValueToMinutes("9:30"), null);
  assert.equal(timeValueToMinutes("24:01"), null);
  assert.equal(timeValueToMinutes(null), null);
  assert.equal(minutesToTimeValue(570), "09:30");
  assert.equal(minutesToTimeValue(1500), "01:00");
  assert.equal(minutesToTimeValue(-30), "23:30");
});

test("stepping snaps to the step and wraps", () => {
  assert.equal(stepTimeValue("09:32", 5), "09:35");
  assert.equal(stepTimeValue("09:32", -5), "09:30");
  assert.equal(stepTimeValue("09:30", -5), "09:25");
  assert.equal(stepTimeValue("23:58", 5), "00:00");
  assert.equal(stepTimeValue("00:00", -15), "23:45");
  assert.equal(stepTimeValue(null, 15), "09:00");
  assert.equal(stepTimeValue(null, 15, { min: "08:00" }), "08:00");
});

test("stepping stops at min and max", () => {
  assert.equal(stepTimeValue("17:55", 15, { min: "08:00", max: "18:00" }), "18:00");
  assert.equal(stepTimeValue("08:05", -15, { min: "08:00", max: "18:00" }), "08:00");
  assert.equal(stepTimeValue("23:55", 15, { wrap: false }), "23:59");
});

test("range checks and spans", () => {
  assert.equal(isTimeInRange("09:00", "08:00", "18:00"), true);
  assert.equal(isTimeInRange("07:59", "08:00", "18:00"), false);
  assert.equal(isTimeInRange("18:00", "08:00", "18:00"), true);
  assert.equal(isTimeInRange("nope"), false);
  assert.equal(timeSpanMinutes({ start: "09:00", end: "17:30" }), 510);
  assert.equal(timeSpanMinutes({ start: "22:00", end: "06:00" }), null);
  assert.equal(timeSpanMinutes({ start: "22:00", end: "06:00" }, true), 480);
  assert.equal(formatTimeSpan(510), "8h 30m");
  assert.equal(formatTimeSpan(120), "2h");
  assert.equal(formatTimeSpan(0), "0m");
  assert.equal(formatTimeSpan(510, "ar"), "8 س 30 د");
});

const SEP = new Date("2026-09-30T09:30:00Z");
const JAN = new Date("2026-01-15T09:30:00Z");

test("time zone offsets", () => {
  assert.equal(timeZoneOffsetMinutes(SEP, "Asia/Riyadh"), 180);
  assert.equal(timeZoneOffsetMinutes(SEP, "Asia/Kolkata"), 330);
  assert.equal(timeZoneOffsetMinutes(SEP, "UTC"), 0);
  assert.equal(timeZoneOffsetMinutes(SEP, "America/New_York"), -240);
  assert.equal(timeZoneOffsetMinutes(JAN, "America/New_York"), -300);
  assert.equal(timeZoneOffsetMinutes(SEP, "Asia/Kathmandu"), 345);
  assert.equal(timeZoneOffsetMinutes(SEP, "Europe/London"), 60);
  assert.equal(timeZoneOffsetMinutes(JAN, "Europe/London"), 0);
});

test("offset labels and differences", () => {
  assert.equal(formatUtcOffset(330), "UTC+05:30");
  assert.equal(formatUtcOffset(-240), "UTC-04:00");
  assert.equal(formatUtcOffset(0), "UTC+00:00");
  assert.equal(formatZoneDifference(180), "+3h");
  assert.equal(formatZoneDifference(-330), "-5h 30m");
  assert.equal(formatZoneDifference(0), "same time");
  assert.equal(formatZoneDifference(0, "ar"), "الوقت نفسه");
});

test("zone clocks use Latin digits in both languages", () => {
  assert.equal(formatZoneClock(SEP, "Asia/Riyadh", { hourCycle: 24 }), "12:30");
  assert.equal(formatZoneClock(SEP, "Asia/Riyadh", { hourCycle: 24, seconds: true }), "12:30:00");
  assert.match(formatZoneClock(SEP, "America/New_York", { hourCycle: 12 }), /^5:30\s?AM$/);
  assert.match(formatZoneClock(SEP, "Asia/Riyadh", { locale: "ar", hourCycle: 24 }), /^12:30$/);
  assert.match(formatZoneClock(SEP, "Asia/Riyadh", { locale: "ar", hourCycle: 12 }), /^12:30\s?م$/);
});

test("day differences across the date line", () => {
  const late = new Date("2026-09-30T20:00:00Z");
  assert.equal(zoneDayDifference(late, "Asia/Tokyo", "UTC"), 1);
  assert.equal(zoneDayDifference(late, "America/Los_Angeles", "UTC"), 0);
  assert.equal(zoneDayDifference(new Date("2026-09-30T02:00:00Z"), "America/Los_Angeles", "UTC"), -1);
  assert.equal(zoneDayDifference(late, "UTC", "UTC"), 0);
});

test("wall clock conversion", () => {
  assert.deepEqual(convertWallTime("2026-09-30", "09:30", "Asia/Riyadh", "UTC"), { day: "2026-09-30", time: "06:30" });
  assert.deepEqual(convertWallTime("2026-09-30", "09:30", "Asia/Riyadh", "America/New_York"), { day: "2026-09-30", time: "02:30" });
  assert.deepEqual(convertWallTime("2026-09-30", "01:00", "Asia/Riyadh", "America/New_York"), { day: "2026-09-29", time: "18:00" });
  assert.deepEqual(convertWallTime("2026-09-30", "23:30", "America/Los_Angeles", "Asia/Tokyo"), { day: "2026-10-01", time: "15:30" });
  assert.equal(convertWallTime("bad", "09:30", "UTC", "UTC"), null);
  assert.equal(convertWallTime("2026-09-30", "9:30", "UTC", "UTC"), null);
});

test("daylight saving gaps and folds", () => {
  // New York springs forward on 2026-03-08: 02:30 does not exist and resolves to just after the gap.
  const gap = zonedWallTimeToInstant("2026-03-08", "02:30", "America/New_York");
  assert.deepEqual(wallTimeInZone(gap, "America/New_York"), { day: "2026-03-08", time: "03:30" });
  // A repeated hour (fall back on 2026-11-01) takes its first occurrence.
  const fold = zonedWallTimeToInstant("2026-11-01", "01:30", "America/New_York");
  assert.equal(fold.toISOString(), "2026-11-01T05:30:00.000Z");
  // A normal time round trips.
  const ok = zonedWallTimeToInstant("2026-03-08", "12:00", "America/New_York");
  assert.equal(ok.toISOString(), "2026-03-08T16:00:00.000Z");
});

test("zone names and search", () => {
  assert.equal(timeZoneCity("America/Argentina/Buenos_Aires"), "Buenos Aires");
  assert.equal(timeZoneCity("UTC"), "UTC");
  assert.equal(parseOffsetQuery("UTC+3"), 180);
  assert.equal(parseOffsetQuery("gmt-5:30"), -330);
  assert.equal(parseOffsetQuery("+05:30"), 330);
  assert.equal(parseOffsetQuery("+0530"), 330);
  assert.equal(parseOffsetQuery("riyadh"), null);
  assert.equal(matchTimeZone("Asia/Riyadh", "riyadh", SEP), true);
  assert.equal(matchTimeZone("Asia/Riyadh", "Asia", SEP), true);
  assert.equal(matchTimeZone("Asia/Riyadh", "cairo", SEP), false);
  assert.equal(matchTimeZone("Asia/Riyadh", "utc+3", SEP), true);
  assert.equal(matchTimeZone("Asia/Riyadh", "utc+4", SEP), false);
  assert.equal(matchTimeZone("Asia/Riyadh", "arabian", SEP, "en"), true);
  assert.equal(matchTimeZone("Asia/Riyadh", "", SEP), true);
});

test("the zone list starts with UTC and has Riyadh", () => {
  const zones = listTimeZones();
  assert.equal(zones[0], "UTC");
  assert.ok(zones.includes("Asia/Riyadh"));
  assert.equal(new Set(zones).size, zones.length);
});
