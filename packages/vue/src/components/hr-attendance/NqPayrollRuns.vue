<script setup lang="ts">
import { Check, CircleCheck, CircleX, Wallet } from "lucide-vue-next";
import { computed, h, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { NqDataTable, useDataTable, type DataTableColumn } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { parseDay, payrollNet, payrollTotals } from "./hr-math";
import { hrFail, useHrStrings, type HrAttendanceLabels } from "./strings";
import type { HrResult, PayrollLine, PayrollRun, PayrollRunStatus } from "./types";

// Payroll runs with gross, deductions and net computed from their lines, and a detail dialog per run with approve
// and paid steps.
const props = withDefaults(
  defineProps<{
    runs: readonly PayrollRun[];
    /** ISO 4217 code. Every amount is an integer in its minor units. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Moves a draft run to approved. Resolve `{ error }` or reject to show the message. */
    onApprove?: (run: PayrollRun) => Promise<HrResult> | HrResult;
    /** Moves an approved run to paid. */
    onMarkPaid?: (run: PayrollRun) => Promise<HrResult> | HrResult;
    loading?: boolean;
    labels?: HrAttendanceLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, onApprove: undefined, onMarkPaid: undefined, loading: false, labels: undefined },
);

const RUN_TONE: Record<PayrollRunStatus, StatusTone> = { draft: "neutral", approved: "info", paid: "success" };

const currency = useCurrency(() => props.currency);
const { t, locale, n } = useHrStrings(() => props.labels);
const titleId = `nq-payroll-runs-${useId()}`;
const openId = ref<string | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const open = computed(() => props.runs.find((r) => r.id === openId.value) ?? null);
const totals = computed(() => (open.value ? payrollTotals(open.value.lines) : null));

const fmt = (minor: number) => h(NqNum, { value: minorToMajor(minor, currency.value), format: { style: "currency", currency: currency.value } });
const periodLabel = (period: string) => new Intl.DateTimeFormat(locale.value, { month: "long", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(parseDay(`${period}-01`));
const openRun = (r: PayrollRun) => {
  error.value = null;
  openId.value = r.id;
};

const columns = computed<DataTableColumn<PayrollRun>[]>(() => {
  const s = t.value;
  return [
    { id: "period", header: s.period, label: s.period, cell: (r) => h("span", { class: "text-foreground" }, periodLabel(r.period)), sortValue: (r) => r.period },
    { id: "employees", header: s.employees, label: s.employees, align: "end", cell: (r) => h(NqNum, { value: r.lines.length }), sortValue: (r) => r.lines.length },
    { id: "gross", header: s.gross, label: s.gross, align: "end", cell: (r) => fmt(payrollTotals(r.lines).gross), sortValue: (r) => payrollTotals(r.lines).gross },
    { id: "deductions", header: s.deductions, label: s.deductions, align: "end", cell: (r) => fmt(payrollTotals(r.lines).deductions), sortValue: (r) => payrollTotals(r.lines).deductions, defaultHidden: true },
    { id: "net", header: s.net, label: s.net, align: "end", cell: (r) => h("span", { class: "font-medium text-foreground" }, [fmt(payrollTotals(r.lines).net)]), sortValue: (r) => payrollTotals(r.lines).net },
    { id: "payDate", header: s.payDate, label: s.payDate, cell: (r) => (r.payDate ? h(NqDateTime, { value: `${r.payDate}T00:00:00` }) : "–"), sortValue: (r) => r.payDate ?? null },
    { id: "status", header: s.status, label: s.status, cell: (r) => h(NqStatus, { tone: RUN_TONE[r.status] }, () => s.runStatuses[r.status]), sortValue: (r) => r.status, filterValue: (r) => r.status },
  ];
});
const table = useDataTable<PayrollRun>({ data: () => props.runs as PayrollRun[], columns, getRowId: (r) => r.id, defaultSort: { id: "period", direction: "desc" } });

const lineColumns = computed<DataTableColumn<PayrollLine>[]>(() => {
  const s = t.value;
  return [
    { id: "employee", header: s.employee, label: s.employee, cell: (l) => h("span", { class: "text-foreground" }, l.employee), sortValue: (l) => l.employee },
    { id: "days", header: s.days2, label: s.days2, align: "end", cell: (l) => (l.workingDays ? h(NqNum, { value: l.workedDays ?? l.workingDays }) : "–"), defaultHidden: true },
    { id: "basic", header: s.basic, label: s.basic, align: "end", cell: (l) => fmt(l.basic), sortValue: (l) => l.basic },
    { id: "allowances", header: s.allowances, label: s.allowances, align: "end", cell: (l) => fmt((l.allowances ?? 0) + (l.additions ?? 0)), sortValue: (l) => (l.allowances ?? 0) + (l.additions ?? 0) },
    { id: "deductions", header: s.deductions, label: s.deductions, align: "end", cell: (l) => fmt(l.deductions ?? 0), sortValue: (l) => l.deductions ?? 0 },
    { id: "net", header: s.net, label: s.net, align: "end", cell: (l) => h("span", { class: "font-medium text-foreground" }, [fmt(payrollNet(l))]), sortValue: payrollNet },
  ];
});
const lineTable = useDataTable<PayrollLine>({ data: () => (open.value?.lines ?? []) as PayrollLine[], columns: lineColumns, getRowId: (l) => l.id, defaultSort: { id: "employee", direction: "asc" } });

async function step(job: () => Promise<HrResult> | HrResult) {
  busy.value = true;
  error.value = null;
  try {
    const result = await job();
    if (result && result.error) error.value = result.error;
  } catch (e) {
    error.value = hrFail(e, t.value.failed);
  } finally {
    busy.value = false;
  }
}

const rowActions = (r: PayrollRun) => [
  { id: "view", label: t.value.viewRun, onSelect: () => openRun(r) },
  ...(props.onApprove && r.status === "draft" ? [{ id: "approve", label: t.value.approveRun, icon: Check, group: "step", onSelect: () => void step(() => props.onApprove!(r)) }] : []),
  ...(props.onMarkPaid && r.status === "approved" ? [{ id: "paid", label: t.value.markPaid, icon: CircleCheck, group: "step", onSelect: () => void step(() => props.onMarkPaid!(r)) }] : []),
];
</script>

<template>
  <section data-slot="payroll-runs" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <h2 :id="titleId" class="flex items-center gap-2 text-h3 text-foreground">
      <Wallet aria-hidden="true" class="size-4 text-muted-foreground" />
      {{ t.payroll }}
    </h2>
    <NqDataTable :table="table" :label="t.runsLabel" :row-label="(r) => periodLabel(r.period)" :loading="props.loading" :on-row-click="openRun" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :icon="Wallet" :title="t.emptyRuns" :description="t.emptyRunsDescription" class="border-0" />
      </template>
    </NqDataTable>
    <NqDialog :open="open !== null" @update:open="(next: boolean) => !next && !busy && (openId = null)">
      <NqDialogContent class="max-w-3xl">
        <template v-if="open && totals">
          <NqDialogHeader>
            <NqDialogTitle class="flex flex-wrap items-center gap-2">
              {{ t.runTitle(periodLabel(open.period)) }}
              <NqStatus :tone="RUN_TONE[open.status]" class="text-body-sm font-normal">{{ t.runStatuses[open.status] }}</NqStatus>
            </NqDialogTitle>
            <NqDialogDescription>{{ t.runDescription(n(open.lines.length)) }}</NqDialogDescription>
          </NqDialogHeader>
          <NqDataTable :table="lineTable" :label="t.linesLabel" :row-label="(l) => l.employee" />
          <dl class="grid grid-cols-3 gap-3 rounded-card bg-nq-surface p-3 text-body-sm">
            <div>
              <dt class="text-muted-foreground">{{ t.gross }}</dt>
              <dd class="text-foreground"><NqNum :value="minorToMajor(totals.gross, currency)" :format="{ style: 'currency', currency }" /></dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t.deductions }}</dt>
              <dd class="text-foreground"><NqNum :value="minorToMajor(totals.deductions, currency)" :format="{ style: 'currency', currency }" /></dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t.net }}</dt>
              <dd class="font-semibold text-foreground"><NqNum :value="minorToMajor(totals.net, currency)" :format="{ style: 'currency', currency }" /></dd>
            </div>
          </dl>
          <p v-if="error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
            <CircleX aria-hidden="true" class="size-4" />
            {{ error }}
          </p>
          <NqDialogFooter>
            <NqButton variant="ghost" :disabled="busy" @click="openId = null">{{ t.close }}</NqButton>
            <NqButton v-if="props.onApprove && open.status === 'draft'" variant="primary" :loading="busy" @click="step(() => props.onApprove!(open!))">{{ t.approveRun }}</NqButton>
            <NqButton v-if="props.onMarkPaid && open.status === 'approved'" variant="primary" :loading="busy" @click="step(() => props.onMarkPaid!(open!))">{{ t.markPaid }}</NqButton>
          </NqDialogFooter>
        </template>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
