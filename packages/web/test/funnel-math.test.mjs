import assert from "node:assert/strict";
import test from "node:test";
import { barWidth, biggestDropIndex, funnelRows, insertStep, moveStep, overallConversion, removeStep, windowKey, windowMs } from "../src/components/funnel-chart/funnel-math.ts";

const steps = [
  { id: "a", label: "Visit", count: 1000 },
  { id: "b", label: "Signup", count: 400 },
  { id: "c", label: "Trial", count: 300 },
  { id: "d", label: "Paid", count: 60 },
];

test("funnelRows: conversion from previous and first, drop-off", () => {
  const rows = funnelRows(steps);
  assert.equal(rows[0].fromPrevious, 1);
  assert.equal(rows[0].dropped, 0);
  assert.equal(rows[1].fromPrevious, 0.4);
  assert.equal(rows[1].dropped, 600);
  assert.ok(Math.abs(rows[1].dropRate - 0.6) < 1e-9);
  assert.equal(rows[2].fromPrevious, 0.75);
  assert.equal(rows[2].fromFirst, 0.3);
  assert.equal(rows[3].fromPrevious, 0.2);
  assert.equal(rows[3].fromFirst, 0.06);
});

test("funnelRows never goes negative when a step is bigger than the one before", () => {
  const rows = funnelRows([{ id: "a", label: "A", count: 100 }, { id: "b", label: "B", count: 150 }]);
  assert.equal(rows[1].dropped, 0);
  assert.equal(rows[1].fromPrevious, 1);
});

test("funnelRows handles empty and zero funnels", () => {
  assert.deepEqual(funnelRows([]), []);
  const rows = funnelRows([{ id: "a", label: "A", count: 0 }, { id: "b", label: "B", count: 0 }]);
  assert.equal(rows[1].fromPrevious, 0);
  assert.equal(rows[1].dropRate, 0);
});

test("overallConversion is last over first", () => {
  assert.equal(overallConversion(steps), 0.06);
  assert.equal(overallConversion([]), 0);
  assert.equal(overallConversion([{ id: "a", label: "A", count: 5 }]), 1);
  assert.equal(overallConversion([{ id: "a", label: "A", count: 0 }, { id: "b", label: "B", count: 0 }]), 0);
});

test("biggestDropIndex finds the leakiest step", () => {
  assert.equal(biggestDropIndex(steps), 3);
  assert.equal(biggestDropIndex([{ id: "a", label: "A", count: 10 }, { id: "b", label: "B", count: 10 }]), -1);
  assert.equal(biggestDropIndex([]), -1);
});

test("barWidth is proportional with a visible minimum", () => {
  assert.equal(barWidth(500, 1000), 0.5);
  assert.equal(barWidth(1, 1000), 0.03);
  assert.equal(barWidth(0, 1000), 0);
  assert.equal(barWidth(10, 0), 0);
  assert.equal(barWidth(2000, 1000), 1);
});

test("window helpers", () => {
  assert.equal(windowMs({ amount: 2, unit: "day" }), 172_800_000);
  assert.equal(windowMs({ amount: 0, unit: "hour" }), 3_600_000);
  assert.equal(windowKey({ amount: 7, unit: "day" }), "7d");
  assert.equal(windowKey({ amount: 24, unit: "hour" }), "24h");
  assert.equal(windowKey({ amount: 2, unit: "week" }), "2w");
});

test("moveStep, insertStep and removeStep return new arrays", () => {
  const list = ["a", "b", "c"];
  assert.deepEqual(moveStep(list, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveStep(list, 2, 0), ["c", "a", "b"]);
  assert.deepEqual(moveStep(list, 5, 0), list);
  assert.deepEqual(insertStep(list, "x"), ["a", "b", "c", "x"]);
  assert.deepEqual(insertStep(list, "x", 1), ["a", "x", "b", "c"]);
  assert.deepEqual(removeStep(list, 1), ["a", "c"]);
  assert.deepEqual(list, ["a", "b", "c"]);
});
