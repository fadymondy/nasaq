import assert from "node:assert/strict";
import { test } from "node:test";
import { amountForWork, checkRate, cycleAround, marginBps, cycleMonthlyEquivalent, monthlyRecurring, nextOccurrences, prorate, rateAt, rateSegments, sortRates } from "../src/components/rates-subscriptions/rates-logic.ts";

const rates = [
  { amount: 6000, from: "2026-04-01" },
  { amount: 5000, from: "2026-01-01" },
  { amount: 7500, from: "2026-09-01" },
];

test("rateAt picks the rate in force on a day", () => {
  assert.equal(rateAt(rates, "2025-12-31"), undefined);
  assert.equal(rateAt(rates, "2026-01-01").amount, 5000);
  assert.equal(rateAt(rates, "2026-03-31").amount, 5000);
  assert.equal(rateAt(rates, "2026-04-01").amount, 6000);
  assert.equal(rateAt(rates, "2027-01-01").amount, 7500);
  assert.deepEqual(sortRates([...rates, { amount: 1, from: "2026-04-01" }]).map((r) => r.amount), [5000, 1, 7500]);
});

test("rateSegments end the day before the next rate and give the change", () => {
  const s = rateSegments(rates);
  assert.deepEqual(s.map((x) => [x.from, x.to, x.changeBps]), [
    ["2026-01-01", "2026-03-31", null],
    ["2026-04-01", "2026-08-31", 2000],
    ["2026-09-01", null, 2500],
  ]);
});

test("checkRate", () => {
  assert.equal(checkRate({ amount: 0, from: "2026-01-01" }, []), "amount");
  assert.equal(checkRate({ amount: 10.5, from: "2026-01-01" }, []), "amount");
  assert.equal(checkRate({ amount: 100, from: "2026-02-30" }, []), "date");
  assert.equal(checkRate({ amount: 100, from: "2026-04-01" }, rates), "duplicate");
  assert.equal(checkRate({ amount: 100, from: "2026-04-01" }, rates, "2026-04-01"), null);
});

test("work is priced at the rate on its own day", () => {
  const work = [
    { day: "2026-03-30", minutes: 90 },
    { day: "2026-04-02", minutes: 90 },
    { day: "2025-12-01", minutes: 60 },
  ];
  assert.equal(amountForWork(work, rates), 7500 + 9000);
  assert.equal(amountForWork([{ day: "2026-04-02", minutes: 1 }], rates), 100);
  assert.equal(marginBps(6000, 4500), 2500);
  assert.equal(marginBps(0, 10), null);
});

test("monthly cycles clamp to the month end without drifting", () => {
  assert.deepEqual(nextOccurrences({ every: 1, unit: "month" }, "2026-01-31", "2026-01-31", 4), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.deepEqual(nextOccurrences({ every: 1, unit: "month" }, "2028-01-31", "2028-02-01", 2), ["2028-02-29", "2028-03-31"]);
  assert.deepEqual(nextOccurrences({ every: 3, unit: "month" }, "2026-01-15", "2026-06-01", 2), ["2026-07-15", "2026-10-15"]);
  assert.deepEqual(nextOccurrences({ every: 1, unit: "year" }, "2024-02-29", "2025-01-01", 3), ["2025-02-28", "2026-02-28", "2027-02-28"]);
  assert.deepEqual(nextOccurrences({ every: 2, unit: "week" }, "2026-09-01", "2026-09-30", 2), ["2026-10-13", "2026-10-27"]);
  assert.equal(nextOccurrences({ every: 1, unit: "month" }, "2020-05-10", "2026-09-30", 1)[0], "2026-10-10");
});

test("cycleAround finds the cycle a day sits in", () => {
  assert.deepEqual(cycleAround({ every: 1, unit: "month" }, "2026-01-15", "2026-09-30"), { start: "2026-09-15", end: "2026-10-15" });
  assert.deepEqual(cycleAround({ every: 1, unit: "month" }, "2026-01-15", "2026-09-15"), { start: "2026-09-15", end: "2026-10-15" });
});

test("prorate charges the days left, half up", () => {
  assert.equal(prorate(3000, "2026-09-01", "2026-10-01", "2026-09-16"), 1500);
  assert.equal(prorate(3000, "2026-09-01", "2026-10-01", "2026-09-01"), 3000);
  assert.equal(prorate(3000, "2026-09-01", "2026-10-01", "2026-10-01"), 0);
  assert.equal(prorate(1000, "2026-09-01", "2026-10-01", "2026-09-11"), 667); // 20 of 30 days
  assert.equal(prorate(3000, "2026-09-01", "2026-10-01", "2026-08-01"), 3000);
});

test("monthly equivalent and recurring totals", () => {
  assert.equal(cycleMonthlyEquivalent(12_000, { every: 1, unit: "year" }), 1000);
  assert.equal(cycleMonthlyEquivalent(3000, { every: 3, unit: "month" }), 1000);
  assert.equal(cycleMonthlyEquivalent(1000, { every: 1, unit: "week" }), 4333);
  assert.equal(
    monthlyRecurring([
      { amount: 12_000, cycle: { every: 1, unit: "year" }, status: "active" },
      { amount: 500, cycle: { every: 1, unit: "month" }, status: "active", quantity: 3 },
      { amount: 9999, cycle: { every: 1, unit: "month" }, status: "paused" },
    ]),
    2500,
  );
});
