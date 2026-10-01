// nqDataTable: sortable, searchable, filterable, paginated, selectable table with expandable rows, in-cell editing and row actions.
// The markup is the React DataTable's (see the Blade component); the state lives here. Rows and columns are plain data:
//
//   <div x-data="nqDataTable([{ id: 'MH-1', title: 'Fix login', status: 'open', due: '2026-10-05' }],
//        [{ id: 'title', header: 'Title', sortable: true, searchable: true }, { id: 'status', type: 'status', options: [{ value: 'open', label: 'Open', tone: 'info' }] }],
//        { key: 'id', pageSize: 10, selectable: true })"> … </div>
//
// Column: id, key (row field, default id), type (text | number | date | currency | status | tag | boolean), sortable, searchable, hideable,
// align (start | center | end), filter (facet filter on the column's values), range (a from-to filter), options ([{ value, label, tone?, hue? }]),
// currency, edit (text | number | date | switch | select).
//
// `rows` is x-modelable. Bubbling events: `nq-data-table-row-click` { row }, `nq-data-table-action` { action, row },
// `nq-data-table-selection` { ids }, and `nq-data-table-edit` { row, column, value, promise? }. A listener may set `event.detail.promise`
// (a Promise, or one resolving to { error }); until it settles the cell shows the new value as pending, and on an error it rolls back.
// Not ported here: column pinning, resizing and the row context menu of the other stacks.

import { cellKey, coerceEditValue, inRange, isActiveRange, nextSorting, sameCellValue, sortTableRows, type CellValue, type DataTableRange, type DataTableSort } from "./data-table-logic";
import type { Magics, Register } from "./types";

type Row = Record<string, unknown>;
interface Option {
  value: string;
  label: string;
  tone?: string;
  hue?: string;
}
interface Column {
  id: string;
  key?: string;
  header?: string;
  type?: "text" | "number" | "date" | "currency" | "status" | "tag" | "boolean";
  sortable?: boolean;
  searchable?: boolean;
  hideable?: boolean;
  align?: "start" | "center" | "end";
  filter?: boolean;
  range?: boolean | { kind?: "number" | "date" };
  options?: Option[];
  currency?: string;
  edit?: "text" | "number" | "date" | "switch" | "select";
  hidden?: boolean;
}
interface Options {
  key?: string;
  pageSize?: number;
  selectable?: boolean;
  multiSort?: boolean;
  density?: "compact" | "default" | "comfortable";
  locale?: string;
  expand?: string;
  /** Row field that names a row for "Select …" and "Actions for …". Default: the key. */
  nameKey?: string;
  labels?: Partial<Record<string, string>>;
}
interface Labels {
  selected: string;
  range: string;
  saving: string;
  saved: string;
  saveFailed: string;
  saveFailedFor: string;
  invalidNumber: string;
  invalidDate: string;
  rangeAtLeast: string;
  rangeAtMost: string;
  editCell: string;
}

const LABELS: Labels = {
  selected: "{n} selected",
  range: "{from}–{to} of {total}",
  saving: "Saving…",
  saved: "Saved",
  saveFailed: "Couldn't save the change",
  saveFailedFor: "Couldn't save: {message}",
  invalidNumber: "Enter a number",
  invalidDate: "Enter a date",
  rangeAtLeast: "≥ {v}",
  rangeAtMost: "≤ {v}",
  editCell: "{column}, {row}",
};

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
  rows: Row[];
  columns: Column[];
  key: string;
  query: string;
  facet: Record<string, boolean>;
  ranges: Record<string, DataTableRange>;
  sorting: DataTableSort[];
  shown: Record<string, boolean>;
  density: string;
  page: number;
  pageSize: number;
  selectable: boolean;
  multiSort: boolean;
  selection: Record<string, boolean>;
  expanded: Record<string, boolean>;
  expandKey: string;
  nameKey: string;
  editing: { rowId: string; colId: string } | null;
  draft: string;
  invalid: string;
  pending: Record<string, CellValue>;
  failed: Record<string, string>;
  announce: string;
  active: number;
  locale: string;
  labels: Labels;
  root: HTMLElement | null;
}

const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);

export const dataTable: Register = (Alpine) => {
  Alpine.data("nqDataTable", (initialRows: Row[] = [], initialColumns: Column[] = [], options: Options = {}) => ({
    rows: (initialRows ?? []).map((r) => ({ ...r })),
    columns: (initialColumns ?? []).map((c) => ({ ...c })),
    key: options.key ?? "id",
    query: "",
    facet: Object.fromEntries((initialColumns ?? []).flatMap((c) => (c.filter ? (c.options ?? []).map((o) => [`${c.id}|${o.value}`, false]) : []))) as Record<string, boolean>,
    ranges: {} as Record<string, DataTableRange>,
    sorting: [] as DataTableSort[],
    shown: Object.fromEntries((initialColumns ?? []).map((c) => [c.id, !c.hidden])) as Record<string, boolean>,
    density: options.density ?? "default",
    page: 0,
    pageSize: options.pageSize ?? 0,
    selectable: !!options.selectable,
    multiSort: !!options.multiSort,
    selection: {} as Record<string, boolean>,
    expanded: {} as Record<string, boolean>,
    expandKey: options.expand ?? "",
    nameKey: options.nameKey ?? options.key ?? "id",
    editing: null as { rowId: string; colId: string } | null,
    draft: "",
    invalid: "",
    pending: {} as Record<string, CellValue>,
    failed: {} as Record<string, string>,
    announce: "",
    active: 0,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    labels: { ...LABELS, ...options.labels } as Labels,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      // Any change to the filters sends you back to the first page; the selection is announced to listeners.
      this.$watch("query", () => (this.page = 0));
      this.$watch("facet", () => (this.page = 0));
      this.$watch("ranges", () => (this.page = 0));
      this.$watch("selection", () => this.root?.dispatchEvent(new CustomEvent("nq-data-table-selection", { bubbles: true, detail: { ids: this.selectedIds() } })));
    },

    /* ---- values ---- */
    col(this: State, id: string): Column | undefined {
      return this.columns.find((c) => c.id === id);
    },
    say(this: State, key: string, row: Row): string {
      return fill((this.labels as unknown as Record<string, string>)[key] ?? "", { name: this.name(row) });
    },
    failText(this: State, row: Row, col: Column): string {
      return fill(this.labels.saveFailedFor, { message: this.failure(row, col) ?? "" });
    },
    name(this: State, row: Row): string {
      return String(row[this.nameKey] ?? row[this.key]);
    },
    get pad(): string {
      return ({ compact: "px-2 py-1", default: "px-4 py-3", comfortable: "px-5 py-4" } as Record<string, string>)[(this as unknown as State).density] ?? "px-4 py-3";
    },
    rid(this: State, row: Row): string {
      return String(row[this.key]);
    },
    val(row: Row, col: Column): unknown {
      return row[col.key ?? col.id];
    },
    opt(col: Column, value: unknown): Option | undefined {
      return col.options?.find((o) => o.value === String(value));
    },
    sortValue(this: State, row: Row, col: Column): string | number | Date | null {
      const v = this.val(row, col);
      if (v === null || v === undefined || v === "") return null;
      if (col.type === "number" || col.type === "currency") return Number(v);
      if (col.type === "date") return new Date(`${String(v)}T00:00:00`);
      if (col.type === "status" || col.type === "tag") return this.opt(col, v)?.label ?? String(v);
      return String(v);
    },
    searchText(this: State, row: Row, col: Column): string {
      const v = this.val(row, col);
      if (v === null || v === undefined) return "";
      if (col.type === "status" || col.type === "tag") return this.opt(col, v)?.label ?? String(v);
      return String(v);
    },

    /* ---- display ---- */
    nf(this: State, n: number, o?: Intl.NumberFormatOptions): string {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`, o).format(n);
    },
    display(this: State, row: Row, col: Column, raw?: unknown): string {
      const v = raw === undefined ? this.val(row, col) : raw;
      if (v === null || v === undefined || v === "") return "";
      if (col.type === "number") return this.nf(Number(v));
      if (col.type === "currency") {
        const code = col.currency ?? (this.locale.startsWith("ar") ? "SAR" : "USD");
        return this.nf(Number(v), { style: "currency", currency: code });
      }
      if (col.type === "date") return new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium" }).format(new Date(`${String(v)}T00:00:00`));
      if (col.type === "status" || col.type === "tag") return this.opt(col, v)?.label ?? String(v);
      return String(v);
    },
    tone(this: State, row: Row, col: Column): string {
      return this.opt(col, this.shownValue(row, col))?.tone ?? "neutral";
    },
    hueStyle(this: State, row: Row, col: Column): string {
      const hue = this.opt(col, this.shownValue(row, col))?.hue ?? "gray";
      return `--tag-solid: var(--nq-tag-${hue}); --tag-soft: var(--nq-tag-${hue}-soft)`;
    },
    /** The value in force: a pending (saved but unconfirmed) edit wins over the row. */
    shownValue(this: State, row: Row, col: Column): unknown {
      const k = cellKey(this.rid(row), col.id);
      return k in this.pending ? this.pending[k] : this.val(row, col);
    },
    shownText(this: State, row: Row, col: Column): string {
      return this.display(row, col, this.shownValue(row, col));
    },

    /* ---- the pipeline: search, facets, ranges, sort, page ---- */
    facetValues(this: State, colId: string): string[] {
      const prefix = `${colId}|`;
      return Object.keys(this.facet)
        .filter((k) => k.startsWith(prefix) && this.facet[k])
        .map((k) => k.slice(prefix.length));
    },
    get filtered(): Row[] {
      const s = this as unknown as State;
      const q = s.query.trim().toLowerCase();
      const searchable = s.columns.filter((c) => c.searchable);
      return s.rows.filter((row) => {
        if (q && !searchable.some((c) => s.searchText(row, c).toLowerCase().includes(q))) return false;
        for (const c of s.columns) {
          if (c.filter) {
            const chosen = s.facetValues(c.id);
            if (chosen.length && !chosen.includes(String(s.val(row, c) ?? ""))) return false;
          }
          const r = s.ranges[c.id];
          if (r && isActiveRange(r)) {
            const v = s.sortValue(row, c);
            if (!inRange(v, r)) return false;
          }
        }
        return true;
      });
    },
    get sorted(): Row[] {
      const s = this as unknown as State;
      return sortTableRows(
        (s as unknown as { filtered: Row[] }).filtered,
        s.sorting,
        (id) => {
          const c = s.col(id);
          return c ? (row: Row) => s.sortValue(row, c) : undefined;
        },
        s.locale,
      );
    },
    get rowCount(): number {
      return (this as unknown as { sorted: Row[] }).sorted.length;
    },
    get pageCount(): number {
      const s = this as unknown as State & { rowCount: number };
      return s.pageSize ? Math.max(1, Math.ceil(s.rowCount / s.pageSize)) : 1;
    },
    get pageRows(): Row[] {
      const s = this as unknown as State & { sorted: Row[]; pageCount: number };
      if (!s.pageSize) return s.sorted;
      const page = Math.min(s.page, s.pageCount - 1);
      return s.sorted.slice(page * s.pageSize, page * s.pageSize + s.pageSize);
    },
    get isFiltered(): boolean {
      const s = this as unknown as State;
      return !!s.query.trim() || s.columns.some((c) => s.facetValues(c.id).length > 0 || isActiveRange(s.ranges[c.id]));
    },
    get paged(): boolean {
      const s = this as unknown as State & { rowCount: number; pageCount: number };
      return s.pageSize > 0 && s.pageCount > 1;
    },
    get from(): number {
      const s = this as unknown as State & { rowCount: number };
      return s.rowCount ? s.page * s.pageSize + 1 : 0;
    },
    get to(): number {
      const s = this as unknown as State & { rowCount: number };
      return Math.min(s.rowCount, s.page * s.pageSize + s.pageSize);
    },
    rangeText(this: State & { rowCount: number; from: number; to: number }): string {
      return fill(this.labels.range, { from: this.nf(this.from), to: this.nf(this.to), total: this.nf(this.rowCount) });
    },
    setPage(this: State & { pageCount: number }, p: number) {
      this.page = Math.max(0, Math.min(this.pageCount - 1, p));
      this.active = 0;
    },
    setPageSize(this: State, n: number) {
      this.pageSize = Number(n);
      this.page = 0;
    },
    resetFilters(this: State) {
      this.query = "";
      this.facet = {};
      this.ranges = {};
    },

    /* ---- facets and ranges ---- */
    facetCount(this: State, colId: string): number {
      return this.facetValues(colId).length;
    },
    facetSummary(this: State, colId: string): string {
      const chosen = this.facetValues(colId);
      if (chosen.length !== 1) return chosen.length ? this.nf(chosen.length) : "";
      const c = this.col(colId);
      return (c && this.opt(c, chosen[0])?.label) || chosen[0]!;
    },
    resetFacet(this: State, colId: string) {
      const next = { ...this.facet };
      for (const k of Object.keys(next)) if (k.startsWith(`${colId}|`)) next[k] = false;
      this.facet = next;
    },
    rangeOf(this: State, colId: string): DataTableRange {
      return this.ranges[colId] ?? {};
    },
    setRangeEdge(this: State, colId: string, edge: "min" | "max", raw: string) {
      const c = this.col(colId);
      const kind = typeof c?.range === "object" ? (c.range.kind ?? "number") : c?.type === "date" ? "date" : "number";
      const value = raw === "" ? null : kind === "number" ? Number(raw) : raw;
      this.ranges = { ...this.ranges, [colId]: { ...this.rangeOf(colId), [edge]: value } };
    },
    rangeActive(this: State, colId: string): boolean {
      return isActiveRange(this.ranges[colId]);
    },
    rangeSummary(this: State, colId: string): string {
      const r = this.rangeOf(colId);
      const c = this.col(colId);
      const show = (v: unknown) => (c ? this.display({}, c, v) : String(v));
      const has = (v: unknown) => v !== undefined && v !== null && v !== "";
      if (!isActiveRange(r)) return "";
      if (has(r.min) && has(r.max)) return `${show(r.min)}–${show(r.max)}`;
      if (has(r.min)) return fill(this.labels.rangeAtLeast, { v: show(r.min) });
      if (has(r.max)) return fill(this.labels.rangeAtMost, { v: show(r.max) });
      return "";
    },
    resetRange(this: State, colId: string) {
      const { [colId]: _drop, ...rest } = this.ranges;
      this.ranges = rest;
    },

    /* ---- columns, sorting ---- */
    shownCount(this: State): number {
      return this.columns.filter((c) => this.shown[c.id]).length;
    },
    sortOf(this: State, colId: string): "asc" | "desc" | null {
      return this.sorting.find((s) => s.id === colId)?.direction ?? null;
    },
    sortIndex(this: State, colId: string): number {
      return this.sorting.findIndex((s) => s.id === colId);
    },
    ariaSort(this: State, colId: string): string | null {
      const i = this.sortIndex(colId);
      const d = this.sortOf(colId);
      return i === 0 ? (d === "asc" ? "ascending" : "descending") : i > 0 ? null : "none";
    },
    toggleSort(this: State, colId: string, additive = false) {
      this.sorting = nextSorting(this.sorting, colId, additive && this.multiSort);
      this.page = 0;
    },

    /* ---- selection ---- */
    selectedIds(this: State): string[] {
      return Object.keys(this.selection).filter((k) => this.selection[k]);
    },
    selectedCount(this: State): number {
      return this.selectedIds().length;
    },
    selectedText(this: State): string {
      return fill(this.labels.selected, { n: this.nf(this.selectedCount()) });
    },
    isSelected(this: State, row: Row): boolean {
      return !!this.selection[this.rid(row)];
    },
    toggleRow(this: State, row: Row) {
      const id = this.rid(row);
      this.selection = { ...this.selection, [id]: !this.selection[id] };
    },
    pageSelection(this: State & { pageRows: Row[] }): "all" | "some" | "none" {
      const n = this.pageRows.filter((r) => this.selection[this.rid(r)]).length;
      return n === 0 ? "none" : n === this.pageRows.length ? "all" : "some";
    },
    togglePage(this: State & { pageRows: Row[] }) {
      const all = this.pageSelection() === "all";
      const next = { ...this.selection };
      for (const r of this.pageRows) next[this.rid(r)] = !all;
      this.selection = next;
    },
    clearSelection(this: State) {
      this.selection = {};
    },
    selectedRows(this: State): Row[] {
      return this.rows.filter((r) => this.selection[this.rid(r)]);
    },

    /* ---- expansion ---- */
    canExpand(this: State, row: Row): boolean {
      return !!this.expandKey && row[this.expandKey] !== undefined && row[this.expandKey] !== null && row[this.expandKey] !== "";
    },
    isOpen(this: State, row: Row): boolean {
      return this.canExpand(row) && !!this.expanded[this.rid(row)];
    },
    toggleExpanded(this: State, row: Row) {
      const id = this.rid(row);
      this.expanded = { ...this.expanded, [id]: !this.expanded[id] };
    },

    /* ---- rows: events and keyboard ---- */
    rowClick(this: State, row: Row, event: MouseEvent) {
      const target = event.target as HTMLElement;
      const hit = target.closest("a,button,input,select,textarea,[role=checkbox],[role=menuitem],[role=switch]");
      if (hit && hit !== event.currentTarget) return;
      if (target.closest("[data-editable]")) return;
      if (window.getSelection()?.toString()) return;
      this.root?.dispatchEvent(new CustomEvent("nq-data-table-row-click", { bubbles: true, detail: { row: { ...row } } }));
    },
    act(this: State, action: string, row: Row) {
      this.root?.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { ...row } } }));
    },
    focusRow(this: State, index: number) {
      const rows = this.root?.querySelectorAll<HTMLElement>("[data-row]");
      const target = rows?.[index];
      if (!target) return;
      this.active = index;
      target.focus();
    },
    rowKey(this: State & { pageRows: Row[] }, event: KeyboardEvent, row: Row, index: number, clickable: boolean) {
      if (event.target !== event.currentTarget) return;
      const last = this.pageRows.length - 1;
      const to = ({ ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: last } as Record<string, number>)[event.key];
      if (to !== undefined) {
        event.preventDefault();
        this.focusRow(Math.max(0, Math.min(last, to)));
      } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && this.canExpand(row)) {
        const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl";
        const open = (event.key === "ArrowRight") !== rtl;
        if (open !== this.isOpen(row)) {
          event.preventDefault();
          this.toggleExpanded(row);
        }
      } else if (event.key === "Enter" && clickable) {
        event.preventDefault();
        this.root?.dispatchEvent(new CustomEvent("nq-data-table-row-click", { bubbles: true, detail: { row: { ...row } } }));
      } else if (event.key === " " && this.selectable) {
        event.preventDefault();
        this.toggleRow(row);
      }
    },

    /* ---- in-cell editing ---- */
    cellId(this: State, row: Row, col: Column): string {
      return cellKey(this.rid(row), col.id);
    },
    editable(this: State, row: Row, col: Column): boolean {
      return !!col.edit && !(this.cellId(row, col) in this.pending);
    },
    isEditing(this: State, row: Row, col: Column): boolean {
      return this.editing?.rowId === this.rid(row) && this.editing?.colId === col.id;
    },
    editName(this: State, row: Row, col: Column): string {
      return fill(this.labels.editCell, { column: col.header ?? col.id, row: this.rid(row) });
    },
    failure(this: State, row: Row, col: Column): string {
      return this.failed[this.cellId(row, col)] ?? "";
    },
    isPending(this: State, row: Row, col: Column): boolean {
      return this.cellId(row, col) in this.pending;
    },
    beginEdit(this: State, row: Row, col: Column, event?: Event) {
      if (!this.editable(row, col) || col.edit === "switch") return;
      const k = this.cellId(row, col);
      const { [k]: _drop, ...rest } = this.failed;
      this.failed = rest;
      const v = this.val(row, col);
      this.draft = v === null || v === undefined ? "" : String(v);
      this.invalid = "";
      this.editing = { rowId: this.rid(row), colId: col.id };
      const cell = (event?.currentTarget as HTMLElement | null) ?? null;
      void this.$nextTick(() => cell?.querySelector<HTMLElement>("input,select")?.focus());
    },
    cancelEdit(this: State, event?: Event) {
      const cell = (event?.target as HTMLElement | null)?.closest<HTMLElement>("[data-cell-col]") ?? null;
      this.editing = null;
      this.invalid = "";
      void this.$nextTick(() => cell?.focus());
    },
    /** Commit from the editor. `move` is what the key did: Enter/Tab keep the editor open on an invalid value (returns false), blur abandons it. */
    commitEdit(this: State, row: Row, col: Column, move: "down" | "right" | "none", event?: Event, raw?: string): boolean {
      if (!this.isEditing(row, col)) return true;
      const kind = col.edit ?? "text";
      const text = raw ?? this.draft;
      const cell = (event?.target as HTMLElement | null)?.closest<HTMLElement>("[data-cell-col]") ?? null;
      let value: CellValue = text;
      if (kind === "number" || kind === "date" || kind === "text") {
        const parsed = coerceEditValue(kind, text);
        if (!parsed.ok) {
          if (move === "none") {
            this.editing = null;
            this.invalid = "";
            return true;
          }
          this.invalid = parsed.reason === "number" ? this.labels.invalidNumber : this.labels.invalidDate;
          return false;
        }
        value = parsed.value;
      } else if (kind === "select") value = text === "" ? null : text;
      this.invalid = "";
      this.editing = null;
      if (move !== "none") void this.$nextTick(() => cell?.focus());
      void this.save(row, col, value);
      return true;
    },
    toggleSwitch(this: State, row: Row, col: Column) {
      if (!this.editable(row, col)) return;
      void this.save(row, col, !(this.shownValue(row, col) === true));
    },
    async save(this: State, row: Row, col: Column, value: CellValue) {
      if (sameCellValue(this.val(row, col), value)) return;
      const k = this.cellId(row, col);
      this.pending = { ...this.pending, [k]: value };
      const { [k]: _gone, ...ok } = this.failed;
      this.failed = ok;
      this.announce = this.labels.saving;
      const detail: { row: Row; column: string; value: CellValue; promise?: Promise<unknown> | unknown } = { row: { ...row }, column: col.id, value };
      this.root?.dispatchEvent(new CustomEvent("nq-data-table-edit", { bubbles: true, detail }));
      let failure = "";
      try {
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) failure = r.error;
      } catch (e) {
        failure = e instanceof Error && e.message ? e.message : this.labels.saveFailed;
      }
      const { [k]: _done, ...rest } = this.pending;
      this.pending = rest;
      if (failure) {
        this.failed = { ...this.failed, [k]: failure };
        this.announce = fill(this.labels.saveFailedFor, { message: failure });
      } else {
        row[col.key ?? col.id] = value;
        this.announce = this.labels.saved;
      }
    },
  }));
};
