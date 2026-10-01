import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cashBreakdown,
  deliveryDistance,
  deliveryDuration,
  deliveryMinorFactor,
  deliveryMoney,
  deliveryProgress,
  offerFraction,
  offerSecondsLeft,
  offerTone,
  routeSummary,
} from "../src/lib/delivery.ts";

test("minor factor follows the currency", () => {
  assert.equal(deliveryMinorFactor("ILS"), 100);
  assert.equal(deliveryMinorFactor("JPY"), 1);
  assert.equal(deliveryMinorFactor("KWD"), 1000);
  assert.equal(deliveryMinorFactor("not-a-code"), 100);
});

test("money is formatted from minor units with Latin digits", () => {
  const en = deliveryMoney(12550, "ILS", "en");
  assert.match(en, /125\.50/);
  const ar = deliveryMoney(12550, "ILS", "ar");
  assert.match(ar, /125\.50|125٫50/);
  assert.doesNotMatch(ar, /[٠-٩]/);
});

test("distance and duration", () => {
  assert.equal(deliveryDistance(850, "en"), "850 m");
  assert.equal(deliveryDistance(1240, "en"), "1.2 km");
  assert.equal(deliveryDistance(12400, "en"), "12 km");
  assert.equal(deliveryDistance(850, "ar"), "850 م");
  assert.equal(deliveryDuration(0, "en"), "1 min");
  assert.equal(deliveryDuration(61, "en"), "2 min");
  assert.equal(deliveryDuration(3900, "en"), "1 h 5 min");
  assert.equal(deliveryDuration(3600, "en"), "1 h");
  assert.equal(deliveryDuration(600, "ar"), "10 د");
});

test("progress marks done, current and upcoming", () => {
  const p = deliveryProgress("picked-up");
  assert.deepEqual(
    p.steps.map((s) => s.state),
    ["done", "done", "current", "upcoming", "upcoming"],
  );
  assert.equal(p.current, 2);
  assert.equal(p.fraction, 0.5);
  assert.equal(p.terminal, undefined);
});

test("delivered has every step done", () => {
  const p = deliveryProgress("delivered");
  assert.ok(p.steps.every((s) => s.state === "done"));
  assert.equal(p.current, -1);
  assert.equal(p.fraction, 1);
});

test("cancelled keeps what was reached and stops at the next step", () => {
  const p = deliveryProgress("cancelled", "assigned");
  assert.deepEqual(
    p.steps.map((s) => s.state),
    ["done", "done", "stopped", "upcoming", "upcoming"],
  );
  assert.equal(p.terminal, "cancelled");
  assert.equal(deliveryProgress("failed").steps[1].state, "stopped");
});

test("offer countdown", () => {
  assert.equal(offerSecondsLeft(10_000, 4_500), 6);
  assert.equal(offerSecondsLeft(10_000, 12_000), 0);
  assert.equal(offerFraction(30_000, 0, 30), 1);
  assert.equal(offerFraction(30_000, 15_000, 30), 0.5);
  assert.equal(offerFraction(30_000, 40_000, 30), 0);
  assert.equal(offerFraction(30_000, 0, 0), 0);
  assert.equal(offerTone(20, 30), "primary");
  assert.equal(offerTone(7, 30), "warning");
  assert.equal(offerTone(5, 30), "danger");
});

test("route summary finds the current stop and the cash", () => {
  const s = routeSummary([
    { id: "a", kind: "pickup", status: "done" },
    { id: "b", kind: "dropoff", status: "done", cashMinor: 5000 },
    { id: "c", kind: "pickup" },
    { id: "d", kind: "dropoff", cashMinor: 7000 },
    { id: "e", kind: "dropoff", status: "failed", cashMinor: 900 },
    { id: "f", kind: "dropoff", cashMinor: 1500 },
  ]);
  assert.equal(s.total, 6);
  assert.equal(s.done, 2);
  assert.equal(s.currentId, "c");
  assert.equal(s.cashPendingMinor, 8500);
  assert.equal(s.cashCollectedMinor, 5000);
  assert.equal(routeSummary([]).currentId, undefined);
});

test("cash on delivery collects total plus fee", () => {
  const base = { orderTotal: 8500, deliveryFee: 1500 };
  assert.deepEqual(cashBreakdown(base), { due: 10000, collected: 0, shortBy: 10000, change: 0, state: "unpaid" });
  assert.equal(cashBreakdown({ ...base, collected: 10000 }).state, "exact");
  const short = cashBreakdown({ ...base, collected: 9000 });
  assert.equal(short.state, "short");
  assert.equal(short.shortBy, 1000);
  const over = cashBreakdown({ ...base, collected: 20000 });
  assert.equal(over.state, "over");
  assert.equal(over.change, 10000);
});

test("prepaid reduces the amount due and never goes negative", () => {
  assert.equal(cashBreakdown({ orderTotal: 8500, deliveryFee: 1500, prepaid: 8500 }).due, 1500);
  const all = cashBreakdown({ orderTotal: 8500, deliveryFee: 1500, prepaid: 12000 });
  assert.equal(all.due, 0);
  assert.equal(all.state, "exact");
});

test("fractional input is rounded to whole minor units", () => {
  assert.equal(cashBreakdown({ orderTotal: 100.4, deliveryFee: 0.4, collected: 100.6 }).collected, 101);
});
