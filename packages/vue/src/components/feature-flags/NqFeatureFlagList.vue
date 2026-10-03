<script lang="ts">
import type { FlagState } from "./flag-model";

const STRINGS = {
  en: {
    title: "Feature flags",
    description: "Turn features on per environment, roll them out gradually and stop them fast.",
    flag: "Flag",
    rollout: (env: string) => `Rollout in ${env}`,
    updated: "Updated",
    state: "State",
    states: { killed: "Killed", off: "Off", partial: "Rolling out", on: "On" } as Record<FlagState, string>,
    filter: "Filter flags by name or key…",
    empty: "No feature flags yet",
    create: "New flag",
    open: "Open",
    copyKey: "Copy key",
    remove: "Delete",
    toggleLabel: (env: string) => env,
    killed: "Killed",
    failed: "Could not save this. Try again.",
    tableLabel: "Feature flags",
    by: (name: string) => `by ${name}`,
  },
  ar: {
    title: "مفاتيح الميزات",
    description: "شغّل الميزات لكل بيئة، وأطلقها تدريجيًا، وأوقفها بسرعة.",
    flag: "المفتاح",
    rollout: (env: string) => `الإطلاق في ${env}`,
    updated: "آخر تحديث",
    state: "الحالة",
    states: { killed: "موقوف طارئًا", off: "متوقف", partial: "إطلاق تدريجي", on: "يعمل" } as Record<FlagState, string>,
    filter: "تصفية المفاتيح بالاسم أو المفتاح…",
    empty: "لا مفاتيح ميزات بعد",
    create: "مفتاح جديد",
    open: "فتح",
    copyKey: "نسخ المفتاح",
    remove: "حذف",
    toggleLabel: (env: string) => env,
    killed: "موقوف طارئًا",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    tableLabel: "مفاتيح الميزات",
    by: (name: string) => `بواسطة ${name}`,
  },
};
export type FeatureFlagsLabels = typeof STRINGS.en;
</script>

<script setup lang="ts">
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatus } from "../status";
import { flagState, type FeatureFlag, type FlagEnvironmentDef } from "./flag-model";

type Result = void | { error?: string };

const STATE_TONE: Record<FlagState, "danger" | "neutral" | "warning" | "success"> = { killed: "danger", off: "neutral", partial: "warning", on: "success" };

// The flag list: name and key, an on/off switch per environment right in the row, the rollout percentage and state in one
// environment, and when it last changed. Killed flags show as killed whatever their switches say. A row opens the flag.
const props = withDefaults(
  defineProps<{
    flags: readonly FeatureFlag[];
    environments: readonly FlagEnvironmentDef[];
    /** Turns a flag on or off in one environment: the switch in the cell. Without it the switches are read only. */
    onToggle?: (key: string, environmentId: string, enabled: boolean) => Promise<Result> | Result;
    onOpen?: (key: string) => void;
    onCreate?: () => void;
    onDelete?: (key: string) => Promise<Result> | Result;
    /** Environment whose rollout % and state columns show. Default: the last one (production). */
    rolloutEnvironment?: string;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    class?: HTMLAttributes["class"];
    labels?: Partial<FeatureFlagsLabels>;
  }>(),
  { onToggle: undefined, onOpen: undefined, onCreate: undefined, onDelete: undefined, rolloutEnvironment: undefined, title: undefined, description: undefined, pageSize: 8, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const failed = ref<string | null>(null);
const rolloutEnv = computed(() => props.environments.find((e) => e.id === props.rolloutEnvironment) ?? props.environments[props.environments.length - 1]);

async function run(fn: () => Promise<Result> | Result) {
  failed.value = null;
  try {
    const out = await fn();
    if (out && out.error) failed.value = out.error;
  } catch {
    failed.value = t.value.failed;
  }
}

const columns = computed<DataTableColumn<FeatureFlag>[]>(() => {
  const tt = t.value;
  const env = rolloutEnv.value;
  const cols: DataTableColumn<FeatureFlag>[] = [
    {
      id: "flag",
      header: tt.flag,
      label: tt.flag,
      hideable: false,
      sortValue: (f) => f.name,
      searchValue: (f) => `${f.name} ${f.key} ${(f.tags ?? []).join(" ")}`,
      cell: (f) =>
        h("span", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "block max-w-[28ch] truncate text-label text-foreground" }, f.name),
          h("bdi", { dir: "ltr", class: "block max-w-[28ch] truncate font-mono text-caption text-muted-foreground" }, f.key),
        ]),
    },
    ...props.environments.map<DataTableColumn<FeatureFlag>>((e) => ({
      id: `env-${e.id}`,
      header: e.label,
      label: e.label,
      align: "center",
      sortValue: (f) => (f.environments[e.id]?.enabled ? 1 : 0),
      edit: props.onToggle ? { type: "switch", value: (f) => Boolean(f.environments[e.id]?.enabled), label: tt.toggleLabel(e.label), disabled: (f) => Boolean(f.killed) } : undefined,
      cell: (f) => h(NqStatus, { tone: f.environments[e.id]?.enabled && !f.killed ? "success" : "neutral" }, () => (f.environments[e.id]?.enabled ? "On" : "Off")),
    })),
  ];
  if (env) {
    cols.push(
      {
        id: "rollout",
        header: tt.rollout(env.label),
        label: tt.rollout(env.label),
        align: "end",
        sortValue: (f) => f.environments[env.id]?.rollout ?? 0,
        cell: (f) => {
          const pct = f.environments[env.id]?.rollout ?? 0;
          return h("span", { class: "flex items-center justify-end gap-2" }, [
            h("span", { "aria-hidden": "true", class: "h-1.5 w-16 overflow-hidden rounded-full bg-muted" }, [h("span", { class: "block h-full rounded-full bg-primary", style: { inlineSize: `${pct}%` } })]),
            h("span", { class: "w-10 text-end" }, [h(NqNum, { value: pct / 100, format: { style: "percent", maximumFractionDigits: 0 } })]),
          ]);
        },
      },
      {
        id: "state",
        header: tt.state,
        label: tt.state,
        sortValue: (f) => flagState(f, env.id),
        filterValue: (f) => flagState(f, env.id),
        cell: (f) => {
          const s = flagState(f, env.id);
          return h(NqStatus, { tone: STATE_TONE[s] }, () => tt.states[s]);
        },
      },
    );
  }
  cols.push({
    id: "updated",
    header: tt.updated,
    label: tt.updated,
    sortValue: (f) => f.updatedAt,
    cell: (f) => h("span", { class: "flex flex-col" }, [h(NqDateTime, { value: f.updatedAt, relative: true }), f.updatedBy ? h("span", { class: "text-caption text-muted-foreground" }, tt.by(f.updatedBy)) : null]),
  });
  return cols;
});

const table = useDataTable<FeatureFlag>({
  data: () => [...props.flags],
  columns,
  getRowId: (f) => f.key,
  pageSize: props.pageSize,
  defaultSort: { id: "updated", direction: "desc" },
});

function rowActions(f: FeatureFlag): DataTableRowAction[] {
  const tt = t.value;
  return [
    ...(props.onOpen ? [{ id: "open", label: tt.open, icon: ExternalLink, onSelect: () => props.onOpen!(f.key) }] : []),
    { id: "copy", label: tt.copyKey, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(f.key) },
    ...(props.onDelete ? [{ id: "del", label: tt.remove, icon: Trash2, danger: true, group: "z", onSelect: () => void run(() => props.onDelete!(f.key)) }] : []),
  ];
}

async function onCellEdit(row: FeatureFlag, columnId: string, value: unknown) {
  failed.value = null;
  try {
    const out = await props.onToggle!(row.key, columnId.replace(/^env-/, ""), Boolean(value));
    return out && out.error ? { error: out.error } : undefined;
  } catch {
    return { error: t.value.failed };
  }
}

const stateOptions = computed(() => (["on", "partial", "off", "killed"] as const).map((s) => ({ value: s, label: t.value.states[s] })));
</script>

<template>
  <NqCard data-slot="feature-flag-list" :class="props.class">
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
        <NqDataTableFacetFilter v-if="rolloutEnv" :table="table" column="state" :title="t.state" :options="stateOptions" />
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
        :on-row-click="props.onOpen ? (f: FeatureFlag) => props.onOpen!(f.key) : undefined"
        :on-cell-edit="props.onToggle ? onCellEdit : undefined"
      />
      <NqDataTablePagination v-if="props.flags.length > props.pageSize" :table="table" />
    </NqCardContent>
  </NqCard>
</template>
