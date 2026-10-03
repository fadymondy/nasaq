// nqContentTable: the state behind <x-nq::content-table-editor>, a spreadsheet-like editor for structured content.
// Typed columns (text, number, select, date, checkbox, link, tags), inline editing with keyboard navigation, sort and search,
// row and column management, undo and redo, validation, column summaries, CSV export and an optional async save.
// The math is the same as the React one (content-table-editor-logic.ts is a copy).
//
//   <div x-data="nqContentTable({ value: { columns, rows }, readOnly, editableColumns, searchable, label, hasSave, labels })" x-modelable="value">…</div>
//
// value is x-modelable: x-model="table" reads and writes { columns, rows }. Events (bubbling from the root):
//   nq-content-change  { value }            after every edit, undo or redo
//   nq-content-save    { value, done }      Save was pressed (only with has-save). Call detail.done() when saved, or detail.done({ error: "why" })
//   nq-content-export  { csv }              Export CSV was pressed. preventDefault() it to handle the CSV yourself; otherwise the browser downloads content-table.csv

import {
  blankRow,
  changeColumnType,
  cloneRow,
  coerceCell,
  type ContentCell,
  type ContentColumn,
  type ContentColumnType,
  type ContentRow,
  type ContentTableValue,
  emptyCell,
  filterRows,
  type History,
  insertAt,
  isEmpty,
  makeId,
  moveItem,
  parseOptions,
  pushHistory,
  redoHistory,
  type SortState,
  sortRows,
  STRINGS,
  summarize,
  toCsv,
  undoHistory,
  validateTable,
} from "./content-table-editor-logic";
import type { Magics, Register } from "./types";

type Move = "down" | "right" | "left" | "none";
type Draft = { id: string | null; label: string; type: ContentColumnType; options: string; required: boolean };
type Text = Record<string, string | ((...args: string[]) => string)>;

interface Config {
  value?: ContentTableValue;
  readOnly?: boolean;
  editableColumns?: boolean;
  searchable?: boolean;
  label?: string | null;
  hasSave?: boolean;
  labels?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = Magics & { $nq: { locale: string }; [key: string]: any };

const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];

export const contentTableEditor: Register = (Alpine) => {
  Alpine.data("nqContentTable", (config: Config = {}) => ({
    value: (config.value ?? { columns: [], rows: [] }) as ContentTableValue,
    readOnly: Boolean(config.readOnly),
    editableColumns: config.editableColumns !== false,
    searchable: config.searchable !== false,
    label: config.label ?? null,
    hasSave: Boolean(config.hasSave),
    overrides: (config.labels ?? {}) as Record<string, string>,
    past: [] as ContentTableValue[],
    future: [] as ContentTableValue[],
    savedJson: "",
    saveStatus: "idle" as "idle" | "saving" | "error",
    saveMessage: "",
    query: "",
    sort: null as SortState | null,
    selected: [] as string[],
    active: null as { rowId: string; col: number } | null,
    editing: null as { rowId: string; col: number; seed?: string } | null,
    draftOpen: false,
    draft: { id: null, label: "", type: "text", options: "", required: false } as Draft,
    announce: "",
    root: null as HTMLElement | null,

    init(this: S) {
      this.root = this.$el;
      this.savedJson = JSON.stringify(this.value);
    },

    /* ------------------------------------------------------------ derived */
    get t(): Text {
      const base = (STRINGS as unknown as Record<string, Text>)[String(this.$nq?.locale ?? "en").startsWith("ar") ? "ar" : "en"]!;
      return { ...base, ...this.overrides } as Text;
    },
    get loc(): string {
      return `${this.$nq?.locale ?? "en"}-u-nu-latn`;
    },
    get columns(): ContentColumn[] {
      return this.value.columns;
    },
    get rows(): ContentRow[] {
      return this.value.rows;
    },
    get view(): ContentRow[] {
      return sortRows(filterRows(this.rows, this.columns, this.query), this.columns, this.sort);
    },
    get issues() {
      return validateTable(this.value);
    },
    get editable(): boolean {
      return !this.readOnly;
    },
    get canReorder(): boolean {
      return !this.query.trim() && !this.sort;
    },
    get dirty(): boolean {
      return JSON.stringify(this.value) !== this.savedJson;
    },
    get allSelected(): boolean {
      return this.view.length > 0 && this.view.every((r: ContentRow) => this.selected.includes(r.id));
    },
    get someSelected(): boolean {
      return this.view.some((r: ContentRow) => this.selected.includes(r.id));
    },
    get showEmpty(): boolean {
      return this.columns.length === 0 || (this.rows.length === 0 && !this.query);
    },
    get selectedCount(): number {
      return this.editable ? this.selected.length : 0;
    },
    get noUndo(): boolean {
      return this.past.length === 0;
    },
    get noRedo(): boolean {
      return this.future.length === 0;
    },
    get canEditColumns(): boolean {
      return this.editable && this.editableColumns;
    },
    get noColumns(): boolean {
      return this.columns.length === 0;
    },
    get canAddFirst(): boolean {
      return this.editable && this.columns.length > 0;
    },
    get issueCount(): number {
      return this.issues.length;
    },
    get saveOff(): boolean {
      return !this.dirty || this.issues.length > 0 || this.saveStatus === "saving";
    },
    get noMatches(): boolean {
      return !this.showEmpty && this.view.length === 0;
    },
    get draftInvalid(): boolean {
      return !this.draft.label.trim();
    },
    get saveBadge(): "saving" | "error" | "unsaved" | "saved" {
      return this.saveStatus === "saving" ? "saving" : this.saveStatus === "error" ? "error" : this.dirty ? "unsaved" : "saved";
    },

    /* ------------------------------------------------------------ text helpers */
    s(this: S, key: string, ...args: string[]): string {
      const v = this.t[key];
      return typeof v === "function" ? v(...args) : String(v ?? "");
    },
    n(this: S, v: number): string {
      return new Intl.NumberFormat(this.loc).format(v);
    },
    ns(this: S, v: number): string {
      return this.n(v);
    },
    typeLabel(this: S, type: string): string {
      return this.s(`type${type.charAt(0).toUpperCase()}${type.slice(1)}`);
    },
    issueText(this: S, issue: string): string {
      return issue === "required" ? this.s("issueRequired") : this.s("issueUrl");
    },
    gridLabel(this: S): string {
      return this.label ?? this.s("table");
    },
    hintText(this: S): string {
      return this.editable ? this.s("gridHint") : "";
    },
    rowState(this: S, row: ContentRow): string | undefined {
      return this.selected.includes(row.id) ? "selected" : undefined;
    },
    cellInvalid(this: S, row: ContentRow, column: ContentColumn): string | undefined {
      return this.issueOf(row, column) ? "true" : undefined;
    },
    optionList(column: ContentColumn) {
      return column.options ?? [];
    },
    noOptions(column: ContentColumn): boolean {
      return !column.options || column.options.length === 0;
    },
    rowCountText(this: S): string {
      return this.query ? this.s("rowCountOf", this.n(this.view.length), this.n(this.rows.length)) : this.s("rowCount", this.n(this.rows.length));
    },
    columnTypes(): ContentColumnType[] {
      return ["text", "number", "select", "date", "checkbox", "url", "tags"];
    },
    cellWidth(column: ContentColumn): number {
      return column.width ?? 180;
    },
    widthStyle(this: S, column: ContentColumn, max = false): string {
      const w = this.cellWidth(column);
      return `width: ${w}px; min-width: ${w}px;${max ? ` max-width: ${w}px;` : ""}`;
    },

    /* ------------------------------------------------------------ history and commit */
    commit(this: S, next: ContentTableValue) {
      const h: History<ContentTableValue> = pushHistory({ past: this.past, present: this.value, future: this.future }, next);
      this.past = h.past;
      this.future = h.future;
      this.value = h.present;
      if (this.saveStatus === "error") this.saveStatus = "idle";
      this.$dispatch("nq-content-change", { value: this.value });
    },
    undo(this: S) {
      const h = undoHistory({ past: this.past, present: this.value, future: this.future });
      if (h.present === this.value) return;
      this.past = h.past;
      this.future = h.future;
      this.value = h.present;
      this.$dispatch("nq-content-change", { value: this.value });
    },
    redo(this: S) {
      const h = redoHistory({ past: this.past, present: this.value, future: this.future });
      if (h.present === this.value) return;
      this.past = h.past;
      this.future = h.future;
      this.value = h.present;
      this.$dispatch("nq-content-change", { value: this.value });
    },

    /* ------------------------------------------------------------ mutations */
    setCell(this: S, rowId: string, columnId: string, next: ContentCell) {
      this.commit({ ...this.value, rows: this.rows.map((r: ContentRow) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: next } } : r)) });
    },
    addRow(this: S, at?: number) {
      const row = blankRow(this.columns);
      this.commit({ ...this.value, rows: insertAt(this.rows, typeof at === "number" ? at : this.rows.length, row) });
      if (this.columns.length) this.focusCell(row.id, 0);
      this.announce = this.s("announceRowAdded");
    },
    addRowAt(this: S, row: ContentRow, offset: number) {
      this.addRow(this.rows.findIndex((r: ContentRow) => r.id === row.id) + offset);
    },
    deleteRows(this: S, ids: string[]) {
      if (!ids.length) return;
      const set = new Set(ids);
      this.commit({ ...this.value, rows: this.rows.filter((r: ContentRow) => !set.has(r.id)) });
      this.selected = [];
      this.announce = this.s("announceRowsDeleted", this.n(ids.length));
    },
    deleteSelected(this: S) {
      this.deleteRows([...this.selected]);
    },
    duplicateRow(this: S, row: ContentRow) {
      const copy = cloneRow(JSON.parse(JSON.stringify(row)));
      const at = this.rows.findIndex((r: ContentRow) => r.id === row.id) + 1;
      this.commit({ ...this.value, rows: insertAt(this.rows, at, copy) });
      this.focusCell(copy.id, this.active?.col ?? 0);
    },
    moveRow(this: S, row: ContentRow, delta: number) {
      if (!this.canReorder) return;
      const from = this.rows.findIndex((r: ContentRow) => r.id === row.id);
      if (from + delta < 0 || from + delta >= this.rows.length) return;
      this.commit({ ...this.value, rows: moveItem(this.rows, from, from + delta) });
    },
    rowMoveOff(this: S, row: ContentRow, delta: number): string | undefined {
      const at = this.rows.findIndex((r: ContentRow) => r.id === row.id) + delta;
      return !this.canReorder || at < 0 || at >= this.rows.length ? "" : undefined;
    },
    colMoveOff(this: S, ci: number, delta: number): string | undefined {
      const at = ci + delta;
      return at < 0 || at >= this.columns.length ? "" : undefined;
    },
    openNewColumn(this: S) {
      this.draft = { id: null, label: "", type: "text", options: "", required: false };
      this.draftOpen = true;
    },
    openColumn(this: S, column: ContentColumn) {
      this.draft = { id: column.id, label: column.label, type: column.type, options: (column.options ?? []).map((o) => o.label).join("\n"), required: Boolean(column.required) };
      this.draftOpen = true;
    },
    get draftHasOptions(): boolean {
      return this.draft.type === "select" || this.draft.type === "tags";
    },
    get draftTitle(): string {
      return this.draft.id === null ? this.s("addColumn") : this.s("editColumn");
    },
    applyColumn(this: S) {
      const d: Draft = this.draft;
      if (!d.label.trim()) return;
      const options = d.type === "select" || d.type === "tags" ? parseOptions(d.options) : undefined;
      if (d.id === null) {
        const column: ContentColumn = { id: makeId("col"), label: d.label.trim(), type: d.type, options, required: d.required || undefined };
        this.commit({ columns: [...this.columns, column], rows: this.rows.map((r: ContentRow) => ({ ...r, cells: { ...r.cells, [column.id]: emptyCell(column.type) } })) });
        this.announce = this.s("announceColumnAdded", column.label);
      } else {
        const id = d.id;
        let next = changeColumnType(this.value, id, d.type);
        next = { ...next, columns: next.columns.map((c) => (c.id === id ? { ...c, label: d.label.trim(), options, required: d.required || undefined } : c)) };
        this.commit(next);
      }
      this.draftOpen = false;
    },
    deleteColumn(this: S, column: ContentColumn) {
      this.commit({
        columns: this.columns.filter((c: ContentColumn) => c.id !== column.id),
        rows: this.rows.map((r: ContentRow) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => k !== column.id)) })),
      });
      if (this.sort?.column === column.id) this.sort = null;
      this.active = null;
      this.announce = this.s("announceColumnDeleted", column.label);
    },
    moveColumn(this: S, index: number, delta: number) {
      if (index + delta < 0 || index + delta >= this.columns.length) return;
      this.commit({ ...this.value, columns: moveItem(this.columns, index, index + delta) });
    },
    sortBy(this: S, column: ContentColumn, direction: "asc" | "desc" | null) {
      if (direction === null) {
        this.sort = null;
        return;
      }
      this.sort = { column: column.id, direction };
      this.announce = this.s("announceSorted", column.label, direction === "asc" ? this.s("ascending") : this.s("descending"));
    },
    cycleSort(this: S, column: ContentColumn) {
      const here = this.sort?.column === column.id;
      this.sortBy(column, !here ? "asc" : this.sort.direction === "asc" ? "desc" : null);
    },
    sortState(this: S, column: ContentColumn): string {
      return this.sort?.column === column.id ? (this.sort.direction === "asc" ? "ascending" : "descending") : "none";
    },
    isSorted(this: S, column: ContentColumn): boolean {
      return this.sort?.column === column.id;
    },
    sortAscending(this: S): boolean {
      return this.sort?.direction === "asc";
    },
    save(this: S) {
      if (!this.hasSave || this.issues.length) return;
      const value = this.value;
      const json = JSON.stringify(value);
      this.saveStatus = "saving";
      const done = (result?: { error?: string } | void) => {
        if (result && result.error) {
          this.saveStatus = "error";
          this.saveMessage = result.error;
          return;
        }
        this.savedJson = json;
        this.saveStatus = "idle";
      };
      this.$dispatch("nq-content-save", { value, done });
    },
    exportCsv(this: S) {
      const csv = toCsv(this.value);
      const event = new CustomEvent("nq-content-export", { detail: { csv }, bubbles: true, cancelable: true });
      this.root?.dispatchEvent(event);
      if (event.defaultPrevented) return;
      const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "content-table.csv";
      a.click();
      URL.revokeObjectURL(url);
    },

    /* ------------------------------------------------------------ selection (the little checkboxes) */
    /** Alpine bindings for one checkbox: kind is all, row or cell. */
    boxBind(this: S, kind: "all" | "row" | "cell", a?: string, b?: string) {
      const state = (): "true" | "false" | "mixed" => {
        if (kind === "all") return this.allSelected ? "true" : this.someSelected ? "mixed" : "false";
        if (kind === "row") return this.selected.includes(a as string) ? "true" : "false";
        const row = this.rows.find((r: ContentRow) => r.id === a);
        return row?.cells[b as string] === true ? "true" : "false";
      };
      return {
        ":aria-checked": () => state(),
        ":data-checked": () => (state() === "true" ? "" : undefined),
        ":data-unchecked": () => (state() === "false" ? "" : undefined),
        ":data-indeterminate": () => (state() === "mixed" ? "" : undefined),
        ":data-disabled": () => (kind === "cell" && this.readOnly ? "" : undefined),
        "x-on:click.stop": () => {
          if (kind === "all") this.selected = this.allSelected ? [] : this.view.map((r: ContentRow) => r.id);
          else if (kind === "row") this.selected = this.selected.includes(a as string) ? this.selected.filter((id: string) => id !== a) : [...this.selected, a as string];
          else if (this.editable) this.setCell(a as string, b as string, state() !== "true");
        },
      };
    },
    isSelected(this: S, row: ContentRow): boolean {
      return this.selected.includes(row.id);
    },

    /* ------------------------------------------------------------ cell display */
    issueOf(this: S, row: ContentRow, column: ContentColumn): string | undefined {
      return this.issues.find((i: { rowId: string; columnId: string }) => i.rowId === row.id && i.columnId === column.id)?.issue;
    },
    cellLabel(this: S, row: ContentRow, column: ContentColumn, ri: number): string {
      return `${column.label}, ${this.s("selectRow", this.n(ri + 1))}`;
    },
    cellAria(this: S, row: ContentRow, column: ContentColumn, ri: number): string | undefined {
      const issue = this.issueOf(row, column);
      return issue ? `${this.cellLabel(row, column, ri)}: ${this.issueText(issue)}` : undefined;
    },
    cellTitle(this: S, row: ContentRow, column: ContentColumn): string | undefined {
      const issue = this.issueOf(row, column);
      return issue ? this.issueText(issue) : undefined;
    },
    cellClass(this: S, row: ContentRow, column: ContentColumn): string {
      return this.issueOf(row, column) ? "bg-nq-danger-soft" : "";
    },
    tabindex(this: S, row: ContentRow, ri: number, ci: number): number {
      return (this.active ? this.active.rowId === row.id && this.active.col === ci : ri === 0 && ci === 0) ? 0 : -1;
    },
    isEditing(this: S, row: ContentRow, ci: number): boolean {
      return this.editing?.rowId === row.id && this.editing.col === ci;
    },
    cellKind(this: S, row: ContentRow, column: ContentColumn, ci: number): "checkbox" | "choice" | "editing" | "view" {
      if (column.type === "checkbox") return "checkbox";
      if (column.type === "select" || column.type === "tags") return "choice";
      return this.isEditing(row, ci) ? "editing" : "view";
    },
    displayKind(column: ContentColumn, value: ContentCell | undefined): string {
      if (isEmpty(value)) return "empty";
      return ["number", "date", "url", "select", "tags"].includes(column.type) ? column.type : "text";
    },
    numberText(this: S, value: ContentCell | undefined): string {
      return this.n(Number(value));
    },
    dateText(this: S, value: ContentCell | undefined): string {
      return new Intl.DateTimeFormat(this.loc, { dateStyle: "medium" }).format(new Date(`${String(value)}T00:00:00`));
    },
    urlText(value: ContentCell | undefined): string {
      return String(value).replace(/^https?:\/\//, "");
    },
    isLink(value: ContentCell | undefined): boolean {
      return /^https?:\/\//i.test(String(value));
    },
    openLabel(this: S, ri: number): string {
      return `${this.s("open")}: ${this.n(ri + 1)}`;
    },
    optionOf(column: ContentColumn, v: string) {
      return column.options?.find((o) => o.value === v);
    },
    optionLabel(this: S, column: ContentColumn, v: string): string {
      return this.optionOf(column, v)?.label ?? v;
    },
    tagStyle(this: S, column: ContentColumn, v: string): string {
      const hue = this.optionOf(column, v)?.hue;
      const h = HUES.includes(hue ?? "") ? hue : "gray";
      return `--tag-solid: var(--nq-tag-${h}); --tag-soft: var(--nq-tag-${h}-soft)`;
    },
    tagList(value: ContentCell | undefined): string[] {
      return Array.isArray(value) ? value : [];
    },
    textOf(value: ContentCell | undefined): string {
      return String(value);
    },

    /* ------------------------------------------------------------ choice cells (select and tags) */
    isMulti(column: ContentColumn): boolean {
      return column.type === "tags";
    },
    isChosen(row: ContentRow, column: ContentColumn, v: string): boolean {
      const cell = row.cells[column.id];
      return Array.isArray(cell) ? cell.includes(v) : cell === v;
    },
    hasValue(row: ContentRow, column: ContentColumn): boolean {
      return !isEmpty(row.cells[column.id]);
    },
    pick(this: S, row: ContentRow, column: ContentColumn, v: string) {
      if (column.type === "tags") {
        const list: string[] = Array.isArray(row.cells[column.id]) ? [...(row.cells[column.id] as string[])] : [];
        this.setCell(row.id, column.id, list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
      } else {
        this.setCell(row.id, column.id, v);
      }
    },
    clearChoice(this: S, row: ContentRow, column: ContentColumn) {
      this.setCell(row.id, column.id, column.type === "tags" ? [] : null);
    },

    /* ------------------------------------------------------------ editing */
    editorValue(this: S, row: ContentRow, column: ContentColumn): string {
      if (this.editing?.seed !== undefined) return this.editing.seed;
      const cell = row.cells[column.id];
      return isEmpty(cell) ? "" : String(cell);
    },
    startEditor(this: S, el: HTMLInputElement, row: ContentRow, column: ContentColumn) {
      el.value = this.editorValue(row, column);
      el.focus();
      if (column.type === "date") return;
      if (this.editing?.seed !== undefined) el.setSelectionRange(el.value.length, el.value.length);
      else el.select();
    },
    editorType(column: ContentColumn): string {
      return column.type === "date" ? "date" : "text";
    },
    editorDir(column: ContentColumn): string {
      return ["number", "url", "date"].includes(column.type) ? "ltr" : "auto";
    },
    editorClass(column: ContentColumn): string {
      return column.type === "number" ? "text-end" : column.type === "url" || column.type === "date" ? "text-start" : "";
    },
    editorMode(column: ContentColumn): string | undefined {
      return column.type === "number" ? "decimal" : column.type === "url" ? "url" : undefined;
    },
    onEditorKey(this: S, e: KeyboardEvent, row: ContentRow, ci: number) {
      e.stopPropagation();
      const input = e.target as HTMLInputElement;
      if (e.key === "Enter") {
        e.preventDefault();
        this.finishEdit(row.id, ci, input.value, "down");
      } else if (e.key === "Tab") {
        e.preventDefault();
        this.finishEdit(row.id, ci, input.value, e.shiftKey ? "left" : "right");
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.editing = null;
        this.focusCell(row.id, ci);
      }
    },
    finishEdit(this: S, rowId: string, col: number, raw: string | null, move: Move) {
      if (!this.editing) return;
      const column = this.columns[col];
      this.editing = null;
      if (column && raw !== null) {
        const next = coerceCell(column.type, raw);
        const before = this.rows.find((r: ContentRow) => r.id === rowId)?.cells[column.id];
        if (JSON.stringify(next) !== JSON.stringify(before ?? emptyCell(column.type))) this.setCell(rowId, column.id, next);
      }
      if (move === "none") return;
      const r = this.view.findIndex((x: ContentRow) => x.id === rowId);
      if (move === "down") {
        const target = this.view[r + 1] ?? this.view[r];
        if (target) this.focusCell(target.id, col);
      } else {
        this.focusCell(rowId, Math.max(0, Math.min(this.columns.length - 1, col + (move === "right" ? 1 : -1))));
      }
    },

    /* ------------------------------------------------------------ keyboard and focus */
    focusCell(this: S, rowId: string, col: number) {
      this.active = { rowId, col };
      this.$nextTick(() => {
        (this.root as HTMLElement | null)?.querySelector<HTMLElement>(`[data-row="${CSS.escape(rowId)}"][data-col="${col}"]`)?.focus();
      });
    },
    moveActive(this: S, dRow: number, dCol: number, from: { rowId: string; col: number }) {
      const at = this.view.findIndex((x: ContentRow) => x.id === from.rowId);
      const r = Math.max(0, Math.min(this.view.length - 1, at + dRow));
      const c = Math.max(0, Math.min(this.columns.length - 1, from.col + dCol));
      const row = this.view[r];
      if (row) this.focusCell(row.id, c);
    },
    onCellFocus(this: S, e: FocusEvent, row: ContentRow, ci: number) {
      if (e.target === e.currentTarget) this.active = { rowId: row.id, col: ci };
    },
    onCellKey(this: S, e: KeyboardEvent, row: ContentRow, ci: number) {
      if (e.target !== e.currentTarget) return;
      const column = this.columns[ci] as ContentColumn | undefined;
      if (!column) return;
      const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === "rtl";
      const here = { rowId: row.id, col: ci };
      const step = (d: number) => this.moveActive(0, rtl ? -d : d, here);
      const count = this.columns.length;
      const total = this.view.length;
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); return this.moveActive(1, 0, here);
        case "ArrowUp": e.preventDefault(); return this.moveActive(-1, 0, here);
        case "ArrowRight": e.preventDefault(); return step(1);
        case "ArrowLeft": e.preventDefault(); return step(-1);
        case "Home": e.preventDefault(); return e.ctrlKey ? this.moveActive(-total, -count, here) : this.moveActive(0, -count, here);
        case "End": e.preventDefault(); return e.ctrlKey ? this.moveActive(total, count, here) : this.moveActive(0, count, here);
        case "Tab": {
          const dir = e.shiftKey ? -1 : 1;
          const nextCol = ci + dir;
          if (nextCol < 0 || nextCol >= count) {
            const at = this.view.findIndex((x: ContentRow) => x.id === row.id);
            const target = this.view[at + dir];
            if (!target) return;
            e.preventDefault();
            return this.focusCell(target.id, dir === 1 ? 0 : count - 1);
          }
          e.preventDefault();
          return this.focusCell(row.id, nextCol);
        }
        default:
      }
      if (!this.editable) return;
      const toggle = () => this.setCell(row.id, column.id, !(row.cells[column.id] === true));
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        if (column.type === "checkbox") return toggle();
        if (column.type === "select" || column.type === "tags") {
          (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-choice-trigger]")?.click();
          return;
        }
        this.editing = { rowId: row.id, col: ci };
        return;
      }
      if (e.key === " " && column.type === "checkbox") {
        e.preventDefault();
        return toggle();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        return this.setCell(row.id, column.id, emptyCell(column.type));
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && ["text", "number", "url"].includes(column.type)) {
        e.preventDefault();
        this.editing = { rowId: row.id, col: ci, seed: e.key };
      }
    },
    onCellClick(this: S, e: MouseEvent, row: ContentRow, ci: number, column: ContentColumn) {
      if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
      const was = this.active?.rowId === row.id && this.active.col === ci;
      this.active = { rowId: row.id, col: ci };
      if (!this.editable || column.type === "checkbox" || column.type === "select" || column.type === "tags") return;
      if (was) this.editing = { rowId: row.id, col: ci };
    },
    onGridKey(this: S, e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLInputElement || !this.editable) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        this.redo();
      }
    },

    /* ------------------------------------------------------------ footer */
    summaryText(this: S, column: ContentColumn): string {
      const sum = summarize(this.view, column);
      if (column.type === "number" && sum.sum !== undefined) return this.n(sum.sum);
      if (column.type === "checkbox") return this.s("checked", this.n(sum.checked ?? 0));
      return this.s("filled", this.n(sum.filled), this.n(sum.total));
    },
    isSum(this: S, column: ContentColumn): boolean {
      return column.type === "number" && summarize(this.view, column).sum !== undefined;
    },
  }));
};
