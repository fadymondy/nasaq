<script setup lang="ts">
import { Check, CircleX, Plus, Undo2, X } from "lucide-vue-next";
import { computed, h, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqTextarea } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { leaveDays, type LeaveCalendar, type LeaveStatus } from "./hr-math";
import { hrFail, useHrStrings, type HrAttendanceLabels } from "./strings";
import type { HrResult, LeaveRequestRow, LeaveType } from "./types";

// Leave requests in a DataTable. Managers approve or reject (a rejection asks for a note); people withdraw their own
// pending ones.
const props = withDefaults(
  defineProps<{
    requests: readonly LeaveRequestRow[];
    types: readonly LeaveType[];
    calendar?: LeaveCalendar;
    /** "manager" shows the employee column with Approve and Reject; "self" shows Withdraw. Default "manager". */
    mode?: "manager" | "self";
    /** Approves or rejects. `note` is set on a rejection. Resolve `{ error }` or reject to show the message. */
    onDecide?: (request: LeaveRequestRow, decision: "approved" | "rejected", note?: string) => Promise<HrResult> | HrResult;
    /** Withdraws a pending request (self mode). */
    onWithdraw?: (request: LeaveRequestRow) => Promise<HrResult> | HrResult;
    onNew?: () => void;
    loading?: boolean;
    labels?: HrAttendanceLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { calendar: undefined, mode: "manager", onDecide: undefined, onWithdraw: undefined, onNew: undefined, loading: false, labels: undefined },
);

const STATUS_TONE: Record<LeaveStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };

const { t, n } = useHrStrings(() => props.labels);
const titleId = `nq-leave-requests-${useId()}`;
const rejecting = ref<LeaveRequestRow | null>(null);
const note = ref("");
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const typeName = (id: string) => props.types.find((x) => x.id === id)?.name ?? id;
const daysOf = (r: LeaveRequestRow) => leaveDays(r.start, r.end, props.calendar, { start: r.halfStart, end: r.halfEnd });

async function run(id: string, job: () => Promise<HrResult> | HrResult) {
  busy.value = id;
  error.value = null;
  try {
    const result = await job();
    if (result && result.error) {
      error.value = result.error;
      return false;
    }
    return true;
  } catch (e) {
    error.value = hrFail(e, t.value.failed);
    return false;
  } finally {
    busy.value = null;
  }
}
const startReject = (r: LeaveRequestRow) => {
  note.value = "";
  rejecting.value = r;
};

const columns = computed<DataTableColumn<LeaveRequestRow>[]>(() => {
  const s = t.value;
  return [
    ...(props.mode === "manager"
      ? [
          {
            id: "employee",
            header: s.employee,
            label: s.employee,
            cell: (r: LeaveRequestRow) => h("span", { class: "text-foreground" }, r.employee),
            sortValue: (r: LeaveRequestRow) => r.employee,
            searchValue: (r: LeaveRequestRow) => r.employee,
          },
        ]
      : []),
    { id: "type", header: s.type, label: s.type, cell: (r) => h(NqBadge, { variant: "outline" }, () => typeName(r.typeId)), sortValue: (r) => typeName(r.typeId), filterValue: (r) => r.typeId },
    {
      id: "dates",
      header: s.dates,
      label: s.dates,
      cell: (r) =>
        h("span", { class: "inline-flex flex-wrap items-baseline gap-x-1" }, [
          h(NqDateTime, { value: `${r.start}T00:00:00`, format: { dateStyle: "medium" } }),
          r.end !== r.start ? [h("span", { "aria-hidden": "true", class: "text-muted-foreground" }, "–"), h(NqDateTime, { value: `${r.end}T00:00:00`, format: { dateStyle: "medium" } })] : null,
        ]),
      sortValue: (r) => r.start,
    },
    { id: "days", header: s.days, label: s.days, align: "end", cell: (r) => h(NqNum, { value: daysOf(r), format: { maximumFractionDigits: 1 } }), sortValue: daysOf },
    {
      id: "status",
      header: s.status,
      label: s.status,
      cell: (r) => h(NqStatus, { tone: STATUS_TONE[r.status] }, () => s.statuses[r.status]),
      sortValue: (r) => r.status,
      filterValue: (r) => r.status,
    },
    ...(props.onDecide && props.mode === "manager"
      ? [
          {
            id: "decide",
            header: () => h("span", { class: "sr-only" }, s.status),
            label: s.status,
            hideable: false,
            align: "end" as const,
            cell: (r: LeaveRequestRow) =>
              r.status === "pending"
                ? h("span", { class: "inline-flex gap-1" }, [
                    h(
                      NqButton,
                      { size: "icon-sm", variant: "ghost", "aria-label": `${s.approve}: ${r.employee}`, loading: busy.value === r.id, onClick: () => void run(r.id, () => props.onDecide!(r, "approved")) },
                      () => h(Check, { "aria-hidden": "true" }),
                    ),
                    h(
                      NqButton,
                      { size: "icon-sm", variant: "ghost", "aria-label": `${s.reject}: ${r.employee}`, disabled: busy.value === r.id, onClick: () => startReject(r) },
                      () => h(X, { "aria-hidden": "true" }),
                    ),
                  ])
                : null,
          },
        ]
      : []),
  ];
});
const table = useDataTable<LeaveRequestRow>({ data: () => props.requests as LeaveRequestRow[], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "dates", direction: "desc" } });

const rowActions = (r: LeaveRequestRow) => [
  ...(props.mode === "manager" && props.onDecide && r.status === "pending"
    ? [
        { id: "approve", label: t.value.approve, icon: Check, onSelect: () => void run(r.id, () => props.onDecide!(r, "approved")) },
        { id: "reject", label: t.value.reject, icon: X, danger: true, onSelect: () => startReject(r) },
      ]
    : []),
  ...(props.mode === "self" && props.onWithdraw && r.status === "pending" ? [{ id: "withdraw", label: t.value.withdraw, icon: Undo2, onSelect: () => void run(r.id, () => props.onWithdraw!(r)) }] : []),
];
const statusOptions = computed(() => (["pending", "approved", "rejected", "cancelled"] as const).map((s) => ({ value: s, label: t.value.statuses[s] })));
const pendingCount = computed(() => props.requests.filter((r) => r.status === "pending").length);

function confirmReject() {
  const target = rejecting.value;
  if (!target || !props.onDecide) return;
  void run(target.id, () => props.onDecide!(target, "rejected", note.value.trim() || undefined)).then((ok) => ok && (rejecting.value = null));
}
</script>

<template>
  <section data-slot="leave-request-list" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="titleId" class="text-h3 text-foreground">{{ t.leaveRequests }}</h2>
      <NqButton v-if="props.onNew" variant="primary" @click="props.onNew?.()">
        <Plus aria-hidden="true" />
        {{ t.requestLeave }}
      </NqButton>
    </div>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.status" :options="statusOptions" />
    </NqDataTableToolbar>
    <p v-if="error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ error }}
    </p>
    <NqDataTable :table="table" :label="t.leaveRequests" :row-label="(r) => `${r.employee} ${r.start}`" :loading="props.loading" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :title="t.emptyRequests" :description="t.emptyRequestsDescription" class="border-0" />
      </template>
    </NqDataTable>
    <NqDialog :open="rejecting !== null" @update:open="(next: boolean) => !next && !busy && (rejecting = null)">
      <NqDialogContent>
        <form class="grid gap-4" @submit.prevent="confirmReject()">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.rejectTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ t.rejectDescription(rejecting?.employee ?? "") }}</NqDialogDescription>
          </NqDialogHeader>
          <NqField>
            <NqFieldLabel>{{ t.note }}</NqFieldLabel>
            <NqTextarea v-model="note" />
            <NqFieldDescription>{{ t.noteHint }}</NqFieldDescription>
          </NqField>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="rejecting = null">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="danger" :loading="busy !== null">{{ t.confirmReject }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
    <span class="sr-only" aria-live="polite">{{ n(pendingCount) }}</span>
  </section>
</template>
