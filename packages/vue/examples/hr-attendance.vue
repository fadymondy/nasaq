<script setup lang="ts">
import { NqAttendanceMarker, NqLeaveBalances, NqLeaveRequestDialog, NqLeaveRequestList, NqPayrollRuns, type AttendancePunch, type AttendancePunchKind, type LeaveRequestRow, type LeaveType, type PayrollRun } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const types: LeaveType[] = [
  { id: "annual", name: "Annual leave", annualDays: 21, accrual: "monthly", carryOverMax: 5 },
  { id: "sick", name: "Sick leave", annualDays: 10 },
  { id: "unpaid", name: "Unpaid leave", annualDays: 0, limited: false },
];
const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m).getTime();
const punches = ref<AttendancePunch[]>([{ id: "p1", kind: "in", at: at(8, 52), place: "Riyadh HQ" }]);
const now = at(9);
let next = 2;
async function punch(kind: AttendancePunchKind) {
  punches.value = [...punches.value, { id: `p${next++}`, kind, at: Date.now() }];
}

const requests = ref<LeaveRequestRow[]>([
  { id: "r1", employee: "Sara Alharbi", typeId: "annual", start: "2026-10-04", end: "2026-10-08", status: "pending" },
  { id: "r2", employee: "Omar Khaled", typeId: "sick", start: "2026-09-20", end: "2026-09-21", status: "approved" },
]);
const open = ref(false);
async function decide(request: LeaveRequestRow, decision: "approved" | "rejected", note?: string) {
  requests.value = requests.value.map((r) => (r.id === request.id ? { ...r, status: decision, note } : r));
}

const runs = ref<PayrollRun[]>([
  {
    id: "run-09",
    period: "2026-09",
    status: "draft",
    payDate: "2026-09-28",
    lines: [
      { id: "l1", employee: "Sara Alharbi", basic: 650000, allowances: 100000, deductions: 62500 },
      { id: "l2", employee: "Omar Khaled", basic: 480000, additions: 25000, deductions: 41000 },
    ],
  },
]);
const setStatus = (run: PayrollRun, status: PayrollRun["status"]) => void (runs.value = runs.value.map((r) => (r.id === run.id ? { ...r, status } : r)));
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqAttendanceMarker :punches="punches" :now="now" :shift="{ start: '09:00', end: '17:00', graceMinutes: 10 }" :on-punch="punch" />
    <NqLeaveBalances :types="types" :requests="requests" as-of="2026-09-29" :on-request="() => (open = true)" />
    <NqLeaveRequestList :requests="requests" :types="types" :on-decide="decide" :on-new="() => (open = true)" />
    <NqLeaveRequestDialog v-model:open="open" :types="types" :requests="requests" as-of="2026-09-29" :on-submit="async () => undefined" />
    <NqPayrollRuns :runs="runs" currency="USD" :on-approve="async (run) => setStatus(run, 'approved')" :on-mark-paid="async (run) => setStatus(run, 'paid')" />
  </div>
</template>
