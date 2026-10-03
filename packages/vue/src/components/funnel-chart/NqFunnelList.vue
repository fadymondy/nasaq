<script lang="ts">
const STRINGS = {
  en: {
    title: "Funnels",
    description: "Saved funnels and how each one converts right now.",
    name: "Funnel",
    steps: "Steps",
    entered: "Entered",
    conversion: "Conversion",
    window: "Window",
    updated: "Updated",
    filter: "Filter funnels…",
    empty: "No funnels yet",
    create: "New funnel",
    open: "Open",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    stepsCount: (n: number) => (n === 1 ? "1 step" : `${n} steps`),
    failed: "Could not do that. Try again.",
    tableLabel: "Funnels",
  },
  ar: {
    title: "أقماع التحويل",
    description: "الأقماع المحفوظة وكم يحوّل كل منها الآن.",
    name: "القمع",
    steps: "الخطوات",
    entered: "دخلوا",
    conversion: "التحويل",
    window: "النافذة",
    updated: "آخر تحديث",
    filter: "تصفية الأقماع…",
    empty: "لا أقماع بعد",
    create: "قمع جديد",
    open: "فتح",
    edit: "تعديل",
    duplicate: "نسخ",
    remove: "حذف",
    stepsCount: (n: number) => (n === 1 ? "خطوة واحدة" : `${n} خطوات`),
    failed: "تعذّر تنفيذ ذلك. حاول مرة أخرى.",
    tableLabel: "أقماع التحويل",
  },
};
export type FunnelListLabels = typeof STRINGS.en;

export interface FunnelSummary {
  id: string;
  name: string;
  /** Number of steps. */
  steps: number;
  /** People that entered the first step in the last run. */
  entered: number;
  /** Last step over first step, 0 to 1. */
  conversion: number;
  /** Already formatted, for example "7 days". */
  window: string;
  /** ISO date. */
  updatedAt: string;
  /** Conversion in the previous run, 0 to 1. Colours the trend. */
  previousConversion?: number;
}
</script>

<script setup lang="ts">
import { Copy, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatus } from "../status";

type Result = void | { error?: string };

// The saved funnels as a table: steps, entrants, conversion with its trend, window and last update. A row opens the funnel.
const props = withDefaults(
  defineProps<{
    funnels: readonly FunnelSummary[];
    /** Row click and Enter on a row. */
    onOpen?: (id: string) => void;
    /** Shows a New funnel button. */
    onCreate?: () => void;
    onEdit?: (id: string) => void;
    onDuplicate?: (id: string) => Promise<Result> | Result;
    onDelete?: (id: string) => Promise<Result> | Result;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    class?: HTMLAttributes["class"];
    labels?: Partial<FunnelListLabels>;
  }>(),
  {
    onOpen: undefined,
    onCreate: undefined,
    onEdit: undefined,
    onDuplicate: undefined,
    onDelete: undefined,
    title: undefined,
    description: undefined,
    pageSize: 8,
    loading: false,
    error: undefined,
    onRetry: undefined,
    labels: undefined,
  },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const failed = ref<string | null>(null);

async function run(fn: () => Promise<Result> | Result) {
  failed.value = null;
  try {
    const out = await fn();
    if (out && out.error) failed.value = out.error;
  } catch {
    failed.value = t.value.failed;
  }
}

const columns = computed<DataTableColumn<FunnelSummary>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "name",
      header: tt.name,
      label: tt.name,
      hideable: false,
      sortValue: (f) => f.name,
      searchValue: (f) => f.name,
      cell: (f) => h("span", { dir: "auto", class: "block max-w-[28ch] truncate text-label text-foreground" }, f.name),
    },
    { id: "steps", header: tt.steps, label: tt.steps, align: "end", sortValue: (f) => f.steps, cell: (f) => tt.stepsCount(f.steps) },
    { id: "entered", header: tt.entered, label: tt.entered, align: "end", sortValue: (f) => f.entered, cell: (f) => h(NqNum, { value: f.entered }) },
    {
      id: "conversion",
      header: tt.conversion,
      label: tt.conversion,
      align: "end",
      sortValue: (f) => f.conversion,
      cell: (f) => {
        const up = f.previousConversion !== undefined ? f.conversion - f.previousConversion : 0;
        return h("span", { class: "flex items-center justify-end gap-2" }, [
          h(NqNum, { value: f.conversion, format: { style: "percent", maximumFractionDigits: 1 } }),
          up !== 0 ? h(NqStatus, { tone: up > 0 ? "success" : "danger" }, () => `${up > 0 ? "+" : "-"}${Math.abs(up * 100).toFixed(1)}`) : null,
        ]);
      },
    },
    { id: "window", header: tt.window, label: tt.window, sortValue: (f) => f.window, cell: (f) => h("span", { class: "text-body-sm text-muted-foreground" }, f.window) },
    {
      id: "updated",
      header: tt.updated,
      label: tt.updated,
      sortValue: (f) => f.updatedAt,
      cell: (f) => h(NqDateTime, { value: f.updatedAt, format: { month: "short", day: "numeric", year: "numeric" } }),
    },
  ];
});

const table = useDataTable<FunnelSummary>({
  data: () => [...props.funnels],
  columns,
  getRowId: (f) => f.id,
  pageSize: props.pageSize,
  defaultSort: { id: "updated", direction: "desc" },
});

function rowActions(f: FunnelSummary): DataTableRowAction[] {
  const tt = t.value;
  return [
    ...(props.onEdit ? [{ id: "edit", label: tt.edit, icon: Pencil, onSelect: () => props.onEdit!(f.id) }] : []),
    ...(props.onDuplicate ? [{ id: "dup", label: tt.duplicate, icon: Copy, onSelect: () => void run(() => props.onDuplicate!(f.id)) }] : []),
    ...(props.onDelete ? [{ id: "del", label: tt.remove, icon: Trash2, danger: true, group: "z", onSelect: () => void run(() => props.onDelete!(f.id)) }] : []),
  ];
}
</script>

<template>
  <NqCard data-slot="funnel-list" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ props.title ?? t.title }}</NqCardTitle>
      <NqCardDescription>{{ props.description ?? t.description }}</NqCardDescription>
      <NqCardAction v-if="props.onCreate">
        <NqButton size="sm" @click="props.onCreate">
          <Plus aria-hidden="true" />
          {{ t.create }}
        </NqButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.filter" />
      </NqDataTableToolbar>
      <NqStatus v-if="failed" tone="danger" role="alert">{{ failed }}</NqStatus>
      <NqDataTable
        :table="table"
        :label="t.tableLabel"
        :loading="props.loading"
        :error="props.error"
        :on-retry="props.onRetry"
        :labels="{ empty: t.empty }"
        :row-actions="rowActions"
        :on-row-click="props.onOpen ? (f: FunnelSummary) => props.onOpen!(f.id) : undefined"
      />
      <NqDataTablePagination v-if="props.funnels.length > props.pageSize" :table="table" />
    </NqCardContent>
  </NqCard>
</template>
