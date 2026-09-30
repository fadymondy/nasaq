import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptAll, consentModeSignals, consentSource, DEFAULT_CONSENT_CATEGORIES as C, normalizeConsent, rejectAll } from "../src/components/cookie-consent/consent-model.ts";

test("acceptAll and rejectAll", () => {
  assert.deepEqual(acceptAll(C), { necessary: true, preferences: true, analytics: true, marketing: true });
  assert.deepEqual(rejectAll(C), { necessary: true, preferences: false, analytics: false, marketing: false });
});

test("normalizeConsent forces required on and fills missing as off", () => {
  assert.deepEqual(normalizeConsent(C, { necessary: false, analytics: true }), { necessary: true, preferences: false, analytics: true, marketing: false });
  assert.deepEqual(normalizeConsent(C, null), rejectAll(C));
});

test("consentSource names the choice", () => {
  assert.equal(consentSource(C, acceptAll(C)), "accept-all");
  assert.equal(consentSource(C, rejectAll(C)), "reject-all");
  assert.equal(consentSource(C, { analytics: true }), "custom");
});

test("consentModeSignals maps categories to Consent Mode keys", () => {
  const rejected = consentModeSignals(rejectAll(C));
  assert.equal(rejected.security_storage, "granted");
  assert.equal(rejected.analytics_storage, "denied");
  assert.equal(rejected.ad_storage, "denied");
  const analytics = consentModeSignals({ analytics: true });
  assert.equal(analytics.analytics_storage, "granted");
  assert.equal(analytics.ad_user_data, "denied");
  const all = consentModeSignals(acceptAll(C));
  assert.ok(Object.values(all).every((v) => v === "granted"));
});
