import assert from "node:assert/strict";
import test from "node:test";
import { daysRemaining, deletionDate, deletionPhase, graceElapsed, isExportActive, pollDelay } from "../src/components/data-privacy/privacy-rules.ts";

test("export statuses that keep polling", () => {
  assert.equal(isExportActive("queued"), true);
  assert.equal(isExportActive("processing"), true);
  for (const s of ["ready", "failed", "expired"]) assert.equal(isExportActive(s), false);
});

test("pollDelay backs off and is capped", () => {
  assert.equal(pollDelay(0), 3000);
  assert.equal(pollDelay(1), 4500);
  assert.equal(pollDelay(2), 6750);
  assert.equal(pollDelay(50), 30000);
  assert.equal(pollDelay(-3), 3000);
});

test("grace period math", () => {
  const now = new Date("2026-03-01T10:00:00Z");
  const due = deletionDate(now, 30);
  assert.equal(due.toISOString(), "2026-03-31T10:00:00.000Z");
  assert.equal(daysRemaining(due, now), 30);
  assert.equal(daysRemaining(due, new Date("2026-03-30T23:00:00Z")), 1);
  assert.equal(daysRemaining(due, new Date("2026-04-05T00:00:00Z")), 0);
  assert.equal(deletionPhase(null, now), "none");
  assert.equal(deletionPhase(due, now), "pending");
  assert.equal(deletionPhase(due, due), "due");
  assert.equal(graceElapsed(due, 30, now), 0);
  assert.equal(graceElapsed(due, 30, new Date("2026-03-16T10:00:00Z")), 0.5);
  assert.equal(graceElapsed(due, 30, new Date("2027-01-01T00:00:00Z")), 1);
});
