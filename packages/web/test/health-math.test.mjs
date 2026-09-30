import assert from "node:assert/strict";
import { test } from "node:test";
import { bmiCategory, bmiTone, clampPercent, computeBmi, distanceToTarget } from "../src/components/vitals/vitals-math.ts";

test("computeBmi", () => {
  assert.equal(computeBmi(70, 175), 22.9);
  assert.equal(computeBmi(undefined, 175), null);
  assert.equal(computeBmi(70, 0), null);
});

test("bmiCategory uses the adult cut-offs", () => {
  assert.equal(bmiCategory(18.4), "underweight");
  assert.equal(bmiCategory(18.5), "normal");
  assert.equal(bmiCategory(24.9), "normal");
  assert.equal(bmiCategory(25), "overweight");
  assert.equal(bmiCategory(30), "obese");
  assert.equal(bmiTone("normal"), "success");
  assert.equal(bmiTone("obese"), "danger");
});

test("targets", () => {
  assert.equal(clampPercent(140), 100);
  assert.equal(clampPercent(-3), 0);
  assert.equal(clampPercent(Number.NaN), 0);
  assert.equal(distanceToTarget({ current: 84.2, target: 80, onTarget: false }), -4.2);
  assert.equal(distanceToTarget({ current: 80, target: 80, onTarget: true }), 0);
});

import { addCivilDays, isAfter, isCivilDate, minutesToSeconds, unclassifiedCount } from "../src/components/daily-summary/daily-summary-math.ts";

test("civil date arithmetic", () => {
  assert.equal(addCivilDays("2026-09-29", 1), "2026-09-30");
  assert.equal(addCivilDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addCivilDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addCivilDays("2028-02-28", 1), "2028-02-29");
  assert.equal(isCivilDate("2026-02-30"), false);
  assert.equal(isCivilDate("2026-09-29"), true);
  assert.equal(isAfter("2026-09-30", "2026-09-29"), true);
});

test("summary helpers", () => {
  assert.equal(minutesToSeconds(450), 27000);
  assert.equal(unclassifiedCount(5, 2, 1), 2);
  assert.equal(unclassifiedCount(2, 2, 2), 0);
});

import { average, metricSeries, reportToCsv, summariseReport } from "../src/components/health-reports/report-math.ts";

const days = [
  { date: "2026-09-27", waterMl: 2000, steps: 8000, weightKg: 82, meals: { total: 3, safe: 2, unsafe: 1 }, shutdownViolations: 0 },
  { date: "2026-09-28", waterMl: 3000, weightKg: 81.4, shutdownViolations: 2 },
  { date: "2026-09-29" },
];

test("average skips missing days instead of counting zero", () => {
  assert.equal(average([2000, undefined, 3000]), 2500);
  assert.equal(average([undefined]), null);
});

test("summariseReport", () => {
  const s = summariseReport(days);
  assert.equal(s.days, 3);
  assert.equal(s.daysWithData, 2);
  assert.equal(s.averages.waterMl, 2500);
  assert.equal(s.averages.steps, 8000);
  assert.equal(s.averages.sleepMinutes, null);
  assert.deepEqual(s.weight, { first: 82, last: 81.4, change: -0.6 });
  assert.equal(s.meals.unsafe, 1);
  assert.equal(s.daysWithShutdownViolations, 1);
});

test("metricSeries keeps gaps as null and csv leaves empty cells", () => {
  assert.deepEqual(metricSeries(days, "steps").map((p) => p.value), [8000, null, null]);
  const csv = reportToCsv(days).split("\n");
  assert.equal(csv.length, 4);
  assert.ok(csv[0].startsWith("date,water_ml"));
  assert.ok(csv[3].startsWith("2026-09-29,,"));
});
