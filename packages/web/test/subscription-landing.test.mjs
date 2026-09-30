import assert from "node:assert/strict";
import test from "node:test";
import { isSubscriberEmail, maskSubscriberEmail, validateSubscription } from "../src/components/subscription-landing/subscription-landing-logic.ts";

test("email shape", () => {
  assert.equal(isSubscriberEmail(" sara@example.com "), true);
  assert.equal(isSubscriberEmail("sara@example"), false);
  assert.equal(isSubscriberEmail("sara example@x.io"), false);
});

test("masking", () => {
  assert.equal(maskSubscriberEmail("sara@example.com"), "s***@example.com");
  assert.equal(maskSubscriberEmail("nope"), "nope");
  assert.equal(maskSubscriberEmail("@x.io"), "@x.io");
});

test("validation", () => {
  assert.deepEqual(validateSubscription({ email: "", consent: false }), ["email-empty", "consent-missing"]);
  assert.deepEqual(validateSubscription({ email: "a@b", consent: true }), ["email-invalid"]);
  assert.deepEqual(validateSubscription({ email: "a@b.co", consent: true }), []);
  assert.deepEqual(validateSubscription({ email: "a@b.co", consent: false, requireConsent: false }), []);
});
