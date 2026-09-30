import assert from "node:assert/strict";
import { test } from "node:test";
import { attemptsLeft, pinAppend, pinBackspace, registerFailure, idleState, nextIdleCheck } from "../src/components/lock-screen/lock-model.ts";

test("pinAppend accepts digits up to the length", () => {
  assert.equal(pinAppend("", "4", 4), "4");
  assert.equal(pinAppend("123", "4", 4), "1234");
  assert.equal(pinAppend("1234", "5", 4), "1234");
  assert.equal(pinAppend("12", "a", 4), "12");
  assert.equal(pinAppend("12", "٣", 4), "12");
});

test("pinBackspace", () => {
  assert.equal(pinBackspace("123"), "12");
  assert.equal(pinBackspace(""), "");
});

test("registerFailure locks out at the limit and resets", () => {
  assert.deepEqual(registerFailure(0, 3), { failures: 1, lockedOut: false });
  assert.deepEqual(registerFailure(1, 3), { failures: 2, lockedOut: false });
  assert.deepEqual(registerFailure(2, 3), { failures: 0, lockedOut: true });
});

test("attemptsLeft never goes negative", () => {
  assert.equal(attemptsLeft(2, 5), 3);
  assert.equal(attemptsLeft(9, 5), 0);
});

test("idleState moves active to warning to locked", () => {
  assert.deepEqual(idleState(0, 300000, 30000), { phase: "active", secondsLeft: 30 });
  assert.deepEqual(idleState(269000, 300000, 30000), { phase: "active", secondsLeft: 30 });
  assert.deepEqual(idleState(270000, 300000, 30000), { phase: "warning", secondsLeft: 30 });
  assert.deepEqual(idleState(290500, 300000, 30000), { phase: "warning", secondsLeft: 10 });
  assert.deepEqual(idleState(300000, 300000, 30000), { phase: "locked", secondsLeft: 0 });
  assert.equal(idleState(1000, 300000, 0).phase, "active");
  assert.equal(idleState(-5, 1000, 5000).phase, "warning");
});

test("nextIdleCheck waits for the next phase change or tick", () => {
  assert.equal(nextIdleCheck(0, 300000, 30000), 270000);
  assert.equal(nextIdleCheck(270000, 300000, 30000), 1000);
  assert.equal(nextIdleCheck(290500, 300000, 30000), 500);
  assert.equal(nextIdleCheck(300000, 300000, 30000), 0);
});
