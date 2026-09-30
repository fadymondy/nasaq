import assert from "node:assert/strict";
import test from "node:test";
import { contactIdentityKey, mergeContactConsent, normalizeContactIdentity, sortContactIdentities, validateContactIdentity } from "../src/components/contact-identities/contact-identities-logic.ts";

test("normalizes per channel", () => {
  assert.equal(normalizeContactIdentity("email", " Sara@Example.com "), "sara@example.com");
  assert.equal(normalizeContactIdentity("whatsapp", "+966 50 123-4567"), "966501234567");
  assert.equal(normalizeContactIdentity("telegram", "@Layla_Ops"), "layla_ops");
  assert.equal(contactIdentityKey("phone", "0501234567"), "phone:0501234567");
});

test("validates a new account", () => {
  assert.equal(validateContactIdentity("email", ""), "empty");
  assert.equal(validateContactIdentity("email", "nope"), "email");
  assert.equal(validateContactIdentity("whatsapp", "123"), "phone");
  assert.equal(validateContactIdentity("telegram", "@a"), null);
  assert.equal(validateContactIdentity("email", "A@b.co", [{ channel: "email", value: "a@b.co" }]), "duplicate");
  assert.equal(validateContactIdentity("phone", "+20 101 234 5678", [{ channel: "whatsapp", value: "+201012345678" }]), null);
});

test("consent merge: a refusal wins, then a grant", () => {
  assert.equal(mergeContactConsent(["granted", "denied"]), "denied");
  assert.equal(mergeContactConsent(["unknown", "granted"]), "granted");
  assert.equal(mergeContactConsent([undefined]), "unknown");
  assert.equal(mergeContactConsent([]), "unknown");
});

test("sorts by channel then primary first", () => {
  const list = sortContactIdentities([
    { channel: "phone", id: 1 },
    { channel: "email", id: 2 },
    { channel: "email", id: 3, primary: true },
  ]);
  assert.deepEqual(list.map((i) => i.id), [3, 2, 1]);
});
