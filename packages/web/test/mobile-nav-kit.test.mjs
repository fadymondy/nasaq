import assert from "node:assert/strict";
import { test } from "node:test";
import { centerScroll, clampSwipe, isHorizontalIntent, nextTabIndex, restOffset, settleSwipe, toInlineOffset } from "../src/components/mobile-nav-kit/mobile-nav-math.ts";

test("toInlineOffset flips in RTL", () => {
  assert.equal(toInlineOffset(30, false), 30);
  assert.equal(toInlineOffset(30, true), -30);
});

test("clampSwipe passes through, resists past the edge and on empty sides", () => {
  assert.equal(clampSwipe(40, 80, 80), 40);
  assert.equal(clampSwipe(120, 80, 80), 90);
  assert.equal(clampSwipe(-120, 80, 80), -90);
  assert.equal(clampSwipe(40, 0, 80), 10);
  assert.equal(clampSwipe(-40, 80, 0), -10);
});

test("settleSwipe opens past the threshold or on a flick", () => {
  assert.equal(settleSwipe(20, 80, 80), "closed");
  assert.equal(settleSwipe(40, 80, 80), "start");
  assert.equal(settleSwipe(-40, 80, 80), "end");
  assert.equal(settleSwipe(10, 80, 80, { velocity: 0.9 }), "start");
  assert.equal(settleSwipe(-10, 80, 80, { velocity: -0.9 }), "end");
  assert.equal(settleSwipe(60, 0, 80), "closed");
});

test("restOffset", () => {
  assert.equal(restOffset("start", 80, 60), 80);
  assert.equal(restOffset("end", 80, 60), -60);
  assert.equal(restOffset("closed", 80, 60), 0);
});

test("isHorizontalIntent", () => {
  assert.equal(isHorizontalIntent(10, 2), true);
  assert.equal(isHorizontalIntent(3, 0), false);
  assert.equal(isHorizontalIntent(10, 12), false);
});

test("nextTabIndex wraps and mirrors in RTL", () => {
  assert.equal(nextTabIndex(0, 4, "ArrowRight", false), 1);
  assert.equal(nextTabIndex(0, 4, "ArrowLeft", false), 3);
  assert.equal(nextTabIndex(0, 4, "ArrowLeft", true), 1);
  assert.equal(nextTabIndex(3, 4, "ArrowRight", false), 0);
  assert.equal(nextTabIndex(1, 4, "End", false), 3);
  assert.equal(nextTabIndex(1, 4, "a", false), null);
});

test("centerScroll clamps", () => {
  assert.equal(centerScroll(0, 40, 300, 900), 0);
  assert.equal(centerScroll(400, 40, 300, 900), 270);
  assert.equal(centerScroll(880, 40, 300, 900), 600);
});
