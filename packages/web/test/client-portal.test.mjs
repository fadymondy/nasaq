import assert from "node:assert/strict";
import { test } from "node:test";
import {
  portalBudget,
  portalPendingRequests,
  portalProgress,
  portalRing,
  portalTotalHours,
  portalVisibleInvoices,
  portalWeeksNewestFirst,
} from "../src/components/client-portal/client-portal-logic.ts";

test("portalProgress counts and rounds", () => {
  const p = portalProgress([{ status: "done" }, { status: "done" }, { status: "doing" }]);
  assert.equal(p.total, 3);
  assert.equal(p.done, 2);
  assert.equal(p.percent, 67);
  assert.equal(p.byStatus.doing, 1);
});

test("portalProgress of nothing is zero", () => {
  const p = portalProgress([]);
  assert.equal(p.percent, 0);
  assert.equal(p.total, 0);
});

test("portalBudget tones", () => {
  assert.equal(portalBudget(100, 40).tone, "success");
  assert.equal(portalBudget(100, 80).tone, "warning");
  const over = portalBudget(100, 120);
  assert.equal(over.tone, "danger");
  assert.equal(over.over, true);
  assert.equal(over.percent, 100);
  assert.equal(over.remaining, 0);
});

test("portalBudget without a budget is never over", () => {
  const b = portalBudget(0, 5);
  assert.equal(b.over, false);
  assert.equal(b.percent, 0);
});

test("weeks sum and sort", () => {
  const weeks = [
    { week: "2026-09-01", hours: 12.25 },
    { week: "2026-09-15", hours: 8 },
    { week: "2026-09-08", hours: 10.1 },
  ];
  assert.equal(portalTotalHours(weeks), 30.4);
  assert.deepEqual(portalWeeksNewestFirst(weeks).map((w) => w.week), ["2026-09-15", "2026-09-08", "2026-09-01"]);
  assert.equal(weeks[0].week, "2026-09-01", "input is not mutated");
});

test("pending requests", () => {
  assert.equal(portalPendingRequests([{ status: "pending" }, { status: "accepted" }, { status: "pending" }]), 2);
});

test("drafts are hidden from the customer", () => {
  const list = portalVisibleInvoices([{ status: "draft", n: 1 }, { status: "open", n: 2 }, { status: "paid", n: 3 }]);
  assert.deepEqual(list.map((i) => i.n), [2, 3]);
});

test("ring offset", () => {
  const full = portalRing(100, 10);
  assert.equal(Math.round(full.offset), 0);
  const half = portalRing(50, 10);
  assert.ok(Math.abs(half.offset - half.circumference / 2) < 1e-9);
  assert.equal(portalRing(Number.NaN, 10).offset, portalRing(0, 10).circumference);
});
