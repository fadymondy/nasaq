import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alpha,
  cashBreakdown,
  clockLabel,
  countdownTone,
  deliveryMoney,
  formatAmountInput,
  parseAmountMinor,
  pinFocusIndex,
  routeSummary,
  sanitizePin,
  signTone,
  stepState,
  toArabicIndic,
  toLatinDigits,
} from "../src/logic.ts";

test("alpha appends a hex alpha channel to a 6-digit colour", () => {
  assert.equal(alpha("#4E9A3E", 0.5), "#4E9A3E80");
  assert.equal(alpha("#4E9A3E", 0), "#4E9A3E00");
  assert.equal(alpha("#4E9A3EFF", 1), "#4E9A3Eff");
  assert.equal(alpha("#4E9A3E", 7), "#4E9A3Eff");
});

test("digit conversion round-trips and ignores other characters", () => {
  assert.equal(toArabicIndic("$12.50"), "$١٢.٥٠");
  assert.equal(toLatinDigits("١٢٣٤"), "1234");
  assert.equal(toLatinDigits("۱۲۳"), "123");
  assert.equal(toLatinDigits(toArabicIndic("0987")), "0987");
});

test("signTone", () => {
  assert.deepEqual([signTone(5), signTone(-5), signTone(0)], ["success", "danger", "neutral"]);
});

test("sanitizePin keeps digits of any script and cuts to length", () => {
  assert.equal(sanitizePin("12a3 45", 4), "1234");
  assert.equal(sanitizePin("٤٥٦٧٨", 4), "4567");
  assert.equal(sanitizePin("", 4), "");
  assert.equal(pinFocusIndex("", 4), 0);
  assert.equal(pinFocusIndex("12", 4), 2);
  assert.equal(pinFocusIndex("1234", 4), 3);
});

test("parseAmountMinor reads what a courier types", () => {
  assert.equal(parseAmountMinor("12"), 1200);
  assert.equal(parseAmountMinor("12.5"), 1250);
  assert.equal(parseAmountMinor("12,50"), 1250);
  assert.equal(parseAmountMinor("١٢٫٥"), 1250);
  assert.equal(parseAmountMinor(".5"), 50);
  assert.equal(parseAmountMinor("0.07"), 7);
  assert.equal(parseAmountMinor(""), null);
  assert.equal(parseAmountMinor("abc"), null);
  assert.equal(parseAmountMinor("1000", "JPY"), 1000);
});

test("formatAmountInput is the inverse for the editable text", () => {
  assert.equal(formatAmountInput(1250), "12.5");
  assert.equal(formatAmountInput(1200), "12");
  assert.equal(formatAmountInput(null), "");
  for (const n of [0, 1, 99, 1234, 100000]) assert.equal(parseAmountMinor(formatAmountInput(n)), n);
});

test("stepState and clockLabel", () => {
  assert.deepEqual([0, 1, 2].map((i) => stepState(i, 1)), ["done", "current", "upcoming"]);
  assert.equal(clockLabel(75), "1:15");
  assert.equal(clockLabel(5.2), "0:06");
  assert.equal(clockLabel(-3), "0:00");
});

test("countdownTone turns danger at 10 seconds or fewer", () => {
  assert.equal(countdownTone(30, 30), "primary");
  assert.equal(countdownTone(12, 60), "warning");
  assert.equal(countdownTone(11, 30), "primary");
  assert.equal(countdownTone(10, 30), "danger");
  assert.equal(countdownTone(0, 30), "danger");
});

test("shared delivery maths is the web helpers", () => {
  assert.equal(cashBreakdown({ orderTotal: 5000, deliveryFee: 1000, collected: 7000 }).change, 1000);
  assert.equal(routeSummary([{ id: "a", kind: "pickup", status: "done" }, { id: "b", kind: "dropoff" }]).currentId, "b");
  assert.match(deliveryMoney(1250, "USD", "en"), /12\.50/);
});
