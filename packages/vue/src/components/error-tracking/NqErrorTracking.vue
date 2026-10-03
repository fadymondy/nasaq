<script setup lang="ts">
import { Bug, CheckCheck, EyeOff, RotateCcw } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { useNasaq } from "../../provider";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { NqCardMeta, NqEntityList, type EntityFacet } from "../entity-list";
import { NqSparkline } from "../chart";
import { formatNumber, NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import NqErrorIssueDetail from "./NqErrorIssueDetail.vue";
import { ERROR_TRACKING_STRINGS, etSeriesTrend, etSortIssues, etTotalEvents, type ErrorActionResult, type ErrorIssue, type ErrorLevel, type ErrorStatus, type ErrorTrackingLabels, type ErrorTrend } from "./error-tracking-model";

// Captured errors: a list with a frequency sparkline per error, filters by status and level, and the detail of the one you
// open (stack trace, breadcrumbs, tags, diagnostics) with resolve and ignore. Rows and cards offer the same actions in the
// ⋯ menu and the context menu. Built on NqEntityList: its other props and slots pass straight through.
interface Props {
  issues: ErrorIssue[];
  /** Resolve, ignore or reopen. Resolve to finish; return `{ error }` to show why it failed. Without it the actions are hidden. */
  onStatusChange?: (issue: ErrorIssue, status: ErrorStatus) => Promise<ErrorActionResult>;
  /** Called when an error is opened (its detail shows in place). */
  onOpenIssue?: (issue: ErrorIssue) => void;
  /** The list's accessible name. Default "Errors" / "الأخطاء". */
  label?: string;
  labels?: Partial<ErrorTrackingLabels> & Record<string, unknown>;
}
const props = withDefaults(defineProps<Props>(), { onStatusChange: undefined, onOpenIssue: undefined, label: undefined, labels: undefined });
defineSlots<{ empty?: () => unknown }>();

const levelTone: Record<ErrorLevel, StatusTone> = { fatal: "danger", error: "danger", warning: "warning", info: "info" };
const statusTone: Record<ErrorStatus, StatusTone> = { unresolved: "warning", resolved: "success", ignored: "neutral" };
const trendColor: Record<ErrorTrend, string> = { up: "var(--nq-danger)", down: "var(--nq-success)", flat: "var(--primary)" };

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...ERROR_TRACKING_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as ErrorTrackingLabels);
const num = (n: number) => formatNumber(n, locale.value);

const openId = ref<string | null>(null);
const overlay = ref<Record<string, ErrorStatus>>({});
const rows = computed(() => etSortIssues(props.issues.map((i) => ({ ...i, status: overlay.value[i.id] ?? i.status }))));

async function change(issue: ErrorIssue, status: ErrorStatus): Promise<ErrorActionResult> {
  const res = props.onStatusChange ? await props.onStatusChange(issue, status) : undefined;
  if (!(res && res.error)) overlay.value = { ...overlay.value, [issue.id]: status };
  return res;
}
function openIssue(i: ErrorIssue) {
  openId.value = i.id;
  props.onOpenIssue?.(i);
}
const current = computed(() => (openId.value ? rows.value.find((i) => i.id === openId.value) : undefined));

const frequency = (i: ErrorIssue, cls: string) =>
  h(NqSparkline, { data: i.series ?? [], color: trendColor[etSeriesTrend(i.series)], label: t.value.frequencyLabel(num(etTotalEvents(i.series))), class: cls });

const columns = computed<DataTableColumn<ErrorIssue>[]>(() => {
  const s = t.value;
  return [
    {
      id: "title",
      header: s.error,
      hideable: false,
      className: "min-w-72",
      cell: (i) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "truncate text-label text-foreground" }, i.title),
          i.culprit ? h("bdi", { dir: "ltr", class: "truncate font-mono text-code text-muted-foreground" }, i.culprit) : null,
        ]),
      sortValue: (i) => i.title,
      searchValue: (i) => `${i.title} ${i.culprit ?? ""} ${i.release ?? ""}`,
    },
    { id: "level", header: s.level, cell: (i) => h(NqStatus, { tone: levelTone[i.level] }, () => s.levels[i.level]), sortValue: (i) => i.level },
    { id: "status", header: s.status, cell: (i) => h(NqStatus, { tone: statusTone[i.status] }, () => s.statuses[i.status]), sortValue: (i) => i.status },
    { id: "frequency", header: s.frequency, cell: (i) => (i.series?.length ? frequency(i, "h-8 w-28") : "—") },
    { id: "events", header: s.events, align: "end", cell: (i) => h("span", { class: "tabular-nums" }, num(i.count)), sortValue: (i) => i.count },
    { id: "users", header: s.users, align: "end", defaultHidden: true, cell: (i) => h("span", { class: "tabular-nums" }, i.users === undefined ? "—" : num(i.users)), sortValue: (i) => i.users },
    { id: "lastSeen", header: s.lastSeen, align: "end", cell: (i) => h(NqDateTime, { value: i.lastSeen, relative: true }), sortValue: (i) => new Date(i.lastSeen) },
  ];
});

const facets = computed<EntityFacet<ErrorIssue>[]>(() => {
  const s = t.value;
  return [
    { id: "status", title: s.status, options: (["unresolved", "resolved", "ignored"] as const).map((v) => ({ value: v, label: s.statuses[v] })), getValues: (i: ErrorIssue) => [i.status] },
    { id: "level", title: s.level, options: (["fatal", "error", "warning", "info"] as const).map((v) => ({ value: v, label: s.levels[v] })), getValues: (i: ErrorIssue) => [i.level] },
  ];
});

function rowActions(i: ErrorIssue): DataTableRowAction[] {
  const s = t.value;
  const list: DataTableRowAction[] = [{ id: "open", label: s.open, icon: Bug, onSelect: () => openIssue(i) }];
  if (props.onStatusChange) {
    if (i.status === "unresolved") {
      list.push({ id: "resolve", label: s.resolve, icon: CheckCheck, group: "status", onSelect: () => void change(i, "resolved") });
      list.push({ id: "ignore", label: s.ignore, icon: EyeOff, group: "status", onSelect: () => void change(i, "ignored") });
    } else list.push({ id: "reopen", label: s.reopen, icon: RotateCcw, group: "status", onSelect: () => void change(i, "unresolved") });
  }
  return list;
}
</script>

<template>
  <NqErrorIssueDetail v-if="current" :issue="current" show-back :on-status-change="props.onStatusChange ? change : undefined" :labels="props.labels" @back="openId = null" />
  <NqEntityList
    v-else
    data-slot="error-tracking"
    :data="rows"
    :columns="columns"
    :get-row-id="(i: ErrorIssue) => i.id"
    :row-label="(i: ErrorIssue) => i.title"
    :label="props.label ?? t.label"
    :facets="facets"
    :search-placeholder="t.search"
    :selectable="false"
    :labels="props.labels as never"
    :row-actions="rowActions"
    :on-row-click="openIssue"
  >
    <template #card="{ row: i }">
      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex min-w-0 flex-col gap-1 pe-(--entity-card-controls)">
          <span dir="auto" class="line-clamp-2 text-label text-foreground">{{ i.title }}</span>
          <bdi v-if="i.culprit" dir="ltr" class="truncate font-mono text-code text-muted-foreground">{{ i.culprit }}</bdi>
        </div>
        <NqSparkline v-if="i.series?.length" :data="i.series" :color="trendColor[etSeriesTrend(i.series)]" :label="t.frequencyLabel(num(etTotalEvents(i.series)))" class="h-10 w-full" />
        <div class="flex flex-col gap-1.5">
          <NqCardMeta :label="t.level"><NqStatus :tone="levelTone[i.level as ErrorLevel]">{{ t.levels[i.level as ErrorLevel] }}</NqStatus></NqCardMeta>
          <NqCardMeta :label="t.status"><NqStatus :tone="statusTone[i.status as ErrorStatus]">{{ t.statuses[i.status as ErrorStatus] }}</NqStatus></NqCardMeta>
          <NqCardMeta :label="t.events"><span class="tabular-nums">{{ num(i.count) }}</span></NqCardMeta>
          <NqCardMeta :label="t.lastSeen"><NqDateTime :value="i.lastSeen" relative /></NqCardMeta>
        </div>
      </div>
    </template>
    <template #empty><slot name="empty"><NqEmptyState :icon="Bug" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
  </NqEntityList>
</template>
