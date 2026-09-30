import assert from "node:assert/strict";
import { test } from "node:test";
import { addDaysKey, attendanceState, checkLeaveRequest, findLeaveOverlap, attendanceLateMinutes, leaveBalance, leaveDays, payrollTotals, prorateSalary, unpaidLeaveDeduction, attendanceMinutes } from "../src/components/hr-attendance/hr-math.ts";

// 2026-09-27 is a Sunday. The default weekend is Friday and Saturday.
test("leaveDays skips weekends and holidays", () => {
  assert.equal(leaveDays("2026-09-27", "2026-10-01"), 5);
  assert.equal(leaveDays("2026-09-27", "2026-10-03"), 5);
  assert.equal(leaveDays("2026-09-27", "2026-10-01", { holidays: ["2026-09-28"] }), 4);
  assert.equal(leaveDays("2026-09-27", "2026-09-27", {}, { start: true }), 0.5);
  assert.equal(leaveDays("2026-10-02", "2026-10-02"), 0);
  assert.equal(leaveDays("2026-10-05", "2026-10-01"), 0);
  // Sunday off: Monday is a half day at the start, Tuesday a half day at the end.
  assert.equal(leaveDays("2026-09-28", "2026-09-29", { weekend: [0] }, { start: true, end: true }), 1);
});

test("addDaysKey crosses month ends", () => {
  assert.equal(addDaysKey("2026-01-31", 1), "2026-02-01");
  assert.equal(addDaysKey("2028-02-28", 1), "2028-02-29");
});

const annual = { id: "annual", annualDays: 21, accrual: "upfront", carryOverMax: 5 };
const monthly = { id: "annual", annualDays: 24, accrual: "monthly" };

test("leaveBalance counts approved as used and pending as held", () => {
  const b = leaveBalance(
    annual,
    [
      { typeId: "annual", start: "2026-03-01", end: "2026-03-05", status: "approved" },
      { typeId: "annual", start: "2026-06-07", end: "2026-06-08", status: "pending" },
      { typeId: "annual", start: "2026-07-01", end: "2026-07-02", status: "rejected" },
      { typeId: "sick", start: "2026-08-02", end: "2026-08-03", status: "approved" },
    ],
    { year: 2026, asOf: "2026-09-30" },
  );
  assert.deepEqual([b.entitled, b.accrued, b.used, b.pending, b.available, b.remaining], [21, 21, 5, 2, 14, 14]);
});

test("leaveBalance accrues monthly and caps carry-over", () => {
  const b = leaveBalance(monthly, [], { year: 2026, asOf: "2026-03-15" });
  assert.equal(b.accrued, 6);
  assert.equal(b.entitled, 24);
  const c = leaveBalance(annual, [], { year: 2026, asOf: "2026-01-01", carriedOver: 12 });
  assert.equal(c.entitled, 26);
  assert.equal(leaveBalance(monthly, [], { year: 2025, asOf: "2026-01-01" }).accrued, 24);
  assert.equal(leaveBalance(monthly, [], { year: 2027, asOf: "2026-06-01" }).accrued, 0);
});

test("leaveBalance clips leave that spans the new year", () => {
  const b = leaveBalance(annual, [{ typeId: "annual", start: "2025-12-28", end: "2026-01-02", status: "approved" }], { year: 2026, asOf: "2026-02-01" });
  // 1 January 2026 is a Thursday and counts; the 2nd is a Friday.
  assert.equal(b.used, 1);
});

test("checkLeaveRequest reports the problem", () => {
  const opts = { year: 2026, asOf: "2026-09-30" };
  const existing = [{ id: "a", typeId: "annual", start: "2026-10-04", end: "2026-10-08", status: "approved" }];
  assert.equal(checkLeaveRequest(annual, { start: "2026-10-10", end: "2026-10-05" }, existing, opts).problem, "range");
  assert.equal(checkLeaveRequest(annual, { start: "2026-10-02", end: "2026-10-03" }, existing, opts).problem, "none");
  assert.equal(checkLeaveRequest(annual, { start: "2026-10-07", end: "2026-10-12" }, existing, opts).problem, "overlap");
  assert.equal(checkLeaveRequest(annual, { start: "2026-11-01", end: "2026-11-30" }, existing, opts).problem, "balance");
  assert.equal(checkLeaveRequest({ ...annual, limited: false }, { start: "2026-11-01", end: "2026-11-30" }, existing, opts).problem, null);
  assert.equal(checkLeaveRequest(annual, { start: "2026-11-01", end: "2026-11-03" }, existing, opts).problem, null);
  assert.equal(findLeaveOverlap([{ id: "x", typeId: "a", start: "2026-01-01", end: "2026-01-05", status: "rejected" }], "2026-01-02", "2026-01-03"), undefined);
});

test("attendanceMinutes excludes breaks and runs open sessions to now", () => {
  const t = (h, m) => new Date(2026, 8, 30, h, m).getTime();
  const punches = [
    { kind: "in", at: t(9, 0) },
    { kind: "break-start", at: t(12, 0) },
    { kind: "break-end", at: t(12, 30) },
    { kind: "out", at: t(17, 0) },
  ];
  assert.equal(attendanceMinutes(punches, t(23, 0)), 8 * 60 - 30);
  assert.equal(attendanceMinutes(punches.slice(0, 3), t(14, 0)), 3 * 60 + 90);
  assert.equal(attendanceMinutes([], t(14, 0)), 0);
  assert.equal(attendanceState(punches), "out");
  assert.equal(attendanceState(punches.slice(0, 2)), "break");
  assert.equal(attendanceState(punches.slice(0, 3)), "in");
  assert.equal(attendanceState([]), "out");
});

test("attendanceLateMinutes honours the grace period", () => {
  const at = (h, m) => new Date(2026, 8, 30, h, m).getTime();
  assert.equal(attendanceLateMinutes(at(9, 10), "09:00", 15), 0);
  assert.equal(attendanceLateMinutes(at(9, 20), "09:00", 15), 20);
  assert.equal(attendanceLateMinutes(at(8, 40), "09:00"), 0);
});

test("payroll proration and totals stay in whole minor units", () => {
  assert.equal(prorateSalary(1_000_000, 15, 22), 681_818);
  assert.equal(prorateSalary(1_000_000, 30, 22), 1_000_000);
  assert.equal(prorateSalary(100, 1, 3), 33);
  assert.equal(prorateSalary(100, 2, 3), 67);
  assert.equal(unpaidLeaveDeduction(1_000_000, 2, 22), 90_909);
  assert.deepEqual(payrollTotals([{ basic: 500_000, allowances: 100_000, deductions: 50_000 }, { basic: 300_000, additions: 20_000 }]), { gross: 920_000, deductions: 50_000, net: 870_000, count: 2 });
});
