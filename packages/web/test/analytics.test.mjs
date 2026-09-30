import assert from "node:assert/strict";
import { test } from "node:test";
import { errorRate, percentile, spanDepths, statusClass, traceExtent } from "../src/components/apm-panels/apm-math.ts";
import { aggregate, changeRatio, clickThroughRate, flagEmoji, formatMillis, formatSeconds, parseAnalyticsDay, shares } from "../src/components/metric-tiles/analytics-math.ts";
import { gaugeFraction, normalizeDistribution, passesCoreWebVitals, rateVital, vitalBands, vitalDisplay, worstRating } from "../src/components/web-vital-gauge/web-vitals-math.ts";

test("Core Web Vitals ratings follow Google's thresholds, with the boundary itself counting as good", () => {
  assert.equal(rateVital("LCP", 2500), "good");
  assert.equal(rateVital("LCP", 2501), "needs-improvement");
  assert.equal(rateVital("LCP", 4000), "needs-improvement");
  assert.equal(rateVital("LCP", 4001), "poor");
  assert.equal(rateVital("INP", 200), "good");
  assert.equal(rateVital("INP", 500), "needs-improvement");
  assert.equal(rateVital("INP", 501), "poor");
  assert.equal(rateVital("CLS", 0.1), "good");
  assert.equal(rateVital("CLS", 0.25), "needs-improvement");
  assert.equal(rateVital("CLS", 0.26), "poor");
  assert.equal(rateVital("FCP", 1800), "good");
  assert.equal(rateVital("FCP", 3001), "poor");
  assert.equal(rateVital("TTFB", 800), "good");
  assert.equal(rateVital("TTFB", 1801), "poor");
});

test("gauge position is clamped and the bands sit on the thresholds", () => {
  assert.equal(gaugeFraction("LCP", -5), 0);
  assert.equal(gaugeFraction("LCP", Number.NaN), 0);
  assert.equal(gaugeFraction("LCP", 1e9), 1);
  const bands = vitalBands("LCP");
  assert.ok(Math.abs(bands.good - 2500 / 6000) < 1e-9);
  assert.ok(Math.abs(bands.poor - 4000 / 6000) < 1e-9);
});

test("vital values display in seconds, milliseconds or as a plain score", () => {
  assert.deepEqual(vitalDisplay("LCP", 2900), { value: 2.9, unit: "s", fractionDigits: 2 });
  assert.deepEqual(vitalDisplay("INP", 182.4), { value: 182, unit: "ms", fractionDigits: 0 });
  assert.deepEqual(vitalDisplay("CLS", 0.08), { value: 0.08, unit: "", fractionDigits: 2 });
});

test("distributions normalise to fractions and ignore negatives", () => {
  assert.deepEqual(normalizeDistribution({ good: 60, needsImprovement: 30, poor: 10 }), { good: 0.6, needsImprovement: 0.3, poor: 0.1 });
  assert.deepEqual(normalizeDistribution({ good: 0, needsImprovement: 0, poor: 0 }), { good: 0, needsImprovement: 0, poor: 0 });
  assert.deepEqual(normalizeDistribution({ good: -4, needsImprovement: 1, poor: 1 }), { good: 0, needsImprovement: 0.5, poor: 0.5 });
});

test("a page passes Core Web Vitals only when LCP, INP and CLS are all good", () => {
  assert.equal(passesCoreWebVitals({ LCP: 2400, INP: 190, CLS: 0.09 }), true);
  assert.equal(passesCoreWebVitals({ LCP: 2600, INP: 190, CLS: 0.09 }), false);
  assert.equal(passesCoreWebVitals({ LCP: 2400, INP: 190 }), false);
  assert.equal(worstRating(["good", "poor", "needs-improvement"]), "poor");
  assert.equal(worstRating(["good", "needs-improvement"]), "needs-improvement");
  assert.equal(worstRating([]), "good");
});

test("percentiles interpolate and cope with empty and unsorted input", () => {
  assert.equal(percentile([], 95), 0);
  assert.equal(percentile([5], 99), 5);
  assert.equal(percentile([40, 10, 30, 20], 50), 25);
  assert.equal(percentile([10, 20, 30, 40, 50], 0), 10);
  assert.equal(percentile([10, 20, 30, 40, 50], 100), 50);
  assert.equal(percentile([10, 20, 30, 40, 50], 250), 50);
});

test("error rate, status classes and span nesting", () => {
  assert.equal(errorRate(5, 200), 0.025);
  assert.equal(errorRate(3, 0), 0);
  assert.equal(statusClass(204), "2xx");
  assert.equal(statusClass(302), "3xx");
  assert.equal(statusClass(404), "4xx");
  assert.equal(statusClass(503), "5xx");
  assert.equal(statusClass(101), "other");
  const spans = [
    { id: "a", startMs: 0, durationMs: 100 },
    { id: "b", parentId: "a", startMs: 10, durationMs: 30 },
    { id: "c", parentId: "b", startMs: 12, durationMs: 5 },
    { id: "x", parentId: "missing", startMs: 50, durationMs: 90 },
    { id: "p", parentId: "q", startMs: 0, durationMs: 1 },
    { id: "q", parentId: "p", startMs: 0, durationMs: 1 },
  ];
  const depths = spanDepths(spans);
  assert.equal(depths.get("a"), 0);
  assert.equal(depths.get("b"), 1);
  assert.equal(depths.get("c"), 2);
  assert.equal(depths.get("x"), 0);
  assert.ok(depths.has("p") && depths.has("q"));
  assert.equal(traceExtent(spans.slice(0, 4)), 140);
  assert.equal(traceExtent([]), 0);
});

test("change ratio guards zero and missing baselines", () => {
  assert.ok(Math.abs(changeRatio(112.4, 100) - 0.124) < 1e-9);
  assert.equal(changeRatio(50, 100), -0.5);
  assert.equal(changeRatio(5, undefined), undefined);
  assert.equal(changeRatio(5, 0), undefined);
  assert.equal(changeRatio(0, 0), 0);
  assert.equal(changeRatio(Number.NaN, 4), undefined);
});

test("aggregation, shares and click-through rate", () => {
  assert.equal(aggregate([1, 2, 3, 4]), 10);
  assert.equal(aggregate([1, 2, 3, 4], "avg"), 2.5);
  assert.equal(aggregate([], "avg"), 0);
  assert.deepEqual(shares([1, 1, 2]), [0.25, 0.25, 0.5]);
  assert.deepEqual(shares([0, 0]), [0, 0]);
  assert.equal(clickThroughRate(34, 1000), 0.034);
  assert.equal(clickThroughRate(5, 0), 0);
});

test("durations and latencies format in English and Arabic", () => {
  assert.equal(formatSeconds(48), "48s");
  assert.equal(formatSeconds(134), "2m 14s");
  assert.equal(formatSeconds(3900), "1h 05m");
  assert.equal(formatSeconds(134, true), "2د 14ث");
  assert.equal(formatMillis(12), "12 ms");
  assert.equal(formatMillis(1240), "1.24 s");
  assert.equal(formatMillis(12000), "12.0 s");
  assert.equal(formatMillis(250, true), "250 مللي ث");
});

test("flags need an ISO alpha-2 code and day strings stay on their local day", () => {
  assert.equal(flagEmoji("SA"), "\u{1F1F8}\u{1F1E6}");
  assert.equal(flagEmoji("sa"), "\u{1F1F8}\u{1F1E6}");
  assert.equal(flagEmoji("KSA"), "");
  assert.equal(flagEmoji(""), "");
  const d = parseAnalyticsDay("2026-09-29");
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 8, 29]);
});
