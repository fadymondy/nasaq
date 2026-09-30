import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalStatus, canApprove, canDecide, pendingCount, redactArgs, sortQueue, unmetCriteria } from "../src/components/approval-queue/approval-queue-logic.ts";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const h = (n) => new Date(NOW + n * 3_600_000).toISOString();
const item = (id, extra = {}) => ({ id, kind: "action", status: "pending", title: id, createdAt: h(-5), ...extra });

test("a pending item past its expiry reads as expired and cannot be decided", () => {
  const i = item("a", { expiresAt: h(-1) });
  assert.equal(approvalStatus(i, NOW), "expired");
  assert.equal(canDecide(i, NOW), false);
  assert.equal(approvalStatus(item("b", { expiresAt: h(1) }), NOW), "pending");
  assert.equal(approvalStatus(item("c", { status: "approved", expiresAt: h(-1) }), NOW), "approved");
});

test("unmet criteria block approve but not reject", () => {
  const i = item("r", { kind: "review", criteria: [{ id: "1", label: "x", met: true }, { id: "2", label: "y", met: false }] });
  assert.equal(unmetCriteria(i).length, 1);
  assert.equal(canApprove(i, NOW), false);
  assert.equal(canDecide(i, NOW), true);
  assert.equal(canApprove(item("ok", { criteria: [{ id: "1", label: "x", met: true }] }), NOW), true);
});

test("sortQueue puts pending first, soonest expiry first, decided last", () => {
  const list = [
    item("done", { status: "approved", decidedAt: h(-1) }),
    item("late", { expiresAt: h(10) }),
    item("none", { createdAt: h(-9) }),
    item("soon", { expiresAt: h(1) }),
    item("gone", { expiresAt: h(-2) }),
  ];
  assert.deepEqual(sortQueue(list, NOW).map((i) => i.id), ["soon", "late", "none", "done", "gone"]);
  assert.equal(pendingCount(list, NOW), 3);
});

test("redactArgs never exposes redacted values", () => {
  const rows = redactArgs({ to: "a@b.co", token: "sk_live_123", n: 3, ok: false, z: null }, ["token"]);
  assert.equal(rows.find((r) => r.key === "token").value.includes("sk_live"), false);
  assert.equal(rows.find((r) => r.key === "token").redacted, true);
  assert.deepEqual(rows.filter((r) => !r.redacted).map((r) => r.value), ["a@b.co", "3", "false", "null"]);
});
