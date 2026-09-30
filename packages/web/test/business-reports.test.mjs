import assert from "node:assert/strict";
import { test } from "node:test";
import { attainment, kpiStatus, marginBand, median, pipelineRows, profitMargin, profitTotals, slaRate, winRate } from "../src/components/business-reports/business-reports-math.ts";

test("margin is profit over revenue and null without revenue", () => {
  assert.equal(profitMargin(200, 150), 0.25);
  assert.equal(profitMargin(100, 130), -0.3);
  assert.equal(profitMargin(0, 10), null);
});

test("totals add up and count losing rows", () => {
  const t = profitTotals([{ revenue: 100, cost: 60 }, { revenue: 50, cost: 80 }]);
  assert.deepEqual(t, { revenue: 150, cost: 140, profit: 10, margin: 10 / 150, losing: 1 });
});

test("margin bands", () => {
  assert.equal(marginBand(-0.01), "loss");
  assert.equal(marginBand(0.1), "thin");
  assert.equal(marginBand(0.15), "healthy");
  assert.equal(marginBand(null), "thin");
});

test("attainment and status", () => {
  assert.equal(attainment(45, 60), 0.75);
  assert.equal(attainment(5, 0), 0);
  assert.equal(kpiStatus(1.02), "ahead");
  assert.equal(kpiStatus(0.8), "on-track");
  assert.equal(kpiStatus(0.79), "behind");
});

test("pipeline conversion from previous and first stage", () => {
  const rows = pipelineRows([
    { id: "a", count: 100, value: 1000 },
    { id: "b", count: 50, value: 900 },
    { id: "c", count: 10, value: 400, won: true },
  ]);
  assert.equal(rows[0].fromPrevious, 1);
  assert.equal(rows[1].fromPrevious, 0.5);
  assert.equal(rows[2].fromFirst, 0.1);
  assert.equal(rows[2].average, 40);
  assert.equal(winRate(rows.map((r) => r.stage)), 0.1);
  assert.equal(winRate([]), 0);
});

test("median and sla rate", () => {
  assert.equal(median([5, 1, 9]), 5);
  assert.equal(median([1, 2, 3, 10]), 2.5);
  assert.equal(median([]), 0);
  assert.equal(slaRate(9, 12), 0.75);
  assert.equal(slaRate(1, 0), 0);
});
