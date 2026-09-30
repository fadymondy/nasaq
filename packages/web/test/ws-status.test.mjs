import assert from "node:assert/strict";
import { test } from "node:test";
import { backoffDelay, formatCountdown, formatLatency, latencyQuality, secondsUntil, signalBars } from "../src/components/ws-status/ws-status-format.ts";

test("latencyQuality thresholds", () => {
  assert.equal(latencyQuality(40), "good");
  assert.equal(latencyQuality(150), "good");
  assert.equal(latencyQuality(151), "fair");
  assert.equal(latencyQuality(400), "fair");
  assert.equal(latencyQuality(900), "poor");
});

test("formatLatency", () => {
  assert.equal(formatLatency(42.4), "42 ms");
  assert.equal(formatLatency(1200), "1.2 s");
  assert.equal(formatLatency(2000), "2 s");
  assert.equal(formatLatency(-1), "-");
  assert.equal(formatLatency(Number.NaN), "-");
});

test("secondsUntil rounds up and never goes negative", () => {
  assert.equal(secondsUntil(10_500, 10_000), 1);
  assert.equal(secondsUntil(15_000, 10_000), 5);
  assert.equal(secondsUntil(9_000, 10_000), 0);
  assert.equal(secondsUntil("2026-09-29T10:00:30Z", "2026-09-29T10:00:00Z"), 30);
});

test("backoffDelay doubles and caps", () => {
  assert.equal(backoffDelay(1), 1000);
  assert.equal(backoffDelay(2), 2000);
  assert.equal(backoffDelay(4), 8000);
  assert.equal(backoffDelay(10), 30_000);
  assert.equal(backoffDelay(0), 1000);
  assert.equal(backoffDelay(3, 500, 1500), 1500);
});

test("formatCountdown", () => {
  assert.equal(formatCountdown(7), "0:07");
  assert.equal(formatCountdown(65), "1:05");
  assert.equal(formatCountdown(-3), "0:00");
});

test("signalBars", () => {
  assert.equal(signalBars(undefined), 0);
  assert.equal(signalBars(50), 3);
  assert.equal(signalBars(300), 2);
  assert.equal(signalBars(800), 1);
});
