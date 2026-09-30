import assert from "node:assert/strict";
import { test } from "node:test";
import { nextTrickle } from "../src/components/route-progress/route-progress-math.ts";

test("nextTrickle moves forward and slows down", () => {
  assert.ok(nextTrickle(6) > 6);
  assert.ok(nextTrickle(10) - 10 > nextTrickle(60) - 60);
});

test("nextTrickle never reaches 100", () => {
  let v = 0;
  for (let i = 0; i < 500; i++) v = nextTrickle(v);
  assert.equal(v, 94);
  assert.equal(nextTrickle(99), 99);
});
