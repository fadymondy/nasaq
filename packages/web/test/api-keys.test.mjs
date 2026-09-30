import assert from "node:assert/strict";
import { test } from "node:test";
import { daysLeft, expiryFromDays, keyStatus, maskKey, toggleScope } from "../src/components/api-keys/format.ts";

const DAY = 86_400_000;
const now = Date.UTC(2026, 8, 29);

test("maskKey shows the prefix and last four only", () => {
  assert.equal(maskKey("nsq_live_a1b2", "wxyz"), "nsq_live_a1b2••••••••wxyz");
  assert.equal(maskKey("nsq_", undefined, 4), "nsq_••••");
});

test("keyStatus orders revoked, expired, expiring, active", () => {
  assert.equal(keyStatus({ revokedAt: now - DAY, expiresAt: now + 30 * DAY }, now), "revoked");
  assert.equal(keyStatus({ expiresAt: now - 1 }, now), "expired");
  assert.equal(keyStatus({ expiresAt: now + 3 * DAY }, now), "expiring");
  assert.equal(keyStatus({ expiresAt: now + 60 * DAY }, now), "active");
  assert.equal(keyStatus({ expiresAt: null }, now), "active");
  assert.equal(keyStatus({ expiresAt: new Date(now + 2 * DAY).toISOString() }, now), "expiring");
});

test("expiryFromDays and daysLeft", () => {
  assert.equal(expiryFromDays(null, now), null);
  assert.equal(expiryFromDays(30, now), now + 30 * DAY);
  assert.equal(daysLeft(now + 30 * DAY - 1000, now), 30);
  assert.equal(daysLeft(null, now), null);
  assert.ok((daysLeft(now - 2 * DAY, now) ?? 0) < 0);
});

test("toggleScope keeps the catalogue order", () => {
  const all = ["read", "write", "admin"];
  assert.deepEqual(toggleScope(["write"], "read", all), ["read", "write"]);
  assert.deepEqual(toggleScope(["read", "write"], "read", all), ["write"]);
});
