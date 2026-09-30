import assert from "node:assert/strict";
import test from "node:test";
import { barHeights, clampLevel, formatCallTime, levelFromSamples, pushLevel, quantizeLevel } from "../src/components/voice-call-overlay/voice-call-math.ts";

test("clampLevel keeps 0..1 and treats junk as silence", () => {
  assert.equal(clampLevel(0.4), 0.4);
  assert.equal(clampLevel(3), 1);
  assert.equal(clampLevel(-1), 0);
  assert.equal(clampLevel(undefined), 0);
  assert.equal(clampLevel(Number.NaN), 0);
});

test("pushLevel keeps a fixed length and does not mutate", () => {
  const h = [0.1, 0.2, 0.3];
  assert.deepEqual(pushLevel(h, 0.9, 3), [0.2, 0.3, 0.9]);
  assert.deepEqual(h, [0.1, 0.2, 0.3]);
  assert.deepEqual(pushLevel([], 0.5, 3), [0, 0, 0.5]);
});

test("quantizeLevel rounds to steps", () => {
  assert.equal(quantizeLevel(0.3, 4), 0.25);
  assert.equal(quantizeLevel(0.9, 4), 1);
  assert.equal(quantizeLevel(0.51, 2), 0.5);
});

test("barHeights is symmetric, floored, and loudest in the middle", () => {
  const h = barHeights([0, 0, 1], 7, 0.1);
  assert.equal(h.length, 7);
  assert.deepEqual(h, [...h].reverse());
  assert.ok(h[3] > h[0]);
  assert.ok(h.every((v) => v >= 0.1 && v <= 1));
});

test("levelFromSamples reads float and byte samples", () => {
  assert.equal(levelFromSamples([]), 0);
  assert.equal(levelFromSamples(new Float32Array([0, 0, 0])), 0);
  assert.equal(levelFromSamples(new Uint8Array([128, 128, 128])), 0);
  assert.ok(levelFromSamples(new Float32Array([0.5, -0.5, 0.5, -0.5])) > 0.5);
  assert.equal(levelFromSamples(new Float32Array([1, -1, 1, -1])), 1);
  assert.ok(levelFromSamples(new Uint8Array([255, 0, 255, 0])) > 0.9);
});

test("formatCallTime", () => {
  assert.equal(formatCallTime(0), "0:00");
  assert.equal(formatCallTime(65), "1:05");
  assert.equal(formatCallTime(3725), "1:02:05");
  assert.equal(formatCallTime(-4), "0:00");
});
