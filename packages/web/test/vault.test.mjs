import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, expiryState, groupSecrets, matchesSecret, VAULT_MASK } from "../src/components/vault/vault-format.ts";

const DAY = 86_400_000;
const now = Date.UTC(2026, 0, 10);

test("mask is fixed length and hides length", () => {
  assert.equal(VAULT_MASK.length, 12);
});

test("groupSecrets sorts groups and names, blank group last", () => {
  const items = [
    { group: "Stripe", name: "webhook" },
    { group: "", name: "misc" },
    { group: "AWS", name: "key 10" },
    { group: "AWS", name: "key 2" },
  ];
  const out = groupSecrets(items);
  assert.deepEqual(out.map((g) => g.group), ["AWS", "Stripe", ""]);
  assert.deepEqual(out[0].items.map((i) => i.name), ["key 2", "key 10"]);
});

test("expiryState", () => {
  assert.equal(expiryState(undefined, now), "none");
  assert.equal(expiryState("", now), "none");
  assert.equal(expiryState("nope", now), "none");
  assert.equal(expiryState(now - 1, now), "expired");
  assert.equal(expiryState(now + 3 * DAY, now), "soon");
  assert.equal(expiryState(now + 60 * DAY, now), "ok");
  assert.equal(expiryState(now + 20 * DAY, now, 30), "soon");
});

test("daysUntil rounds toward the future", () => {
  assert.equal(daysUntil(now + 2.2 * DAY, now), 3);
  assert.equal(daysUntil(now - 2 * DAY, now), -2);
});

test("matchesSecret checks fields only", () => {
  const s = { name: "STRIPE_KEY", group: "Billing", description: "Live mode" };
  assert.equal(matchesSecret(s, ""), true);
  assert.equal(matchesSecret(s, "stripe"), true);
  assert.equal(matchesSecret(s, "billing"), true);
  assert.equal(matchesSecret(s, "live"), true);
  assert.equal(matchesSecret(s, "sk_live"), false);
});
