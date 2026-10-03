<script setup lang="ts">
import { Cpu, RotateCw, ServerCog, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import {
  NqDataTable,
  NqDataTableBulkActions,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from "../data-table";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { canForgetJob, canRetryJob, errorHeadline, JOB_STATUSES, jobCounts, type JobStatus } from "./format";
import NqJobDialog from "./NqJobDialog.vue";
import NqServerAdminConfirm from "./NqServerAdminConfirm.vue";
import { useServerAdminLabels, type ServerAdminLabels } from "./strings";
import type { ConfirmRequest, QueueJob, ServerAdminResult } from "./types";
import { useRunner } from "./use-runner";

// A queue monitor: a count per status that filters the list, a table of jobs with queue, attempts and the first line of the
// error, and retry and forget for one job, a selection or everything that failed. A dialog shows the full error and payload.
const props = withDefaults(
  defineProps<{
    jobs: readonly QueueJob[];
    /** Put failed jobs back in the queue. */
    onRetry: (ids: string[]) => Promise<ServerAdminResult>;
    /** Remove jobs from the queue and the history. Shows Forget. */
    onForget?: (ids: string[]) => Promise<ServerAdminResult>;
    loading?: boolean;
    error?: string;
    /** Try loading the list again, after `error`. */
    onRetryLoad?: () => void;
    labels?: Partial<ServerAdminLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onForget: undefined, loading: false, error: undefined, onRetryLoad: undefined, labels: undefined },
);

const t = useServerAdminLabels(() => props.labels);
const runner = useRunner(() => t.value.genericError);
const status = ref<JobStatus | null>(null);
const confirm = ref<ConfirmRequest | null>(null);
const detail = ref<QueueJob | null>(null);
const counts = computed(() => jobCounts(props.jobs));
const shown = computed(() => (status.value ? props.jobs.filter((j) => j.status === status.value) : [...props.jobs]));
const queues = computed(() => [...new Set(props.jobs.map((j) => j.queue))].sort());
const jobTone: Record<JobStatus, StatusTone> = { waiting: "neutral", active: "info", delayed: "warning", completed: "success", failed: "danger" };

const columns = computed<DataTableColumn<QueueJob>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "job",
      header: tt.job,
      label: tt.job,
      hideable: false,
      sortValue: (j) => j.name,
      searchValue: (j) => `${j.name} ${j.id} ${j.error ?? ""}`,
      cell: (j) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "truncate text-start font-mono text-code text-foreground" }, j.name),
          j.error
            ? h("bdi", { dir: "ltr", class: "truncate text-start text-caption text-nq-danger-text" }, errorHeadline(j.error))
            : h("bdi", { dir: "ltr", class: "text-start font-mono text-caption text-muted-foreground" }, j.id),
        ]),
    },
    {
      id: "queue",
      header: tt.queue,
      label: tt.queue,
      sortValue: (j) => j.queue,
      filterValue: (j) => j.queue,
      cell: (j) => h(NqBadge, { variant: "outline", dir: "ltr" }, () => j.queue),
    },
    { id: "status", header: tt.status, label: tt.status, sortValue: (j) => j.status, cell: (j) => h(NqStatus, { tone: jobTone[j.status] }, () => tt.jobStatuses[j.status]) },
    {
      id: "attempts",
      header: tt.attempts,
      label: tt.attempts,
      align: "end",
      sortValue: (j) => j.attempts,
      cell: (j) => h(NqNum, { value: j.attempts, class: "text-muted-foreground" }),
    },
    { id: "when", header: tt.when, label: tt.when, sortValue: (j) => new Date(j.at), cell: (j) => h(NqDateTime, { value: j.at, relative: true, class: "text-muted-foreground" }) },
  ];
});

const table = useDataTable<QueueJob>({ data: shown, columns, getRowId: (j) => j.id, selectable: true, defaultSort: { id: "when", direction: "desc" }, pageSize: 10 });

const retry = (ids: string[]) => runner.run(ids, () => props.onRetry(ids));
function askForget(ids: string[]) {
  const forget = props.onForget;
  if (!forget || ids.length === 0) return;
  confirm.value = { title: t.value.forgetTitle(ids.length), body: t.value.forgetBody, confirm: t.value.forget, run: () => runner.run(ids, () => forget(ids)) };
}
function askRetry(ids: string[]) {
  if (ids.length === 0) return;
  confirm.value = { title: t.value.retryTitle(ids.length), body: t.value.retryBody, confirm: t.value.retry, danger: false, run: () => retry(ids) };
}

const failedIds = computed(() => props.jobs.filter((j) => j.status === "failed").map((j) => j.id));
const retryable = computed(() => table.selectedRows.filter((j) => canRetryJob(j.status)).map((j) => j.id));
const forgettable = computed(() => table.selectedRows.filter((j) => canForgetJob(j.status)).map((j) => j.id));

function rowActions(j: QueueJob): DataTableRowAction[] {
  const tt = t.value;
  return [
    { id: "details", label: tt.details, icon: ServerCog, group: "inspect", onSelect: () => (detail.value = j) },
    ...(canRetryJob(j.status) ? [{ id: "retry", label: tt.retry, icon: RotateCw, group: "run", disabled: runner.busy.value.has(j.id), onSelect: () => void retry([j.id]) }] : []),
    ...(props.onForget && canForgetJob(j.status)
      ? [{ id: "forget", label: tt.forget, icon: Trash2, danger: true, group: "danger", disabled: runner.busy.value.has(j.id), onSelect: () => askForget([j.id]) }]
      : []),
  ];
}
</script>

<template>
  <NqCard data-slot="job-queue-monitor" :class="cn('w-full', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.jobsTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.jobsDescription }}</NqCardDescription>
      </div>
      <NqCardAction v-if="failedIds.length > 0" class="mt-3 flex flex-wrap gap-2 sm:mt-0">
        <NqButton type="button" variant="secondary" @click="askRetry(failedIds)">
          <RotateCw aria-hidden="true" />
          {{ t.retryFailed }}
        </NqButton>
        <NqButton v-if="props.onForget" type="button" variant="ghost" @click="askForget(failedIds)">
          <Trash2 aria-hidden="true" />
          {{ t.forgetFailed }}
        </NqButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <div role="group" :aria-label="t.statusGroup" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <button
          v-for="s in JOB_STATUSES"
          :key="s"
          type="button"
          :aria-pressed="status === s"
          :class="
            cn(
              'flex flex-col items-start gap-0.5 rounded-control border border-border bg-card px-3 py-2 text-start outline-none transition-colors hover:bg-nq-hover',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
              status === s && 'border-primary ring-1 ring-primary',
            )
          "
          @click="status = status === s ? null : s"
        >
          <span class="text-h3 tabular-nums text-foreground"><NqNum :value="counts[s]" /></span>
          <NqStatus :tone="jobTone[s]">{{ t.jobStatuses[s] }}</NqStatus>
        </button>
      </div>
      <NqAlert v-if="runner.error.value" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="runner.error.value = null">{{ runner.error.value }}</NqAlert>
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.search" />
        <NqDataTableFacetFilter v-if="queues.length > 1" :table="table" column="queue" :title="t.queueFilter" :options="queues.map((q) => ({ value: q, label: q }))" />
      </NqDataTableToolbar>
      <NqDataTableBulkActions :table="table">
        <NqButton type="button" size="sm" variant="secondary" :disabled="retryable.length === 0" @click="askRetry(retryable)">{{ t.retry }}</NqButton>
        <NqButton v-if="props.onForget" type="button" size="sm" variant="ghost" :disabled="forgettable.length === 0" @click="askForget(forgettable)">{{ t.forget }}</NqButton>
      </NqDataTableBulkActions>
      <NqDataTable
        :table="table"
        :label="t.jobsTable"
        :row-label="(j: QueueJob) => j.name"
        :loading="props.loading"
        :error="props.error"
        :on-retry="props.onRetryLoad"
        :on-row-click="(j: QueueJob) => (detail = j)"
        :row-actions="rowActions"
      >
        <template #empty>
          <NqEmptyState :icon="Cpu" :title="t.jobsEmpty" />
        </template>
      </NqDataTable>
      <NqDataTablePagination :table="table" />
    </NqCardContent>
    <NqJobDialog :job="detail" :tone="jobTone" :t="t" @close="detail = null" />
    <NqServerAdminConfirm :request="confirm" :cancel="t.cancel" @close="confirm = null" />
  </NqCard>
</template>
