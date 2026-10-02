<script lang="ts">
import type { Component } from "vue";
import type { TrashBinLabels } from "./strings";
import type { TrashDateInput } from "./trash-math";

/** What a callback resolves with: nothing on success, or a message to show. */
export type TrashResult = void | { error?: string };

export interface TrashType {
  id: string;
  label: string;
  labelAr?: string;
  /** A lucide-vue-next icon. */
  icon?: Component;
}

export interface TrashItem {
  id: string;
  /** What the item was called. Shown as written, in its own direction. */
  name: string;
  /** A `TrashType` id. */
  type?: string;
  /** Second line under the name: the folder it lived in, an amount, a count. */
  detail?: string;
  deletedAt: TrashDateInput;
  deletedBy?: string;
  /** Overrides the bin's retention for this one item. */
  purgeAt?: TrashDateInput | null;
}

export interface TrashBinProps {
  items: readonly TrashItem[];
  /** Kinds of item. Adds an icon, a label and a filter. */
  types?: readonly TrashType[];
  /** Days an item stays before it is deleted for good. `0` or `null` keeps items until the trash is emptied. Default 30. */
  retentionDays?: number | null;
  /** Restore these items. The list is yours: remove them from `items` when it resolves. */
  onRestore?: (ids: string[]) => Promise<TrashResult> | TrashResult;
  /** Delete these items for good, after the user confirms. */
  onDelete?: (ids: string[]) => Promise<TrashResult> | TrashResult;
  /** Delete everything, after the user confirms. Hides the button when omitted. */
  onEmpty?: () => Promise<TrashResult> | TrashResult;
  /** Called with a short message after a successful action, for a toast. */
  onNotify?: (message: string) => void;
  /** The clock, for a stable story or test. Default: the current time. */
  now?: TrashDateInput;
  loading?: boolean;
  error?: string | boolean;
  onRetry?: () => void;
  /** Heading above the list. Pass `null` to hide it. */
  title?: string | null;
  locale?: string;
  labels?: TrashBinLabels;
  class?: string;
}
</script>

<script setup lang="ts">
import { FileText, RotateCcw, Trash2 } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { NqEntityList } from "../entity-list";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { STRINGS } from "./strings";
import { type TrashRetention, type TrashUrgency, trashRetention } from "./trash-math";

// The trash of an app: what was deleted, who deleted it, how long it stays, and buttons to restore it or delete it for
// good. Built on EntityList. Deleting for good always asks first. Presentational: you keep the items.
const props = withDefaults(defineProps<TrashBinProps>(), {
  types: undefined,
  retentionDays: 30,
  onRestore: undefined,
  onDelete: undefined,
  onEmpty: undefined,
  onNotify: undefined,
  now: undefined,
  loading: false,
  error: undefined,
  onRetry: undefined,
  title: undefined,
  locale: undefined,
  labels: undefined,
  class: undefined,
});

type Confirm = { kind: "delete"; ids: string[] } | { kind: "empty" };
const URGENCY_VARIANT: Record<TrashUrgency, "neutral" | "warning" | "danger" | "outline"> = { safe: "neutral", soon: "warning", urgent: "danger", expired: "danger", kept: "outline" };

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const confirm = ref<Confirm | null>(null);
const busy = ref(false);
const failure = ref<string | null>(null);
const dialogError = ref<string | null>(null);

const clock = computed(() => props.now ?? Date.now());
const retentionOf = (item: TrashItem): TrashRetention => trashRetention(item.deletedAt, { retentionDays: props.retentionDays, purgeAt: item.purgeAt, now: clock.value });
const typeOf = (item: TrashItem) => props.types?.find((x) => x.id === item.type);
const typeLabel = (type: TrashType | undefined) => (type ? (ar.value ? type.labelAr || type.label : type.label) : t.value.unknownType);
const byId = computed(() => new Map(props.items.map((item) => [item.id, item])));

async function run(action: (() => Promise<TrashResult> | TrashResult) | undefined, done: string, sink: (message: string | null) => void): Promise<boolean> {
  if (!action) return false;
  busy.value = true;
  sink(null);
  try {
    const result = await action();
    if (result && typeof result === "object" && result.error) {
      sink(result.error);
      return false;
    }
    props.onNotify?.(done);
    return true;
  } catch {
    sink(t.value.error);
    return false;
  } finally {
    busy.value = false;
  }
}
const setFailure = (m: string | null) => (failure.value = m);
const setDialogError = (m: string | null) => (dialogError.value = m);
const restore = (ids: string[]) => run(() => props.onRestore?.(ids), t.value.restored(ids.length), setFailure);

async function confirmed() {
  const c = confirm.value;
  if (!c) return;
  const ok = c.kind === "empty" ? await run(props.onEmpty, t.value.trashEmptied, setDialogError) : await run(() => props.onDelete?.(c.ids), t.value.deletedDone(c.ids.length), setDialogError);
  if (ok) confirm.value = null;
}
function askDelete(ids: string[]) {
  dialogError.value = null;
  confirm.value = { kind: "delete", ids };
}
function askEmpty() {
  dialogError.value = null;
  confirm.value = { kind: "empty" };
}
async function restoreSelected(rows: TrashItem[], clear: () => void) {
  if (await restore(rows.map((r) => r.id))) clear();
}

function timeLeftText(r: TrashRetention) {
  const s = t.value;
  if (r.urgency === "kept") return s.kept;
  if (r.expired) return s.due;
  if (r.daysLeft === 1 && r.hoursLeft !== null && r.hoursLeft < 24) return s.hoursLeft(r.hoursLeft);
  return s.daysLeft(r.daysLeft ?? 0);
}

const columns = computed<DataTableColumn<TrashItem>[]>(() => {
  const s = t.value;
  return [
    {
      id: "name",
      header: s.name,
      label: s.name,
      sortValue: (row) => row.name,
      searchValue: (row) => `${row.name} ${row.detail ?? ""} ${row.deletedBy ?? ""}`,
      cell: (row) =>
        h("span", { class: "flex min-w-0 items-center gap-2.5" }, [
          h(typeOf(row)?.icon ?? FileText, { "aria-hidden": "true", class: "size-4 shrink-0 text-muted-foreground" }),
          h("span", { class: "flex min-w-0 flex-col" }, [
            h("bdi", { dir: "auto", class: "truncate text-body text-foreground" }, row.name),
            row.detail ? h("bdi", { dir: "auto", class: "truncate text-caption text-muted-foreground" }, row.detail) : null,
          ]),
        ]),
    },
    {
      id: "type",
      header: s.type,
      label: s.type,
      sortValue: (row) => typeLabel(typeOf(row)),
      filterValue: (row) => row.type ?? "",
      cell: (row) => h(NqBadge, { variant: "outline" }, () => typeLabel(typeOf(row))),
    },
    {
      id: "deleted",
      header: s.deleted,
      label: s.deleted,
      sortValue: (row) => new Date(row.deletedAt),
      cell: (row) => h(NqDateTime, { value: row.deletedAt, relative: true, class: "text-body-sm text-muted-foreground" }),
    },
    {
      id: "deletedBy",
      header: s.deletedBy,
      label: s.deletedBy,
      sortValue: (row) => row.deletedBy ?? "",
      defaultHidden: false,
      cell: (row) => (row.deletedBy ? h("bdi", { dir: "auto", class: "text-body-sm text-muted-foreground" }, row.deletedBy) : h("span", { class: "text-muted-foreground" }, "-")),
    },
    {
      id: "timeLeft",
      header: s.timeLeft,
      label: s.timeLeft,
      sortValue: (row) => retentionOf(row).purgeAt?.getTime() ?? Number.POSITIVE_INFINITY,
      cell: (row) => {
        const r = retentionOf(row);
        return h(
          NqBadge,
          { variant: URGENCY_VARIANT[r.urgency], title: r.purgeAt ? s.purgeOn(r.purgeAt.toLocaleDateString(ar.value ? "ar-u-nu-latn" : "en")) : undefined, "data-urgency": r.urgency },
          () => timeLeftText(r),
        );
      },
    },
  ];
});

const rowActions = (row: TrashItem): DataTableRowAction[] => [
  { id: "restore", label: t.value.restore, icon: RotateCcw, disabled: busy.value || !props.onRestore, onSelect: () => void restore([row.id]) },
  { id: "delete", label: t.value.delete, icon: Trash2, danger: true, group: "danger", disabled: busy.value || !props.onDelete, onSelect: () => askDelete([row.id]) },
];

const facets = computed(() =>
  props.types?.length
    ? [
        {
          id: "type",
          title: t.value.types,
          options: props.types.map((type) => ({ value: type.id, label: ar.value ? type.labelAr || type.label : type.label })),
          getValues: (row: TrashItem) => (row.type ? [row.type] : []),
        },
      ]
    : undefined,
);
const actions = computed(() => (props.onEmpty && props.items.length > 0 ? [{ id: "empty", label: t.value.empty, icon: Trash2, danger: true, disabled: busy.value, onSelect: askEmpty }] : undefined));

const confirmName = computed(() => (confirm.value?.kind === "delete" && confirm.value.ids.length === 1 ? byId.value.get(confirm.value.ids[0] as string)?.name : undefined));
const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
const dialogTitle = computed(() => {
  const c = confirm.value;
  if (c?.kind === "empty") return t.value.emptyDialogTitle;
  if (c?.kind === "delete" && c.ids.length === 1 && confirmName.value) return t.value.deleteTitle(confirmName.value);
  return t.value.deleteTitleMany(c?.kind === "delete" ? c.ids.length : 0);
});
function setOpen(open: boolean) {
  if (!open && !busy.value) confirm.value = null;
}
</script>

<template>
  <div data-slot="trash-bin" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <h2 v-if="heading" class="text-title text-foreground">{{ heading }}</h2>
    <NqAlert tone="info" :icon="Trash2">{{ retentionDays && retentionDays > 0 ? t.notice(retentionDays) : t.noticeKept }}</NqAlert>
    <NqAlert v-if="failure" tone="danger" dismissible @dismiss="failure = null">{{ failure }}</NqAlert>
    <NqEntityList
      :data="[...items]"
      :columns="columns"
      :get-row-id="(row: TrashItem) => row.id"
      :label="t.listLabel"
      :search-placeholder="t.search"
      :facets="facets"
      :default-sort="{ id: 'timeLeft', direction: 'asc' }"
      :page-size="20"
      :loading="loading"
      :error="error"
      :on-retry="onRetry"
      :row-label="(row: TrashItem) => row.name"
      :row-actions="rowActions"
      :actions="actions"
    >
      <template #bulk="{ selectedRows, clearSelection }">
        <NqButton v-if="onRestore" type="button" variant="secondary" size="sm" :disabled="busy" @click="restoreSelected(selectedRows, clearSelection)">
          <RotateCcw aria-hidden="true" />
          {{ t.restoreSelected }}
        </NqButton>
        <NqButton v-if="onDelete" type="button" variant="danger" size="sm" :disabled="busy" @click="askDelete(selectedRows.map((r: TrashItem) => r.id))">
          <Trash2 aria-hidden="true" />
          {{ t.deleteSelected }}
        </NqButton>
      </template>
      <template #card="{ row }">
        <div class="flex min-w-0 flex-col gap-2">
          <div class="flex min-w-0 items-start gap-2.5 pe-(--entity-card-controls)">
            <component :is="typeOf(row)?.icon ?? FileText" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div class="flex min-w-0 flex-col">
              <bdi dir="auto" class="truncate text-label text-foreground">{{ row.name }}</bdi>
              <bdi v-if="row.detail" dir="auto" class="truncate text-caption text-muted-foreground">{{ row.detail }}</bdi>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <NqBadge variant="outline">{{ typeLabel(typeOf(row)) }}</NqBadge>
            <NqBadge :variant="URGENCY_VARIANT[retentionOf(row).urgency]" :data-urgency="retentionOf(row).urgency">{{ timeLeftText(retentionOf(row)) }}</NqBadge>
          </div>
          <p class="text-caption text-muted-foreground">
            <NqDateTime :value="row.deletedAt" relative />
            <template v-if="row.deletedBy">
              {{ " · " }}<bdi dir="auto">{{ row.deletedBy }}</bdi>
            </template>
          </p>
        </div>
      </template>
      <template #empty>
        <NqEmptyState :icon="Trash2" :title="t.emptyTitle" :description="t.emptyBody" />
      </template>
    </NqEntityList>
    <NqAlertDialog :open="confirm !== null" @update:open="setOpen">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ dialogTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ confirm?.kind === "empty" ? t.emptyDialogBody(items.length) : t.deleteBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="dialogError" tone="danger" role="alert">{{ dialogError }}</NqAlert>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="busy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton type="button" variant="danger" :loading="busy" @click="confirmed()">{{ confirm?.kind === "empty" ? t.confirmEmpty : t.confirmDelete }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
