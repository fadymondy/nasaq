import assert from "node:assert/strict";
import { test } from "node:test";
import { canSubmitReceipt, isFinalVerification, normalizeReference, paymentFee, paymentLimit, paymentTotal, referenceProblem, verificationStep } from "../src/components/local-payments/payment-logic.ts";

test("paymentFee rounds the percentage half up and adds the flat fee", () => {
  assert.equal(paymentFee(10_000, { percentBps: 150 }), 150);
  assert.equal(paymentFee(10_001, { percentBps: 150 }), 150); // 150.015
  assert.equal(paymentFee(10_034, { percentBps: 150 }), 151); // 150.51
  assert.equal(paymentFee(10_000, { percentBps: 100, fixed: 200 }), 300);
  assert.equal(paymentFee(0, { percentBps: 100, fixed: 200 }), 0);
  assert.equal(paymentFee(10_000), 0);
  assert.equal(paymentTotal(10_000, { percentBps: 250 }), 10_250);
});

test("paymentLimit is inclusive", () => {
  assert.equal(paymentLimit(500, { min: 500, max: 1000 }), null);
  assert.equal(paymentLimit(499, { min: 500 }), "min");
  assert.equal(paymentLimit(1001, { max: 1000 }), "max");
  assert.equal(paymentLimit(5), null);
});

test("references are normalised and checked", () => {
  assert.equal(normalizeReference("  ab-١٢٣٤٥٦ "), "AB-123456");
  assert.equal(referenceProblem(""), "empty");
  assert.equal(referenceProblem("AB1"), "short");
  assert.equal(referenceProblem("AB 1234"), "chars");
  assert.equal(referenceProblem("ip-448120"), null);
  assert.equal(referenceProblem("AB1", 3), null);
});

test("verification steps", () => {
  assert.equal(verificationStep("unpaid"), -1);
  assert.equal(verificationStep("submitted"), 0);
  assert.equal(verificationStep("verifying"), 1);
  assert.equal(verificationStep("rejected"), 1);
  assert.equal(verificationStep("verified"), 2);
  assert.equal(canSubmitReceipt("unpaid"), true);
  assert.equal(canSubmitReceipt("rejected"), true);
  assert.equal(canSubmitReceipt("verifying"), false);
  assert.equal(isFinalVerification("verified"), true);
  assert.equal(isFinalVerification("submitted"), false);
});
