<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Columns3, Copy, Download, Ellipsis, Pencil, Plus, Redo2, Rows3, Search, Trash2, Undo2, X } from "lucide-vue-next";
import { computed, nextTick, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqTooltip } from "../tooltip";
import NqContentCell from "./NqContentCell.vue";
import NqContentChoiceEditor from "./NqContentChoiceEditor.vue";
import NqContentTextEditor from "./NqContentTextEditor.vue";
import {
  blankRow,
  changeColumnType,
  cloneRow,
  coerceCell,
  CONTENT_COLUMN_TYPES,
  emptyCell,
  filterRows,
  insertAt,
  isEmpty,
  makeId,
  moveItem,
  parseOptions,
  pushHistory,
  redoHistory,
  sortRows,
  summarize,
  toCsv,
  undoHistory,
  validateTable,
  type ContentCell,
  type ContentColumn,
  type ContentColumnType,
  type ContentRow,
  type ContentTableValue,
  type History,
  type SortState,
} from "./math";
import { STRINGS, type ContentTableLabels, type ContentTableText } from "./strings";

/**
 * A spreadsheet-like editor for structured content: typed columns (text, number, select, date, checkbox, link, tags),
 * inline editing with keyboard navigation, sort and search, row and column management, undo and redo, validation,
 * column summaries, CSV export and an optional async save.
 */
interface Props {
  /** The columns and the rows (v-model). */
  modelValue?: ContentTableValue;
  defaultValue?: ContentTableValue;
  /** Persist the table. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (value: ContentTableValue) => Promise<void | { error?: string }>;
  /** Called with the CSV text when Export is pressed. Without it the browser downloads `content-table.csv`. */
  onExport?: (csv: string) => void;
  /** Show cells but refuse edits. */
  readOnly?: boolean;
  /** Let people add, rename, retype, reorder and delete columns. Default true. */
  editableColumns?: boolean;
  /** Show the search box. Default true. */
  searchable?: boolean;
  /** Accessible name of the grid. Default "Content table". */
  label?: string;
  /** Max height of the scrolling grid. Default `none`. */
  maxHeight?: string;
  labels?: ContentTableLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  onSave: undefined,
  onExport: undefined,
  readOnly: false,
  editableColumns: true,
  searchable: true,
  label: undefined,
  maxHeight: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: ContentTableValue] }>();

interface Active {
  rowId: string;
  col: number;
}
type Move = "down" | "right" | "left" | "none";
type ColumnDraft = { id: string | null; label: string; type: ContentColumnType; options: string; required: boolean };

const TYPE_KEY = { text: "typeText", number: "typeNumber", select: "typeSelect", date: "typeDate", checkbox: "typeCheckbox", url: "typeUrl", tags: "typeTags" } as const;
const empty: ContentTableValue = { columns: [], rows: [] };

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed<ContentTableText>(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as ContentTableText);
const n = (v: number) => formatNumber(v, locale.value);
const uid = useId();

const hist = ref<History<ContentTableValue>>({ past: [], present: props.defaultValue ?? props.modelValue ?? empty, future: [] });
const current = computed(() => props.modelValue ?? hist.value.present);
const saved = ref<ContentTableValue>(current.value);
const saveState = ref<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
const dirty = computed(() => saved.value !== current.value);

const query = ref("");
const sort = ref<SortState | null>(null);
const selected = ref<ReadonlySet<string>>(new Set());
const active = ref<Active | null>(null);
const editing = ref<{ rowId: string; col: number; seed?: string } | null>(null);
const columnDraft = ref<ColumnDraft | null>(null);
const announce = ref("");
const grid = ref<HTMLElement | null>(null);

function commit(next: ContentTableValue) {
  hist.value = pushHistory({ ...hist.value, present: current.value }, next);
  emit("update:modelValue", next);
  if (saveState.value.status === "error") saveState.value = { status: "idle" };
}
function undo() {
  const h = undoHistory({ ...hist.value, present: current.value });
  if (h.present === current.value) return;
  hist.value = h;
  emit("update:modelValue", h.present);
}
function redo() {
  const h = redoHistory({ ...hist.value, present: current.value });
  if (h.present === current.value) return;
  hist.value = h;
  emit("update:modelValue", h.present);
}

const columns = computed(() => current.value.columns);
const rows = computed(() => current.value.rows);
const view = computed(() => sortRows(filterRows(rows.value, columns.value, query.value), columns.value, sort.value));
const issues = computed(() => validateTable(current.value));
const issueOf = (rowId: string, columnId: string) => issues.value.find((i) => i.rowId === rowId && i.columnId === columnId)?.issue;
const canReorder = computed(() => !query.value.trim() && !sort.value);
const editable = computed(() => !props.readOnly);

// After a structural change, move focus to the cell we asked for once it has rendered.
async function focusCell(rowId: string, col: number) {
  active.value = { rowId, col };
  await nextTick();
  grid.value?.querySelector<HTMLElement>(`[data-row="${CSS.escape(rowId)}"][data-col="${col}"]`)?.focus();
}

watch(rows, (list) => {
  const ids = new Set(list.map((r) => r.id));
  const next = [...selected.value].filter((id) => ids.has(id));
  if (next.length !== selected.value.size) selected.value = new Set(next);
});

/* ---------------------------------------------------------------- mutations */

function setCell(rowId: string, columnId: string, next: ContentCell) {
  commit({ ...current.value, rows: rows.value.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: next } } : r)) });
}
function addRow(at?: number) {
  const row = blankRow(columns.value);
  commit({ ...current.value, rows: insertAt(rows.value, at ?? rows.value.length, row) });
  if (columns.value.length) void focusCell(row.id, 0);
  announce.value = t.value.announceRowAdded;
}
function deleteRows(ids: string[]) {
  if (!ids.length) return;
  const set = new Set(ids);
  commit({ ...current.value, rows: rows.value.filter((r) => !set.has(r.id)) });
  selected.value = new Set();
  announce.value = t.value.announceRowsDeleted(n(ids.length));
}
function duplicateRow(row: ContentRow) {
  const copy = cloneRow(row);
  commit({ ...current.value, rows: insertAt(rows.value, rows.value.indexOf(row) + 1, copy) });
  void focusCell(copy.id, active.value?.col ?? 0);
}
function moveRow(row: ContentRow, delta: number) {
  const from = rows.value.indexOf(row);
  commit({ ...current.value, rows: moveItem(rows.value, from, from + delta) });
}
function openNewColumn() {
  columnDraft.value = { id: null, label: "", type: "text", options: "", required: false };
}
function openColumn(column: ContentColumn) {
  columnDraft.value = { id: column.id, label: column.label, type: column.type, options: (column.options ?? []).map((o) => o.label).join("\n"), required: Boolean(column.required) };
}
function applyColumn() {
  const draft = columnDraft.value;
  if (!draft || !draft.label.trim()) return;
  const options = draft.type === "select" || draft.type === "tags" ? parseOptions(draft.options) : undefined;
  if (draft.id === null) {
    const column: ContentColumn = { id: makeId("col"), label: draft.label.trim(), type: draft.type, options, required: draft.required || undefined };
    commit({ columns: [...columns.value, column], rows: rows.value.map((r) => ({ ...r, cells: { ...r.cells, [column.id]: emptyCell(column.type) } })) });
    announce.value = t.value.announceColumnAdded(column.label);
  } else {
    const id = draft.id;
    let next = changeColumnType(current.value, id, draft.type);
    next = { ...next, columns: next.columns.map((c) => (c.id === id ? { ...c, label: draft.label.trim(), options, required: draft.required || undefined } : c)) };
    commit(next);
  }
  columnDraft.value = null;
}
function deleteColumn(column: ContentColumn) {
  commit({
    columns: columns.value.filter((c) => c.id !== column.id),
    rows: rows.value.map((r) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => k !== column.id)) })),
  });
  if (sort.value?.column === column.id) sort.value = null;
  active.value = null;
  announce.value = t.value.announceColumnDeleted(column.label);
}
function moveColumn(index: number, delta: number) {
  commit({ ...current.value, columns: moveItem(columns.value, index, index + delta) });
}
function sortBy(column: ContentColumn, direction: "asc" | "desc" | null) {
  if (direction === null) {
    sort.value = null;
    return;
  }
  sort.value = { column: column.id, direction };
  announce.value = t.value.announceSorted(column.label, direction === "asc" ? t.value.ascending : t.value.descending);
}
async function save() {
  if (!props.onSave || issues.value.length) return;
  const value = current.value;
  saveState.value = { status: "saving" };
  try {
    const result = await props.onSave(value);
    if (result && result.error) {
      saveState.value = { status: "error", message: result.error };
      return;
    }
    saved.value = value;
    saveState.value = { status: "idle" };
  } catch (error) {
    saveState.value = { status: "error", message: error instanceof Error ? error.message : t.value.saveFailed };
  }
}
function exportCsv() {
  const csv = toCsv(current.value);
  if (props.onExport) return props.onExport(csv);
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "content-table.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------- keyboard */

const rowIndex = (rowId: string) => view.value.findIndex((r) => r.id === rowId);
function moveActive(dRow: number, dCol: number, from: Active) {
  const r = Math.max(0, Math.min(view.value.length - 1, rowIndex(from.rowId) + dRow));
  const c = Math.max(0, Math.min(columns.value.length - 1, from.col + dCol));
  const row = view.value[r];
  if (row) void focusCell(row.id, c);
}

function onCellKeyDown(e: KeyboardEvent, row: ContentRow, col: number) {
  if (e.target !== e.currentTarget) return;
  const column = columns.value[col];
  if (!column) return;
  const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === "rtl";
  const here = { rowId: row.id, col };
  const step = (dCol: number) => moveActive(0, rtl ? -dCol : dCol, here);
  const count = columns.value.length;
  switch (e.key) {
    case "ArrowDown": e.preventDefault(); return moveActive(1, 0, here);
    case "ArrowUp": e.preventDefault(); return moveActive(-1, 0, here);
    case "ArrowRight": e.preventDefault(); return step(1);
    case "ArrowLeft": e.preventDefault(); return step(-1);
    case "Home": e.preventDefault(); return e.ctrlKey ? moveActive(-view.value.length, -count, here) : moveActive(0, -count, here);
    case "End": e.preventDefault(); return e.ctrlKey ? moveActive(view.value.length, count, here) : moveActive(0, count, here);
    case "Tab": {
      const dir = e.shiftKey ? -1 : 1;
      const nextCol = col + dir;
      if (nextCol < 0 || nextCol >= count) {
        const target = view.value[rowIndex(row.id) + dir];
        if (!target) return; // let focus leave the grid
        e.preventDefault();
        return void focusCell(target.id, dir === 1 ? 0 : count - 1);
      }
      e.preventDefault();
      return void focusCell(row.id, nextCol);
    }
    default:
  }
  if (!editable.value) return;
  if (e.key === "Enter" || e.key === "F2") {
    e.preventDefault();
    if (column.type === "checkbox") return setCell(row.id, column.id, !(row.cells[column.id] === true));
    editing.value = { rowId: row.id, col };
    return;
  }
  if (e.key === " " && column.type === "checkbox") {
    e.preventDefault();
    return setCell(row.id, column.id, !(row.cells[column.id] === true));
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    return setCell(row.id, column.id, emptyCell(column.type));
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (column.type === "text" || column.type === "number" || column.type === "url")) {
    e.preventDefault();
    editing.value = { rowId: row.id, col, seed: e.key };
  }
}
function onGridKeyDown(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLInputElement || !editable.value) return;
  const key = e.key.toLowerCase();
  if (key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (key === "y" || (key === "z" && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
}
function finishEdit(rowId: string, col: number, raw: string | null, move: Move) {
  const column = columns.value[col];
  editing.value = null;
  if (column && raw !== null) {
    const next = coerceCell(column.type, raw);
    const before = rows.value.find((r) => r.id === rowId)?.cells[column.id];
    if (JSON.stringify(next) !== JSON.stringify(before ?? emptyCell(column.type))) setCell(rowId, column.id, next);
  }
  if (move === "none") return;
  const r = rowIndex(rowId);
  if (move === "down") {
    const target = view.value[r + 1] ?? view.value[r];
    if (target) void focusCell(target.id, col);
  } else {
    void focusCell(rowId, Math.max(0, Math.min(columns.value.length - 1, col + (move === "right" ? 1 : -1))));
  }
}
function onCellClick(e: MouseEvent, row: ContentRow, ci: number, column: ContentColumn, isEditing: boolean) {
  if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
  const choice = column.type === "select" || column.type === "tags";
  if (choice && isEditing) return;
  const was = active.value?.rowId === row.id && active.value.col === ci;
  active.value = { rowId: row.id, col: ci };
  if (!editable.value || column.type === "checkbox") return;
  if (choice || was) editing.value = { rowId: row.id, col: ci };
}
function toggleRow(id: string, on: boolean) {
  const next = new Set(selected.value);
  if (on) next.add(id);
  else next.delete(id);
  selected.value = next;
}
function onChoice(rowId: string, columnId: string, next: string | string[] | null) {
  setCell(rowId, columnId, next);
}

const allSelected = computed(() => view.value.length > 0 && view.value.every((r) => selected.value.has(r.id)));
const someSelected = computed(() => view.value.some((r) => selected.value.has(r.id)));
const issueText = (issue: "required" | "url") => (issue === "required" ? t.value.issueRequired : t.value.issueUrl);
const cellWidth = (column: ContentColumn) => column.width ?? 180;
</script>

<template>
  <div data-slot="content-table-editor" :class="cn('flex min-w-0 flex-col gap-3', props.class)" @keydown="onGridKeyDown">
    <div role="toolbar" :aria-label="props.label ?? t.table" class="flex flex-wrap items-center gap-2">
      <div v-if="props.searchable" class="relative min-w-40 flex-1 sm:max-w-xs">
        <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <NqInput v-model="query" :aria-label="t.search" :placeholder="t.searchPlaceholder" class="ps-8 pe-8" />
        <button
          v-if="query"
          type="button"
          :aria-label="t.clearSearch"
          class="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="query = ''"
        >
          <X aria-hidden="true" class="size-4" />
        </button>
      </div>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <template v-if="selected.size > 0 && editable">
          <span class="text-body-sm text-muted-foreground">{{ t.selected(n(selected.size)) }}</span>
          <NqButton size="sm" variant="danger" @click="deleteRows([...selected])">
            <Trash2 aria-hidden="true" />
            {{ t.deleteSelected(n(selected.size)) }}
          </NqButton>
        </template>
        <slot name="toolbar" />
        <template v-if="editable">
          <NqTooltip :content="t.undo">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.undo" :disabled="hist.past.length === 0" @click="undo"><Undo2 aria-hidden="true" /></NqButton>
          </NqTooltip>
          <NqTooltip :content="t.redo">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.redo" :disabled="hist.future.length === 0" @click="redo"><Redo2 aria-hidden="true" /></NqButton>
          </NqTooltip>
        </template>
        <NqButton size="sm" @click="exportCsv">
          <Download aria-hidden="true" />
          {{ t.exportCsv }}
        </NqButton>
        <NqButton v-if="editable && props.editableColumns" size="sm" @click="openNewColumn">
          <Columns3 aria-hidden="true" />
          {{ t.addColumn }}
        </NqButton>
        <NqButton v-if="editable" size="sm" :variant="props.onSave ? 'secondary' : 'primary'" :disabled="columns.length === 0" @click="addRow()">
          <Plus aria-hidden="true" />
          {{ t.addRow }}
        </NqButton>
        <template v-if="props.onSave">
          <NqBadge v-if="saveState.status === 'saving'" variant="info">{{ t.saving }}</NqBadge>
          <NqBadge v-else-if="saveState.status === 'error'" variant="danger" role="alert">{{ saveState.message ?? t.saveFailed }}</NqBadge>
          <NqBadge v-else-if="dirty" variant="warning">{{ t.unsaved }}</NqBadge>
          <NqBadge v-else variant="success">{{ t.saved }}</NqBadge>
        </template>
        <NqBadge v-if="issues.length > 0" variant="danger">{{ t.issues(n(issues.length)) }}</NqBadge>
        <NqButton v-if="props.onSave && editable" size="sm" variant="primary" :loading="saveState.status === 'saving'" :disabled="!dirty || issues.length > 0" @click="save">{{ t.save }}</NqButton>
      </div>
    </div>

    <div ref="grid" class="min-w-0 overflow-auto rounded-card border border-border bg-card" :style="{ maxHeight: props.maxHeight ?? undefined }">
      <NqEmptyState v-if="columns.length === 0 || (rows.length === 0 && !query)" :icon="Rows3" :title="t.empty" :description="t.emptyHint">
        <template v-if="editable && columns.length > 0" #actions>
          <NqButton variant="primary" @click="addRow()">
            <Plus aria-hidden="true" />
            {{ t.addRow }}
          </NqButton>
        </template>
      </NqEmptyState>
      <table v-else role="grid" :aria-label="props.label ?? t.table" :aria-rowcount="view.length + 1" :aria-describedby="`${uid}-hint`" class="w-max min-w-full border-collapse text-body-sm">
        <thead class="sticky top-0 z-10 bg-secondary">
          <tr class="border-b border-border">
            <th scope="col" class="w-10 px-3 text-start">
              <NqCheckbox
                v-if="editable"
                :aria-label="t.selectAll"
                :model-value="allSelected"
                :indeterminate="!allSelected && someSelected"
                @update:model-value="(v: boolean) => (selected = v ? new Set(view.map((r) => r.id)) : new Set())"
              />
            </th>
            <th
              v-for="(column, ci) in columns"
              :key="column.id"
              scope="col"
              :aria-sort="sort?.column === column.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'"
              :style="{ width: `${cellWidth(column)}px`, minWidth: `${cellWidth(column)}px` }"
              class="h-row border-s border-border px-1 text-start align-middle text-caption font-medium text-muted-foreground first:border-s-0"
            >
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-1.5 rounded-[4px] px-2 py-1 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  @click="sortBy(column, sort?.column !== column.id ? 'asc' : sort.direction === 'asc' ? 'desc' : null)"
                >
                  <span class="min-w-0 truncate">{{ column.label }}</span>
                  <span v-if="column.required" aria-hidden="true" class="text-nq-danger-text">*</span>
                  <template v-if="sort?.column === column.id">
                    <ArrowUp v-if="sort.direction === 'asc'" aria-hidden="true" class="size-3.5 shrink-0 text-foreground" />
                    <ArrowDown v-else aria-hidden="true" class="size-3.5 shrink-0 text-foreground" />
                  </template>
                </button>
                <NqDropdownMenu>
                  <NqDropdownMenuTrigger as-child>
                    <NqButton variant="ghost" size="icon-sm" :aria-label="t.columnMenu(column.label)"><Ellipsis aria-hidden="true" /></NqButton>
                  </NqDropdownMenuTrigger>
                  <NqDropdownMenuContent align="end" class="min-w-48">
                    <NqDropdownMenuGroup>
                      <NqDropdownMenuItem @select="sortBy(column, 'asc')"><ArrowUp aria-hidden="true" />{{ t.sortAsc }}</NqDropdownMenuItem>
                      <NqDropdownMenuItem @select="sortBy(column, 'desc')"><ArrowDown aria-hidden="true" />{{ t.sortDesc }}</NqDropdownMenuItem>
                      <NqDropdownMenuItem v-if="sort?.column === column.id" @select="sortBy(column, null)">{{ t.clearSort }}</NqDropdownMenuItem>
                    </NqDropdownMenuGroup>
                    <template v-if="editable && props.editableColumns">
                      <NqDropdownMenuSeparator />
                      <NqDropdownMenuGroup>
                        <NqDropdownMenuItem @select="openColumn(column)"><Pencil aria-hidden="true" />{{ t.editColumn }}</NqDropdownMenuItem>
                        <NqDropdownMenuItem :disabled="ci === 0" @select="moveColumn(ci, -1)"><ArrowLeft aria-hidden="true" class="size-4" />{{ t.moveLeft }}</NqDropdownMenuItem>
                        <NqDropdownMenuItem :disabled="ci === columns.length - 1" @select="moveColumn(ci, 1)"><ArrowRight aria-hidden="true" class="size-4" />{{ t.moveRight }}</NqDropdownMenuItem>
                      </NqDropdownMenuGroup>
                      <NqDropdownMenuSeparator />
                      <NqDropdownMenuItem variant="danger" @select="deleteColumn(column)"><Trash2 aria-hidden="true" />{{ t.deleteColumn }}</NqDropdownMenuItem>
                    </template>
                  </NqDropdownMenuContent>
                </NqDropdownMenu>
              </div>
            </th>
            <th scope="col" class="w-10 px-1" />
          </tr>
        </thead>
        <tbody>
          <tr v-if="view.length === 0">
            <td :colspan="columns.length + 2" class="p-0">
              <NqEmptyState :icon="Search" :title="t.noMatches">
                <template #actions><NqButton @click="query = ''">{{ t.clearSearch }}</NqButton></template>
              </NqEmptyState>
            </td>
          </tr>
          <tr
            v-for="(row, ri) in view"
            :key="row.id"
            :aria-rowindex="ri + 2"
            :aria-selected="selected.has(row.id)"
            :data-state="selected.has(row.id) ? 'selected' : undefined"
            class="group border-b border-border last:border-b-0 hover:bg-nq-hover data-[state=selected]:bg-nq-selected"
          >
            <td class="w-10 px-3">
              <NqCheckbox v-if="editable" :aria-label="t.selectRow(n(ri + 1))" :model-value="selected.has(row.id)" @update:model-value="(v: boolean) => toggleRow(row.id, v)" />
              <span v-else class="text-caption text-muted-foreground tabular-nums">{{ n(ri + 1) }}</span>
            </td>
            <td
              v-for="(column, ci) in columns"
              :key="column.id"
              role="gridcell"
              :tabindex="(active ? active.rowId === row.id && active.col === ci : ri === 0 && ci === 0) ? 0 : -1"
              :data-row="row.id"
              :data-col="ci"
              :aria-invalid="issueOf(row.id, column.id) ? true : undefined"
              :aria-label="issueOf(row.id, column.id) ? `${column.label}, ${t.selectRow(n(ri + 1))}: ${issueText(issueOf(row.id, column.id)!)}` : undefined"
              :title="issueOf(row.id, column.id) ? issueText(issueOf(row.id, column.id)!) : undefined"
              :style="{ width: `${cellWidth(column)}px`, minWidth: `${cellWidth(column)}px`, maxWidth: `${cellWidth(column)}px` }"
              :class="
                cn(
                  'relative h-row border-s border-border px-3 align-middle outline-none first:border-s-0',
                  'focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus',
                  issueOf(row.id, column.id) && 'bg-nq-danger-soft',
                )
              "
              @focus="(e: FocusEvent) => e.target === e.currentTarget && (active = { rowId: row.id, col: ci })"
              @keydown="onCellKeyDown($event, row, ci)"
              @click="onCellClick($event, row, ci, column, editing?.rowId === row.id && editing.col === ci)"
            >
              <NqCheckbox
                v-if="column.type === 'checkbox'"
                :model-value="row.cells[column.id] === true"
                :disabled="!editable"
                :aria-label="`${column.label}, ${t.selectRow(n(ri + 1))}`"
                @update:model-value="(v: boolean) => setCell(row.id, column.id, v)"
              />
              <NqContentChoiceEditor
                v-else-if="column.type === 'select' || column.type === 'tags'"
                :column="column"
                :value="row.cells[column.id]"
                :open="editing?.rowId === row.id && editing.col === ci"
                :t="t"
                @update:open="(open: boolean) => { if (!open) { editing = null; void focusCell(row.id, ci); } }"
                @change="(next: string | string[] | null) => onChoice(row.id, column.id, next)"
              >
                <NqContentCell :column="column" :value="row.cells[column.id]" :locale="locale" :t="t" :row-label="n(ri + 1)" />
              </NqContentChoiceEditor>
              <template v-else-if="editing?.rowId === row.id && editing.col === ci">
                <span class="invisible"><NqContentCell :column="column" :value="row.cells[column.id]" :locale="locale" :t="t" :row-label="n(ri + 1)" /></span>
                <NqContentTextEditor
                  :type="column.type"
                  :label="`${column.label}, ${t.selectRow(n(ri + 1))}`"
                  :seeded="editing.seed !== undefined"
                  :initial="editing.seed ?? (isEmpty(row.cells[column.id]) ? '' : String(row.cells[column.id]))"
                  @commit="(raw: string, move: Move) => finishEdit(row.id, ci, raw, move)"
                  @cancel="editing = null; void focusCell(row.id, ci)"
                />
              </template>
              <NqContentCell v-else :column="column" :value="row.cells[column.id]" :locale="locale" :t="t" :row-label="n(ri + 1)" />
            </td>
            <td class="w-10 px-1">
              <NqDropdownMenu v-if="editable">
                <NqDropdownMenuTrigger as-child>
                  <NqButton variant="ghost" size="icon-sm" :aria-label="t.rowActions(n(ri + 1))" class="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"><Ellipsis aria-hidden="true" /></NqButton>
                </NqDropdownMenuTrigger>
                <NqDropdownMenuContent align="end" class="min-w-48">
                  <NqDropdownMenuGroup>
                    <NqDropdownMenuItem @select="addRow(rows.indexOf(row))"><Plus aria-hidden="true" />{{ t.insertAbove }}</NqDropdownMenuItem>
                    <NqDropdownMenuItem @select="addRow(rows.indexOf(row) + 1)"><Plus aria-hidden="true" />{{ t.insertBelow }}</NqDropdownMenuItem>
                    <NqDropdownMenuItem @select="duplicateRow(row)"><Copy aria-hidden="true" />{{ t.duplicate }}</NqDropdownMenuItem>
                  </NqDropdownMenuGroup>
                  <NqDropdownMenuSeparator />
                  <NqDropdownMenuGroup>
                    <NqDropdownMenuItem :disabled="!canReorder || rows.indexOf(row) === 0" @select="moveRow(row, -1)"><ArrowUp aria-hidden="true" />{{ t.moveUp }}</NqDropdownMenuItem>
                    <NqDropdownMenuItem :disabled="!canReorder || rows.indexOf(row) === rows.length - 1" @select="moveRow(row, 1)"><ArrowDown aria-hidden="true" />{{ t.moveDown }}</NqDropdownMenuItem>
                  </NqDropdownMenuGroup>
                  <NqDropdownMenuSeparator />
                  <NqDropdownMenuItem variant="danger" @select="deleteRows([row.id])"><Trash2 aria-hidden="true" />{{ t.delete }}</NqDropdownMenuItem>
                </NqDropdownMenuContent>
              </NqDropdownMenu>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="view.length > 0" class="border-t border-border bg-secondary/50 text-caption text-muted-foreground">
          <tr>
            <td class="px-3 py-1.5" />
            <td v-for="column in columns" :key="column.id" class="border-s border-border px-3 py-1.5 first:border-s-0">
              <span v-if="column.type === 'number' && summarize(view, column).sum !== undefined" class="flex justify-between gap-2">
                <span>{{ t.sum }}</span>
                <span class="tabular-nums text-foreground">{{ formatNumber(summarize(view, column).sum as number, locale) }}</span>
              </span>
              <template v-else-if="column.type === 'checkbox'">{{ t.checked(n(summarize(view, column).checked ?? 0)) }}</template>
              <template v-else>{{ t.filled(n(summarize(view, column).filled), n(summarize(view, column).total)) }}</template>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
      <span :id="`${uid}-hint`">{{ editable ? t.gridHint : "" }}</span>
      <span>{{ query ? t.rowCountOf(n(view.length), n(rows.length)) : t.rowCount(n(rows.length)) }}</span>
    </div>
    <div class="sr-only" role="status" aria-live="polite">{{ announce }}</div>

    <NqDialog :open="columnDraft !== null" @update:open="(open: boolean) => !open && (columnDraft = null)">
      <NqDialogContent class="max-w-md">
        <NqDialogHeader>
          <NqDialogTitle>{{ columnDraft?.id === null ? t.addColumn : t.editColumn }}</NqDialogTitle>
          <NqDialogDescription class="sr-only">{{ t.columnName }}</NqDialogDescription>
        </NqDialogHeader>
        <form v-if="columnDraft" class="grid gap-4" @submit.prevent="applyColumn">
          <NqField>
            <NqFieldLabel>{{ t.columnName }}</NqFieldLabel>
            <NqInput v-model="columnDraft.label" autofocus />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.columnType }}</NqFieldLabel>
            <NqSelect v-model="columnDraft.type">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="type in CONTENT_COLUMN_TYPES" :key="type" :value="type">{{ t[TYPE_KEY[type]] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField v-if="columnDraft.type === 'select' || columnDraft.type === 'tags'">
            <NqFieldLabel>{{ t.options }}</NqFieldLabel>
            <NqTextarea v-model="columnDraft.options" rows="4" />
            <p class="text-caption text-muted-foreground">{{ t.optionsHint }}</p>
          </NqField>
          <label class="flex items-center gap-2 text-body-sm text-foreground">
            <NqCheckbox v-model="columnDraft.required" />
            {{ t.required }}
          </label>
          <NqDialogFooter>
            <NqButton type="button" @click="columnDraft = null">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :disabled="!columnDraft.label.trim()">{{ t.saveColumn }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
