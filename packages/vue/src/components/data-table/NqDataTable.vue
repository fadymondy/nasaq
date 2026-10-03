<script setup lang="ts" generic="T">
import { ChevronRight, Search, TriangleAlert } from "lucide-vue-next";
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, useId, watch, type VNodeChild } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { openContextMenuAt } from "../context-menu";
import { formatDate, formatNumber } from "../numeric";
import { NqSpinner } from "../spinner";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { NqSwitch } from "../switch";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow, type TableDensity } from "../table";
import { cellKey, coerceEditValue, nextCell, sameCellValue, type CellValue } from "./cell-edit-logic";
import { pinOffsets } from "./data-table-logic";
import NqCellChoiceEditor from "./NqCellChoiceEditor.vue";
import NqCellTextEditor from "./NqCellTextEditor.vue";
import NqDataTableRow from "./NqDataTableRow.vue";
import NqDataTableRowActions from "./NqDataTableRowActions.vue";
import NqDataTableSortHead from "./NqDataTableSortHead.vue";
import { NqDtRender } from "./render";
import { dataTableStrings, type DataTableLabels } from "./strings";
import { columnName, type CellEditMove, type DataTableCellEditResult, type DataTableColumn, type DataTableInstance, type DataTableRowAction } from "./use-data-table";

// The Table, driven by useDataTable: sortable headers, selection, row actions (⋯ menu and context menu), roving row
// focus (↑ ↓ Home End, Enter to open, Space to select, Shift+F10 for the menu), in-cell editing, and loading, empty
// and error states.
const props = withDefaults(defineProps<{
  table: DataTableInstance<T>;
  /** Accessible name of the table. Localise it. */
  label: string;
  /** Plain-text name of a row, for "Select MH-728" and "Actions for MH-728". Defaults to the row id. */
  rowLabel?: (row: T) => string;
  /** Makes rows activatable: click, or Enter on the focused row. Clicks on controls inside the row don't count. */
  onRowClick?: (row: T) => void;
  /** Menu behind ⋯ at the row's inline end. The same actions open as a context menu at the pointer. */
  rowActions?: (row: T) => DataTableRowAction[];
  /** Open `rowActions` as a context menu on context-click. Default true. */
  contextMenu?: boolean;
  /** Saves an in-cell edit (columns with `edit`). Resolve with `{ error }` or throw to roll the cell back. */
  onCellEdit?: (row: T, columnId: string, value: CellValue) => DataTableCellEditResult | Promise<DataTableCellEditResult>;
  /** Content under a row, shown by its chevron (or → / ← on the focused row). Return vnodes (use `h`). */
  renderExpanded?: (row: T) => VNodeChild;
  /** Rows that have details. Default: every row. */
  canExpand?: (row: T) => boolean;
  loading?: boolean;
  /** Replaces the rows with an error state. Pass a message, or `true` for the default. */
  error?: string | boolean;
  onRetry?: () => void;
  density?: TableDensity;
  frame?: boolean;
  bordered?: boolean;
  striped?: boolean;
  hover?: boolean;
  labels?: Partial<DataTableLabels>;
}>(), { contextMenu: true, hover: true, density: "default", error: undefined });
defineOptions({ inheritAttrs: false });

const INTERACTIVE = "a,button,input,select,textarea,[role=checkbox],[role=menuitem],[role=switch],[contenteditable=true]";
// Ids of the utility columns, for pin offsets.
const SELECT_COL = "__nq-select";
const EXPAND_COL = "__nq-expand";
const ACTIONS_COL = "__nq-actions";
const isMenuKey = (event: KeyboardEvent) => (event.key === "F10" && event.shiftKey) || event.key === "ContextMenu";
const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
type Hue = "gray" | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink";

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => dataTableStrings(locale.value, props.labels));
const uid = useId();
const grid = ref<{ $el: HTMLElement } | null>(null);
const bodyEl = () => grid.value?.$el.querySelector("tbody") ?? null;
const headRowEl = () => grid.value?.$el.querySelector("thead tr") ?? null;

const rows = computed(() => props.table.rows);
const visibleColumns = computed(() => props.table.visibleColumns);
const selectable = computed(() => props.table.selectable);
const getRowId = (row: T) => props.table.getRowId(row);
const expandable = computed(() => !!props.renderExpanded);
const colSpan = computed(() => visibleColumns.value.length + (selectable.value ? 1 : 0) + (expandable.value ? 1 : 0) + (props.rowActions ? 1 : 0));
const active = ref(0);
const current = computed(() => Math.min(active.value, Math.max(0, rows.value.length - 1)));
const nameOf = (row: T) => props.rowLabel?.(row) ?? getRowId(row);
const canExpandRow = (row: T) => props.canExpand?.(row) ?? true;
const isOpen = (row: T) => expandable.value && canExpandRow(row) && props.table.expanded.has(getRowId(row));

/* ---- pinning: the utility columns follow the side they sit on ---- */
const hasStart = computed(() => visibleColumns.value.some((c) => props.table.pinOf(c.id) === "start"));
const hasEnd = computed(() => visibleColumns.value.some((c) => props.table.pinOf(c.id) === "end"));
const pinFor = (id: string): "start" | "end" | null =>
  id === SELECT_COL || id === EXPAND_COL ? (hasStart.value ? "start" : null) : id === ACTIONS_COL ? (hasEnd.value ? "end" : null) : props.table.pinOf(id);
const lastStart = computed(() => [...visibleColumns.value].reverse().find((c) => props.table.pinOf(c.id) === "start")?.id);
const firstEnd = computed(() => visibleColumns.value.find((c) => props.table.pinOf(c.id) === "end")?.id);
const offsets = ref<Record<string, number>>({});
const pinKey = computed(() => `${hasStart.value}|${hasEnd.value}|${visibleColumns.value.map((c) => `${c.id}:${props.table.pinOf(c.id) ?? ""}`).join(",")}`);
let observer: ResizeObserver | null = null;
function measure() {
  const row = headRowEl();
  if (!row || (!hasStart.value && !hasEnd.value)) {
    if (Object.keys(offsets.value).length) offsets.value = {};
    return;
  }
  const cells = Array.from(row.querySelectorAll<HTMLElement>("th[data-col]"));
  const next = pinOffsets(cells.map((th) => ({ id: th.dataset.col!, pin: pinFor(th.dataset.col!), width: th.getBoundingClientRect().width })));
  if (JSON.stringify(offsets.value) !== JSON.stringify(next)) offsets.value = next;
}
function observe() {
  observer?.disconnect();
  const row = headRowEl();
  if (!row || typeof ResizeObserver === "undefined" || (!hasStart.value && !hasEnd.value)) return;
  observer = new ResizeObserver(measure);
  for (const th of Array.from(row.querySelectorAll("th"))) observer.observe(th);
}
onMounted(() => {
  measure();
  observe();
});
watch(
  [pinKey, () => props.table.sizes],
  async () => {
    await nextTick();
    measure();
    observe();
  },
  { flush: "post" },
);
onBeforeUnmount(() => observer?.disconnect());

/** Sticky placement and a solid background for a pinned cell, so scrolled cells pass under it. */
function pinClass(id: string, head = false): string | undefined {
  const side = pinFor(id);
  if (!side) return undefined;
  const edge = (side === "start" && id === (lastStart.value ?? "")) || (side === "end" && id === (firstEnd.value ?? ""));
  return cn(
    "sticky z-[1] bg-[var(--nq-data-table-pin-bg)]",
    head
      ? props.frame && "bg-[image:linear-gradient(var(--nq-data-table-head-tint),var(--nq-data-table-head-tint))]"
      : cn(
          props.striped && "group-even/row:bg-[image:linear-gradient(var(--nq-data-table-stripe),var(--nq-data-table-stripe))]",
          props.hover && "group-hover/row:bg-[image:linear-gradient(var(--nq-hover),var(--nq-hover))]",
          "group-data-[state=selected]/row:bg-[image:linear-gradient(var(--nq-selected),var(--nq-selected))]",
        ),
    edge && "after:pointer-events-none after:absolute after:inset-y-0 after:w-px after:bg-border",
    edge && (side === "start" ? "after:end-0" : "after:start-0"),
  );
}
function pinStyle(id: string) {
  const side = pinFor(id);
  if (!side) return undefined;
  return side === "start" ? { insetInlineStart: `${offsets.value[id] ?? 0}px` } : { insetInlineEnd: `${offsets.value[id] ?? 0}px` };
}
/** class, style and data-pin for a body cell. */
const cellAttrs = (id: string, extra?: string) => ({ class: cn(extra, pinClass(id)), style: pinStyle(id), "data-pin": pinFor(id) ?? undefined });
/** The same for a header cell, plus data-col for measuring. */
const headAttrs = (id: string, extra?: string) => ({ class: cn(extra, pinClass(id, true)), style: pinStyle(id), "data-pin": pinFor(id) ?? undefined, "data-col": id });
const alignClass = (align: DataTableColumn<T>["align"]) => (align === "end" ? "text-end" : align === "center" ? "text-center" : undefined);
const tableStyle = computed(() => ({
  "--nq-data-table-pin-bg": props.frame ? "var(--card)" : "var(--background)",
  "--nq-data-table-head-tint": "color-mix(in oklab, var(--secondary) 50%, transparent)",
  "--nq-data-table-stripe": "color-mix(in oklab, var(--secondary) 40%, transparent)",
}));

/* ---- in-cell editing state ---- */
type Editing = { rowId: string; colId: string; seed?: string };
const editing = ref<Editing | null>(null);
const invalid = ref<{ key: string; message: string } | null>(null);
const pending = ref<Record<string, CellValue>>({});
const failed = ref<Record<string, string>>({});
const announce = ref("");
const focusReq = ref<{ rowId: string; colId: string; edit: boolean } | null>(null);
const canEdit = computed(() => !!props.onCellEdit);
const kindOf = (c: DataTableColumn<T>) => c.edit?.type ?? "text";

const cellAt = (rowId: string, colId: string) =>
  Array.from(bodyEl()?.querySelectorAll<HTMLElement>("[data-cell-row]") ?? []).find((el) => el.dataset.cellRow === rowId && el.dataset.cellCol === colId);
const isEditable = (row: T, column: DataTableColumn<T>) => canEdit.value && !!column.edit && !column.edit.disabled?.(row) && !(cellKey(getRowId(row), column.id) in pending.value);

/** The value an editor starts from: `edit.value`, else the column's sort or search value. */
function initialEditValue(column: DataTableColumn<T>, row: T): CellValue {
  const edit = column.edit;
  const raw = edit?.value ? edit.value(row) : (column.sortValue?.(row) ?? column.searchValue?.(row));
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return raw === undefined ? null : (raw as CellValue);
}

/** How a saved-but-not-yet-confirmed value reads while `onCellEdit` is pending. */
function pendingView(column: DataTableColumn<T>, value: CellValue): VNodeChild {
  if (value === null || value === "") return h("span", { class: "text-muted-foreground/60" }, "—");
  const kind = kindOf(column);
  if (kind === "number") return h("span", { class: "tabular-nums" }, formatNumber(Number(value), locale.value));
  if (kind === "date") return h("span", formatDate(`${String(value)}T00:00:00`, locale.value));
  if (kind === "select") {
    const option = column.edit?.options?.find((o) => o.value === value);
    const hue = (HUES.includes(option?.hue ?? "") ? option!.hue : "gray") as Hue;
    return h(NqBadge, { variant: "tag", hue }, () => option?.label ?? String(value));
  }
  return h("span", String(value));
}

watch(focusReq, async (req) => {
  if (!req) return;
  focusReq.value = null;
  if (req.edit) editing.value = { rowId: req.rowId, colId: req.colId };
  else {
    await nextTick();
    cellAt(req.rowId, req.colId)?.focus();
  }
});

function dropFailed(key: string) {
  if (!(key in failed.value)) return;
  const { [key]: _drop, ...rest } = failed.value;
  failed.value = rest;
}
function beginEdit(row: T, column: DataTableColumn<T>, seed?: string) {
  if (!isEditable(row, column)) return;
  if (kindOf(column) === "switch") return;
  dropFailed(cellKey(getRowId(row), column.id));
  invalid.value = null;
  editing.value = { rowId: getRowId(row), colId: column.id, seed };
}
function cancelEdit(rowId: string, colId: string) {
  editing.value = null;
  invalid.value = null;
  focusReq.value = { rowId, colId, edit: false };
}
function moveFrom(rowId: string, colId: string, move: "down" | "up" | "right" | "left", edit: boolean) {
  const from = { row: rows.value.findIndex((r) => getRowId(r) === rowId), col: visibleColumns.value.findIndex((c) => c.id === colId) };
  if (from.row < 0 || from.col < 0) return;
  const to = nextCell(from, move, rows.value.length, visibleColumns.value.length, (r, c) => {
    const rowAt = rows.value[r];
    const col = visibleColumns.value[c];
    return !!rowAt && !!col && isEditable(rowAt, col);
  });
  const target = to ? { rowId: getRowId(rows.value[to.row]!), colId: visibleColumns.value[to.col]!.id } : { rowId, colId };
  focusReq.value = { ...target, edit: edit && !!to && kindOf(visibleColumns.value[to.col]!) !== "switch" };
}

/** Validates, saves and moves on. Returns false when the editor must stay open. */
function commitCell(row: T, column: DataTableColumn<T>, raw: string | CellValue, move: CellEditMove): boolean {
  const edit = column.edit!;
  const kind = edit.type ?? "text";
  const rowId = getRowId(row);
  const key = cellKey(rowId, column.id);
  const reject = (message: string) => {
    // Leaving the cell with an invalid value abandons the edit; Enter and Tab keep it open with the message.
    if (move === "none") {
      editing.value = null;
      invalid.value = null;
      return true;
    }
    invalid.value = { key, message };
    return false;
  };

  let value: CellValue;
  if (typeof raw === "string" && (kind === "number" || kind === "date" || kind === "text")) {
    const parsed = coerceEditValue(kind, raw);
    if (!parsed.ok) return reject(parsed.reason === "number" ? t.value.invalidNumber : t.value.invalidDate);
    value = parsed.value;
  } else {
    value = raw as CellValue;
  }
  const message = edit.validate?.(value, row);
  if (message) return reject(message);

  invalid.value = null;
  editing.value = null;
  const step = move === "down" ? "down" : move === "right" ? "right" : move === "left" ? "left" : null;
  const go = () => (step ? moveFrom(rowId, column.id, step, step !== "down") : move === "none" ? undefined : (focusReq.value = { rowId, colId: column.id, edit: false }));

  if (sameCellValue(initialEditValue(column, row), value) || !props.onCellEdit) {
    go();
    return true;
  }

  pending.value = { ...pending.value, [key]: value };
  dropFailed(key);
  announce.value = t.value.saving;
  go();
  void (async () => {
    let result: DataTableCellEditResult;
    try {
      result = await props.onCellEdit!(row, column.id, value);
    } catch (e) {
      result = { error: e instanceof Error && e.message ? e.message : t.value.saveFailed };
    }
    const { [key]: _drop, ...rest } = pending.value;
    pending.value = rest;
    const failure = (result as { error?: string } | undefined)?.error;
    if (failure) {
      failed.value = { ...failed.value, [key]: failure };
      announce.value = t.value.saveFailedFor(failure);
    } else {
      announce.value = t.value.saved;
    }
  })();
  return true;
}

function focusRow(index: number) {
  const target = bodyEl()?.querySelectorAll<HTMLTableRowElement>("tr[data-row]")[index];
  if (!target) return;
  active.value = index;
  target.focus();
}
const firstEditable = (row: T) => visibleColumns.value.find((c) => isEditable(row, c) && kindOf(c) !== "switch");

function onRowKeyDown(event: KeyboardEvent, row: T, index: number) {
  if (event.target !== event.currentTarget) return;
  const el = event.currentTarget as HTMLElement;
  const last = rows.value.length - 1;
  const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
  if (move !== undefined) {
    event.preventDefault();
    focusRow(Math.max(0, Math.min(last, move)));
  } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && expandable.value && canExpandRow(row)) {
    const rtl = getComputedStyle(el).direction === "rtl";
    const open = (event.key === "ArrowRight") !== rtl;
    const id = getRowId(row);
    if (open !== props.table.expanded.has(id)) {
      event.preventDefault();
      props.table.toggleExpanded(id);
    }
  } else if (event.key === "F2" && firstEditable(row)) {
    event.preventDefault();
    beginEdit(row, firstEditable(row)!);
  } else if (event.key === "Enter" && props.onRowClick) {
    event.preventDefault();
    props.onRowClick(row);
  } else if (event.key === "Enter" && firstEditable(row)) {
    event.preventDefault();
    beginEdit(row, firstEditable(row)!);
  } else if (event.key === " " && selectable.value) {
    event.preventDefault();
    props.table.toggleRow(getRowId(row));
  } else if (isMenuKey(event)) {
    if (props.contextMenu && props.rowActions?.(row).length && openContextMenuAt(el)) {
      event.preventDefault();
      return;
    }
    const trigger = el.querySelector<HTMLElement>("[data-slot=data-table-row-actions]");
    if (trigger) {
      event.preventDefault();
      trigger.click();
    }
  }
}

function onCellKeyDown(event: KeyboardEvent, row: T, column: DataTableColumn<T>) {
  if (event.target !== event.currentTarget) return;
  const el = event.currentTarget as HTMLElement;
  const rowId = getRowId(row);
  const rtl = getComputedStyle(el).direction === "rtl";
  const kind = kindOf(column);
  const dir = { ArrowDown: "down", ArrowUp: "up", ArrowRight: rtl ? "left" : "right", ArrowLeft: rtl ? "right" : "left" }[event.key] as "down" | "up" | "left" | "right" | undefined;
  if (dir) {
    event.preventDefault();
    event.stopPropagation();
    moveFrom(rowId, column.id, dir, false);
  } else if (event.key === "Enter" || event.key === "F2") {
    event.preventDefault();
    event.stopPropagation();
    beginEdit(row, column);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    el.closest<HTMLElement>("tr[data-row]")?.focus();
  } else if (isMenuKey(event)) {
    if (props.contextMenu && props.rowActions?.(row).length && openContextMenuAt(el)) {
      event.preventDefault();
      event.stopPropagation();
    }
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " " && (kind === "text" || kind === "number")) {
    event.preventDefault();
    event.stopPropagation();
    beginEdit(row, column, event.key);
  }
}

function onRowMouse(event: MouseEvent, row: T) {
  if (!props.onRowClick) return;
  const target = event.target as HTMLElement;
  const hit = target.closest(INTERACTIVE);
  if (hit && hit !== event.currentTarget) return;
  // Clicking an editable cell focuses it; it doesn't open the row.
  if (target.closest("[data-editable]")) return;
  if (window.getSelection()?.toString()) return;
  props.onRowClick(row);
}

/** Everything the template needs to draw one editable cell. */
function cellInfo(row: T, c: DataTableColumn<T>) {
  const edit = c.edit!;
  const kind = kindOf(c);
  const rowId = getRowId(row);
  const key = cellKey(rowId, c.id);
  const isEditing = editing.value?.rowId === rowId && editing.value.colId === c.id;
  const isPending = key in pending.value;
  const shown = isPending ? pending.value[key]! : initialEditValue(c, row);
  return {
    key,
    kind,
    isEditing,
    isPending,
    editable: isEditable(row, c),
    message: invalid.value?.key === key ? invalid.value.message : undefined,
    failure: failed.value[key],
    errorId: `${uid}-err`,
    name: t.value.editCell(edit.label ?? columnName(c), nameOf(row)),
    shown,
    view: isPending ? pendingView(c, shown) : c.cell(row),
    above: rows.value.length > 1 && rows.value[rows.value.length - 1] === row,
  };
}
const skeletonRows = computed(() => Math.min(props.table.pageSize ?? 5, 8));
</script>

<template>
  <NqTable
    ref="grid"
    v-bind="$attrs"
    :label="props.label"
    :aria-busy="props.loading || undefined"
    :density="props.density"
    :frame="props.frame"
    :bordered="props.bordered"
    :striped="props.striped"
    :hover="props.hover"
    :class="cn(props.table.resizable && 'table-fixed')"
    :style="tableStyle"
  >
    <NqTableHeader>
      <NqTableRow>
        <NqTableHead v-if="selectable" v-bind="headAttrs(SELECT_COL, 'w-10 pe-0')">
          <NqCheckbox
            :model-value="props.table.pageSelection === 'all'"
            :indeterminate="props.table.pageSelection === 'some'"
            :disabled="!rows.length || props.loading"
            :aria-label="t.selectAll"
            class="align-middle"
            @update:model-value="props.table.togglePage()"
          />
        </NqTableHead>
        <NqTableHead v-if="expandable" v-bind="headAttrs(EXPAND_COL, 'w-10 pe-0')">
          <span class="sr-only">{{ t.details("") }}</span>
        </NqTableHead>
        <NqDataTableSortHead v-for="c in visibleColumns" :key="c.id" :table="props.table" :column="c" :t="t" :cell="headAttrs(c.id)" />
        <NqTableHead v-if="props.rowActions" v-bind="headAttrs(ACTIONS_COL, 'w-12')">
          <span class="sr-only">{{ t.actions }}</span>
        </NqTableHead>
      </NqTableRow>
    </NqTableHeader>

    <NqTableBody>
      <template v-if="props.loading">
        <NqTableRow v-for="i in skeletonRows" :key="i" aria-hidden="true" class="hover:bg-transparent">
          <NqTableCell v-if="selectable" v-bind="cellAttrs(SELECT_COL, 'w-10 pe-0')"><NqSkeleton class="size-4 rounded-[4px]" /></NqTableCell>
          <NqTableCell v-if="expandable" v-bind="cellAttrs(EXPAND_COL, 'w-10 pe-0')" />
          <NqTableCell v-for="(c, j) in visibleColumns" :key="c.id" v-bind="cellAttrs(c.id)">
            <NqSkeleton class="h-3" :style="{ inlineSize: `${[70, 48, 60, 40, 54][(i - 1 + j) % 5]}%` }" />
          </NqTableCell>
          <NqTableCell v-if="props.rowActions" v-bind="cellAttrs(ACTIONS_COL, 'w-12')" />
        </NqTableRow>
      </template>

      <NqTableRow v-else-if="props.error" class="hover:bg-transparent">
        <NqTableCell :colspan="colSpan" class="h-auto p-0 whitespace-normal">
          <NqErrorState :title="props.error === true ? t.error : props.error" class="border-0">
            <template v-if="props.onRetry" #actions><NqButton size="sm" @click="props.onRetry()">{{ t.retry }}</NqButton></template>
          </NqErrorState>
        </NqTableCell>
      </NqTableRow>

      <NqTableRow v-else-if="!rows.length" class="hover:bg-transparent">
        <NqTableCell :colspan="colSpan" class="h-auto p-0 whitespace-normal">
          <NqEmptyState v-if="props.table.isFiltered" :icon="Search" :title="t.noResults" :description="t.noResultsHint" class="border-0">
            <template #actions><NqButton size="sm" @click="props.table.resetFilters()">{{ t.clearFilters }}</NqButton></template>
          </NqEmptyState>
          <slot v-else name="empty"><NqEmptyState :title="t.empty" class="border-0" /></slot>
        </NqTableCell>
      </NqTableRow>

      <template v-for="(row, index) in rows" v-else :key="getRowId(row)">
        <NqDataTableRow
          :actions="props.rowActions?.(row) ?? []"
          :disabled="!props.contextMenu"
          data-row=""
          :data-state="props.table.selection.has(getRowId(row)) ? 'selected' : undefined"
          :data-expanded="isOpen(row) || undefined"
          :aria-expanded="expandable && canExpandRow(row) ? isOpen(row) : undefined"
          :tabindex="index === current ? 0 : -1"
          :class="
            cn(
              'group/row outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
              props.onRowClick && 'cursor-pointer',
              isOpen(row) && 'border-b-0',
            )
          "
          @focus="(e: FocusEvent) => e.target === e.currentTarget && (active = index)"
          @keydown="onRowKeyDown($event, row, index)"
          @click="onRowMouse($event, row)"
        >
          <NqTableCell v-if="selectable" v-bind="cellAttrs(SELECT_COL, 'w-10 pe-0')">
            <NqCheckbox
              :tabindex="index === current ? 0 : -1"
              :model-value="props.table.selection.has(getRowId(row))"
              :aria-label="t.selectRow(nameOf(row))"
              class="align-middle"
              @update:model-value="props.table.toggleRow(getRowId(row))"
            />
          </NqTableCell>

          <NqTableCell v-if="expandable" v-bind="cellAttrs(EXPAND_COL, 'w-10 pe-0')">
            <NqButton
              v-if="canExpandRow(row)"
              variant="ghost"
              size="icon-sm"
              :tabindex="index === current ? 0 : -1"
              :aria-expanded="isOpen(row)"
              :aria-controls="isOpen(row) ? `${uid}-x-${getRowId(row)}` : undefined"
              :aria-label="t.expandRow(nameOf(row))"
              data-slot="data-table-expand"
              class="text-muted-foreground"
              @click="props.table.toggleExpanded(getRowId(row))"
            >
              <ChevronRight aria-hidden="true" :class="cn('transition-transform duration-150 ease-nq rtl:-scale-x-100', isOpen(row) && 'rotate-90 rtl:-rotate-90')" />
            </NqButton>
          </NqTableCell>

          <template v-for="c in visibleColumns" :key="c.id">
            <NqTableCell v-if="!c.edit" v-bind="cellAttrs(c.id, cn(alignClass(c.align), props.table.resizable && 'overflow-hidden text-ellipsis', c.className))">
              <NqDtRender :content="c.cell(row)" />
            </NqTableCell>

            <template v-else>
              <template v-for="i in [cellInfo(row, c)]" :key="i.key">
                <NqTableCell
                  :data-cell-row="getRowId(row)"
                  :data-cell-col="c.id"
                  :data-editable="i.editable ? '' : undefined"
                  :data-editing="i.isEditing ? '' : undefined"
                  :data-pending="i.isPending ? '' : undefined"
                  :aria-busy="i.isPending || undefined"
                  :aria-invalid="i.failure ? true : undefined"
                  :tabindex="i.editable && i.kind !== 'switch' ? -1 : undefined"
                  v-bind="cellAttrs(c.id, cn('relative outline-none focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus', i.editable && 'cursor-cell', alignClass(c.align), c.className, i.failure && 'bg-nq-danger-soft'))"
                  @keydown="onCellKeyDown($event, row, c)"
                  @dblclick="i.editable && beginEdit(row, c)"
                >
                  <NqSwitch
                    v-if="i.kind === 'switch'"
                    :model-value="i.shown === true"
                    :disabled="!i.editable"
                    :aria-label="i.name"
                    :tabindex="index === current ? 0 : -1"
                    @update:model-value="(v: boolean) => commitCell(row, c, v, 'none')"
                  />
                  <NqCellChoiceEditor
                    v-else-if="i.isEditing && i.kind === 'select'"
                    :label="i.name"
                    :options="c.edit!.options"
                    :value="typeof i.shown === 'boolean' ? String(i.shown) : i.shown"
                    :no-options="t.empty"
                    :clear-label="t.reset"
                    @change="(v: string | null) => commitCell(row, c, v, 'none')"
                    @close="cancelEdit(getRowId(row), c.id)"
                  >
                    <NqDtRender :content="i.view" />
                  </NqCellChoiceEditor>
                  <template v-else-if="i.isEditing && i.kind === 'custom' && c.edit!.render">
                    <span class="invisible"><NqDtRender :content="i.view" /></span>
                    <div class="absolute inset-0 flex items-center bg-card px-2">
                      <NqDtRender
                        :content="
                          c.edit!.render!({
                            row,
                            value: i.shown,
                            commit: (v, move = 'none') => void commitCell(row, c, v, move),
                            cancel: () => cancelEdit(getRowId(row), c.id),
                            error: i.message,
                            errorId: i.errorId,
                            label: i.name,
                          })
                        "
                      />
                    </div>
                    <span
                      v-if="i.message"
                      :id="i.errorId"
                      role="alert"
                      :class="cn('absolute start-0 z-20 max-w-64 rounded-control border border-nq-danger-text/30 bg-card px-2 py-1 text-caption whitespace-normal text-nq-danger-text shadow-md', i.above ? 'bottom-full mb-1' : 'top-full mt-1')"
                    >{{ i.message }}</span>
                  </template>
                  <template v-else-if="i.isEditing && (i.kind === 'text' || i.kind === 'number' || i.kind === 'date')">
                    <span class="invisible"><NqDtRender :content="i.view" /></span>
                    <NqCellTextEditor
                      :type="i.kind"
                      :ariaLabel="i.name"
                      :seeded="editing?.seed !== undefined"
                      :initial="editing?.seed ?? (i.shown === null ? '' : String(i.shown))"
                      :invalid="!!i.message"
                      :described-by="i.message ? i.errorId : undefined"
                      :on-commit="(raw, move) => commitCell(row, c, raw, move)"
                      @cancel="cancelEdit(getRowId(row), c.id)"
                    />
                    <span
                      v-if="i.message"
                      :id="i.errorId"
                      role="alert"
                      :class="cn('absolute start-0 z-20 max-w-64 rounded-control border border-nq-danger-text/30 bg-card px-2 py-1 text-caption whitespace-normal text-nq-danger-text shadow-md', i.above ? 'bottom-full mb-1' : 'top-full mt-1')"
                    >{{ i.message }}</span>
                  </template>
                  <span v-else :class="cn('flex min-w-0 items-center gap-1.5', i.isPending && 'opacity-60')">
                    <span class="min-w-0 flex-1"><NqDtRender :content="i.view" /></span>
                    <NqSpinner v-if="i.isPending" class="size-3.5 shrink-0 text-muted-foreground" />
                    <span v-if="i.failure" class="inline-flex shrink-0 items-center text-nq-danger-text" :title="i.failure">
                      <TriangleAlert aria-hidden="true" class="size-3.5" />
                      <span class="sr-only">{{ t.saveFailedFor(i.failure) }}</span>
                    </span>
                  </span>
                </NqTableCell>
              </template>
            </template>
          </template>

          <NqTableCell v-if="props.rowActions" v-bind="cellAttrs(ACTIONS_COL, 'w-12 pe-2 text-end')">
            <NqDataTableRowActions :actions="props.rowActions(row)" :label="t.rowActions(nameOf(row))" :tabindex="index === current ? 0 : -1" />
          </NqTableCell>
        </NqDataTableRow>

        <NqTableRow v-if="isOpen(row)" data-slot="data-table-expanded" class="hover:bg-transparent">
          <NqTableCell :colspan="colSpan" class="h-auto p-0 whitespace-normal">
            <section :id="`${uid}-x-${getRowId(row)}`" :aria-label="t.details(nameOf(row))" class="border-s-2 border-nq-action/50 bg-secondary/40 px-4 py-3 ps-14">
              <NqDtRender :content="props.renderExpanded!(row)" />
            </section>
          </NqTableCell>
        </NqTableRow>
      </template>
    </NqTableBody>
  </NqTable>
  <span v-if="canEdit" role="status" aria-live="polite" class="sr-only">{{ announce }}</span>
</template>
