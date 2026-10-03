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
//
// Cells. Besides text | number | date | currency | status | tag | boolean a column can be: mono (code font), datetime (date + time; `format: 'relative'`
// shows "2 hours ago" with the absolute time as the title), meter (a 0..max quantity bar: `max`, `warnAt` 0.8, `dangerAt` 0.95), avatar (initials or the
// `src` field's image, the value as the name and `secondary` the field shown under it), link (`href`: a row field, or a template such as "/issues/{key}"; `target`),
// and `template` ("{first} {last}") on a text column. React's escape hatch is `cell: (row) => ReactNode`; here it is a named Blade slot per column
// (`<x-slot name="cell_title">…row.title…</x-slot>`) rendered in the row's scope, so any Alpine markup can read `row`.
//
// Row actions. `actions` ([{ id, group?, visibleWhen?, disabledWhen? }]) mirror the Blade `row-actions`. A condition is { field, in | notIn | eq | ne | empty } or { any | all: [condition, …] };
// `actionsKey` names a row field listing the action ids that row allows. The same list opens as a context menu (right-click, long-press, Shift+F10 or
// the Menu key on a row) unless `contextMenu: false`; inputs, links and Shift + right-click keep the browser's menu.
//
// Pinning and resizing. A column takes `pin: 'start' | 'end'` (sticky to that edge; the select, expand and actions columns follow the side they sit on),
// and the `pinning` option adds a Pin submenu per column to the View menu. `resizable: true` adds a drag handle (a focusable separator: arrows
// resize by 16px, Shift 64px, double-click resets) to every header whose column does not set `resizable: false`; a column takes `size`, `minSize` (48)
// and `maxSize` (960) in px. Expansion is the row field named by `expand`, or a slot rendered in the row's scope (`expandSlot: true`) shown for the rows
// matching `expandWhen` (a condition like an action's `visibleWhen`; every row when omitted).

import {
  cellKey,
  clampColumnSize,
  coerceEditValue,
  inRange,
  isActiveRange,
  nextSorting,
  orderByPinning,
  pinColumnIn,
  pinOffsets,
  sameCellValue,
  sortTableRows,
  type CellValue,
  type DataTablePinning,
  type DataTableRange,
  type DataTableSort,
} from "./data-table-logic";
import type { Magics, Register } from "./types";

type Condition = { field?: string; in?: unknown[]; notIn?: unknown[]; eq?: unknown; ne?: unknown; empty?: boolean; any?: Condition[]; all?: Condition[] };
interface Action {
  id: string;
  group?: string | null;
  visibleWhen?: Condition;
  disabledWhen?: Condition;
}
// The Alpine runtime has $data; the slim AlpineLike type does not list it.
type WithData = { $data(el: Element): Record<string, unknown> };
const NATIVE = 'input, textarea, select, a[href], [contenteditable=""], [contenteditable="true"]';
const isMenuKey = (e: KeyboardEvent) => (e.key === "F10" && e.shiftKey) || e.key === "ContextMenu";

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
  type?: "text" | "number" | "date" | "datetime" | "currency" | "status" | "tag" | "boolean" | "mono" | "meter" | "avatar" | "link";
  /** avatar and text cells: the row field shown as a second line. */
  secondary?: string;
  secondaryDir?: string;
  /** A row field holding a number the column sorts by, when the cell shows text (a percentage with its change). */
  sortKey?: string;
  /** avatar: a row field that, when truthy, adds an outline badge (text: badgeLabel) after the name. */
  badge?: string;
  badgeLabel?: string;
  /** avatar: the row field holding the image URL. */
  src?: string;
  /** link: a row field, or a template such as "/issues/{key}". */
  href?: string;
  target?: string;
  /** text: "{first} {last}" filled from the row. */
  template?: string;
  /** datetime: absolute (default) or relative. */
  format?: "absolute" | "relative";
  /** meter: the full-scale value (100) and the fractions where it turns warning and danger. */
  max?: number;
  warnAt?: number;
  dangerAt?: number;
  sortable?: boolean;
  searchable?: boolean;
  hideable?: boolean;
  align?: "start" | "center" | "end";
  filter?: boolean;
  range?: boolean | { kind?: "number" | "date" };
  options?: Option[];
  currency?: string;
  edit?: "text" | "number" | "date" | "switch" | "select";
  /** A row condition (as an action's `disabledWhen`): matching rows are not editable, like React's `edit.disabled`. */
  editDisabledWhen?: Condition;
  hidden?: boolean;
  /** Pin the column to the start or end edge. */
  pin?: "start" | "end";
  /** Starting width in px when the table is `resizable`; with `minSize` (48) and `maxSize` (960) as the limits. */
  size?: number;
  minSize?: number;
  maxSize?: number;
  /** false keeps this column a fixed width in a `resizable` table. */
  resizable?: boolean;
}
interface Options {
  key?: string;
  pageSize?: number;
  selectable?: boolean;
  multiSort?: boolean;
  density?: "compact" | "default" | "comfortable";
  locale?: string;
  expand?: string;
  /** Rows expand to the `expanded` slot, shown for rows matching `expandWhen` (all rows when omitted). */
  expandSlot?: boolean;
  expandWhen?: Condition;
  /** Adds a Pin submenu per column to the View menu. */
  pinning?: boolean;
  /** Adds a drag handle to every resizable header. */
  resizable?: boolean;
  /** Row field that names a row for "Select …" and "Actions for …". Default: the key. */
  nameKey?: string;
  /** Row actions, for per-row visibility and the context menu. */
  actions?: Action[];
  /** Row field listing the action ids that row allows. */
  actionsKey?: string;
  /** Open the actions as a context menu. Default true. */
  contextMenu?: boolean;
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
  sortPriority: string;
  ascending: string;
  descending: string;
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
  sortPriority: "sort {n}, {dir}",
  ascending: "ascending",
  descending: "descending",
};

// Ids of the utility columns, for pin offsets and order.
const SELECT_COL = "__nq-select";
const EXPAND_COL = "__nq-expand";
const ACTIONS_COL = "__nq-actions";

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
  expandSlot: boolean;
  expandWhen: Condition | undefined;
  pinning: DataTablePinning & { start: string[]; end: string[] };
  pinSel: Record<string, string>;
  pinMenu: boolean;
  resizable: boolean;
  sizes: Record<string, number>;
  offsets: Record<string, number>;
  drag: { id: string; x: number; w: number; dir: number } | null;
  nameKey: string;
  editing: { rowId: string; colId: string } | null;
  draft: string;
  invalid: string;
  pending: Record<string, CellValue>;
  failed: Record<string, string>;
  announce: string;
  active: number;
  actions: Action[];
  actionsKey: string;
  contextMenu: boolean;
  ctxRow: Row | null;
  ctxReturn: HTMLElement | null;
  ctxOpen: boolean;
  press: ReturnType<typeof setTimeout> | undefined;
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
    expandSlot: !!options.expandSlot,
    expandWhen: options.expandWhen,
    pinning: {
      start: (initialColumns ?? []).filter((c) => c.pin === "start").map((c) => c.id),
      end: (initialColumns ?? []).filter((c) => c.pin === "end").map((c) => c.id),
    },
    pinSel: Object.fromEntries((initialColumns ?? []).map((c) => [c.id, c.pin ?? "none"])) as Record<string, string>,
    pinMenu: !!options.pinning,
    resizable: !!options.resizable,
    sizes: Object.fromEntries((initialColumns ?? []).filter((c) => c.size).map((c) => [c.id, c.size!])) as Record<string, number>,
    offsets: {} as Record<string, number>,
    drag: null as { id: string; x: number; w: number; dir: number } | null,
    nameKey: options.nameKey ?? options.key ?? "id",
    editing: null as { rowId: string; colId: string } | null,
    draft: "",
    invalid: "",
    pending: {} as Record<string, CellValue>,
    failed: {} as Record<string, string>,
    announce: "",
    active: 0,
    actions: (options.actions ?? []).map((a) => ({ ...a })),
    actionsKey: options.actionsKey ?? "",
    contextMenu: options.contextMenu !== false,
    ctxRow: null as Row | null,
    ctxReturn: null as HTMLElement | null,
    ctxOpen: false,
    press: undefined as ReturnType<typeof setTimeout> | undefined,
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
      // The View menu's Pin choices (radio groups bound to `pinSel`) move columns between the sides.
      this.$watch("pinSel", () => this.syncPins());
      if (this.pinMenu || this.columns.some((c) => c.pin)) {
        // Sticky offsets come from the measured header widths, so they follow resizing, column toggles and density.
        const again = () => this.$nextTick(() => this.measure());
        for (const k of ["pinning", "shown", "sizes", "density", "rows"]) this.$watch(k, again);
        again();
        if (typeof ResizeObserver !== "undefined") {
          const ro = new ResizeObserver(() => this.measure());
          for (const th of Array.from(this.root.querySelectorAll('[data-slot="table-head"]'))) ro.observe(th);
        }
      }
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
      if (col.sortKey) {
        const k = row[col.sortKey];
        const n = k === null || k === undefined || k === "" ? Number.NaN : Number(k);
        return Number.isNaN(n) ? null : n;
      }
      const v = this.val(row, col);
      if (v === null || v === undefined || v === "") return null;
      if (col.type === "number" || col.type === "currency") return Number(v);
      if (col.type === "date") return new Date(`${String(v)}T00:00:00`);
      if (col.type === "datetime") return this.when(v);
      if (col.type === "meter") return Number(v);
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
      if (col.type === "datetime") return col.format === "relative" ? this.relative(v) : this.absolute(v);
      if (col.type === "meter") return this.nf(Number(v) / (col.max ?? 100), { style: "percent", maximumFractionDigits: 0 });
      if (col.type === "status" || col.type === "tag") return this.opt(col, v)?.label ?? String(v);
      if (col.template && row && Object.keys(row).length) return this.fillRow(col.template, row);
      return String(v);
    },
    /** A date or date-time value as a Date; a date without a time is local midnight. */
    when(this: State, v: unknown): Date {
      const t = String(v);
      return new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00` : t);
    },
    absolute(this: State, v: unknown): string {
      const d = this.when(v);
      return Number.isNaN(d.getTime()) ? String(v) : new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "short" }).format(d);
    },
    relative(this: State, v: unknown): string {
      const d = this.when(v);
      if (Number.isNaN(d.getTime())) return String(v);
      const secs = Math.round((d.getTime() - Date.now()) / 1000);
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
      const [unit, size] = units.find(([, n]) => Math.abs(secs) >= n) ?? (["second", 1] as [Intl.RelativeTimeFormatUnit, number]);
      return new Intl.RelativeTimeFormat(`${this.locale}-u-nu-latn`, { numeric: "auto" }).format(Math.round(secs / size), unit);
    },
    /** The absolute time, for a relative cell's title. */
    absoluteOf(this: State, row: Row, col: Column): string {
      const v = this.val(row, col);
      return v === null || v === undefined || v === "" ? "" : this.absolute(v);
    },
    isoOf(this: State, row: Row, col: Column): string | null {
      const v = this.val(row, col);
      const d = v === null || v === undefined || v === "" ? null : this.when(v);
      return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
    },
    fillRow(template: string, row: Row): string {
      return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(row[k] ?? ""));
    },
    /** Initials of a name: first and last word, first user-perceived character of each. */
    initials(name: unknown): string {
      const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
      const first = (w: string) => [...new Intl.Segmenter().segment(w)][0]?.segment ?? "";
      return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1]!) : "")).toUpperCase();
    },
    secondary(this: State, row: Row, col: Column): string {
      const v = col.secondary ? row[col.secondary] : "";
      return v === null || v === undefined ? "" : String(v);
    },
    avatarSrc(this: State, row: Row, col: Column): string {
      const v = col.src ? row[col.src] : "";
      return v === null || v === undefined ? "" : String(v);
    },
    href(this: State, row: Row, col: Column): string | null {
      const h = col.href;
      const url = h ? (h.includes("{") ? this.fillRow(h, row) : String(row[h] ?? h)) : this.val(row, col) == null ? "" : String(this.val(row, col));
      // A row value must never become a script URL.
      return !url || /^\s*(javascript|data|vbscript):/i.test(url) ? null : url;
    },
    /** 0..1 of a meter cell. */
    meterFraction(this: State, row: Row, col: Column): number {
      const n = Number(this.shownValue(row, col));
      const max = col.max ?? 100;
      return Number.isFinite(n) && max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
    },
    meterTone(this: State, row: Row, col: Column): string {
      const f = this.meterFraction(row, col);
      return f >= (col.dangerAt ?? 0.95) ? "danger" : f >= (col.warnAt ?? 0.8) ? "warning" : "default";
    },
    meterWidth(this: State, row: Row, col: Column): string {
      return `inset-inline-start:0;width:${Math.round(this.meterFraction(row, col) * 10000) / 100}%`;
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
    /** Screen-reader text for a later sort key ("sort 2, ascending"); empty for the first or an unsorted column. */
    sortPriorityText(this: State, colId: string): string {
      const i = this.sortIndex(colId);
      if (this.sorting.length < 2 || i < 1) return "";
      const dir = this.sorting[i]!.direction === "asc" ? this.labels.ascending : this.labels.descending;
      return fill(this.labels.sortPriority, { n: String(i + 1), dir });
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

    /* ---- pinning ---- */
    pinOf(this: State, id: string): "start" | "end" | null {
      return this.pinning.start.includes(id) ? "start" : this.pinning.end.includes(id) ? "end" : null;
    },
    get hasStart(): boolean {
      const s = this as unknown as State;
      return s.columns.some((c) => s.shown[c.id] && s.pinOf(c.id) === "start");
    },
    get hasEnd(): boolean {
      const s = this as unknown as State;
      return s.columns.some((c) => s.shown[c.id] && s.pinOf(c.id) === "end");
    },
    /** The side a cell sticks to; the select and expand columns follow the start, the actions column the end. */
    pinFor(this: State & { hasStart: boolean; hasEnd: boolean }, id: string): "start" | "end" | null {
      if (id === SELECT_COL || id === EXPAND_COL) return this.hasStart ? "start" : null;
      if (id === ACTIONS_COL) return this.hasEnd ? "end" : null;
      return this.pinOf(id);
    },
    /** The side whose edge column draws the 1px divider: the last start-pinned or first end-pinned shown column. */
    edgeOf(this: State, id: string): "start" | "end" | null {
      const side = this.pinOf(id);
      if (!side || !this.shown[id]) return null;
      const ids = orderByPinning(this.columns.map((c) => c.id), this.pinning).filter((c) => this.shown[c] && this.pinOf(c) === side);
      return (side === "start" ? ids[ids.length - 1] : ids[0]) === id ? side : null;
    },
    /** Display order: select, expand, columns (start-pinned first, end-pinned last), actions. */
    orderOf(this: State, id: string): number {
      if (id === SELECT_COL) return 0;
      if (id === EXPAND_COL) return 1;
      if (id === ACTIONS_COL) return 99999;
      return 2 + orderByPinning(this.columns.map((c) => c.id), this.pinning).indexOf(id);
    },
    /** Inline style for a cell of column `id`: its display order and, when pinned, the sticky offset. */
    cellStyle(this: State, id: string): Record<string, string> {
      const st: Record<string, string> = { order: String(this.orderOf(id)) };
      const side = this.pinFor(id);
      if (side) st[side === "start" ? "inset-inline-start" : "inset-inline-end"] = `${this.offsets[id] ?? 0}px`;
      return st;
    },
    pinColumn(this: State, id: string, side: "start" | "end" | null) {
      this.pinning = pinColumnIn(this.pinning, id, side) as State["pinning"];
      if (this.pinSel[id] !== (side ?? "none")) this.pinSel = { ...this.pinSel, [id]: side ?? "none" };
    },
    syncPins(this: State) {
      for (const [id, v] of Object.entries(this.pinSel)) {
        const want = v === "start" || v === "end" ? v : null;
        if (want !== this.pinOf(id)) this.pinColumn(id, want);
      }
    },
    /** Measures the header cells and recomputes the sticky offsets. */
    measure(this: State) {
      const root = this.root;
      if (!root) return;
      const heads = Array.from(root.querySelectorAll<HTMLElement>('[data-slot="table-head"][data-col]'));
      const list = heads
        .map((th) => ({ id: th.dataset.col!, pin: this.pinFor(th.dataset.col!), width: th.getBoundingClientRect().width }))
        .sort((a, b) => this.orderOf(a.id) - this.orderOf(b.id));
      const next = pinOffsets(list);
      if (JSON.stringify(next) !== JSON.stringify(this.offsets)) this.offsets = next;
    },

    /* ---- resizing ---- */
    canResize(this: State, id: string): boolean {
      return this.resizable && this.col(id)?.resizable !== false;
    },
    setColumnSize(this: State, id: string, width: number | null) {
      const next = { ...this.sizes };
      const c = this.col(id);
      if (width === null) delete next[id];
      else next[id] = clampColumnSize(width, c?.minSize, c?.maxSize);
      this.sizes = next;
    },
    /** grid-template-columns: one track per shown column in display order, sized ones in px. */
    gridCols(this: State): string {
      const tracks: string[] = [];
      if (this.selectable) tracks.push("auto");
      if (this.expandKey || this.expandSlot) tracks.push("auto");
      for (const id of orderByPinning(this.columns.map((c) => c.id), this.pinning)) {
        if (this.shown[id]) tracks.push(this.sizes[id] ? `${this.sizes[id]}px` : "auto");
      }
      if (this.actions.length) tracks.push("auto");
      return `grid-template-columns: ${tracks.join(" ")}`;
    },
    headWidth(el: HTMLElement): { w: number; dir: number } {
      const th = el.closest<HTMLElement>('[data-slot="table-head"]')!;
      return { w: th.getBoundingClientRect().width, dir: getComputedStyle(th).direction === "rtl" ? -1 : 1 };
    },
    resizeStart(this: State, e: PointerEvent, id: string) {
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      const { w, dir } = this.headWidth(el);
      this.drag = { id, x: e.clientX, w, dir };
    },
    resizeMove(this: State, e: PointerEvent, id: string) {
      const d = this.drag;
      if (d && d.id === id) this.setColumnSize(id, d.w + (e.clientX - d.x) * d.dir);
    },
    resizeEnd(this: State) {
      this.drag = null;
    },
    resizeKey(this: State, e: KeyboardEvent, id: string) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const { w, dir } = this.headWidth(e.currentTarget as HTMLElement);
      const grow = (e.key === "ArrowRight" ? 1 : -1) * dir;
      this.setColumnSize(id, (this.sizes[id] ?? w) + grow * (e.shiftKey ? 64 : 16));
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
      if (this.expandSlot) return this.matches(row, this.expandWhen);
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
    /* ---- per-row actions and the context menu ---- */
    matches(this: State, row: Row, c: Condition | undefined): boolean {
      if (!c) return true;
      if (c.any) return c.any.some((x) => this.matches(row, x));
      if (c.all) return c.all.every((x) => this.matches(row, x));
      const v = row[c.field ?? ""];
      if (c.in) return c.in.map(String).includes(String(v));
      if (c.notIn) return !c.notIn.map(String).includes(String(v));
      if (c.eq !== undefined) return String(v) === String(c.eq);
      if (c.ne !== undefined) return String(v) !== String(c.ne);
      if (c.empty !== undefined) return (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) === c.empty;
      return true;
    },
    /** Whether action `i` shows for this row. */
    actionOn(this: State, row: Row, i: number): boolean {
      const a = this.actions[i];
      if (!a || !row) return false;
      const allowed = this.actionsKey ? row[this.actionsKey] : undefined;
      if (Array.isArray(allowed) && !allowed.map(String).includes(a.id)) return false;
      return this.matches(row, a.visibleWhen);
    },
    /** Whether action `i` is disabled for this row. */
    actionOff(this: State, row: Row, i: number): boolean {
      const a = this.actions[i];
      return !!a?.disabledWhen && this.matches(row, a.disabledWhen);
    },
    hasActions(this: State, row: Row): boolean {
      return this.actions.some((_a, i) => this.actionOn(row, i));
    },
    /** A separator shows before action `i` when it starts a new group among the visible actions. */
    sepBefore(this: State, row: Row, i: number): boolean {
      if (!this.actionOn(row, i)) return false;
      for (let j = i - 1; j >= 0; j--) if (this.actionOn(row, j)) return (this.actions[j]!.group ?? null) !== (this.actions[i]!.group ?? null);
      return false;
    },
    menuEl(this: State): HTMLElement | null {
      return this.root?.querySelector<HTMLElement>('[data-slot="data-table-context-menu"]') ?? null;
    },
    /** Opens the row's actions as a context menu. Returns false when the row has none (or the menu is off). */
    openRowMenu(this: State, row: Row, rowEl: HTMLElement, x: number, y: number, keyboard: boolean): boolean {
      const host = this.menuEl();
      if (!this.contextMenu || !host || !this.hasActions(row)) return false;
      const menu = (Alpine as unknown as WithData).$data(host) as unknown as { openAt(x: number, y: number, keyboard?: boolean): void };
      this.ctxRow = row;
      this.ctxReturn = rowEl;
      menu.openAt(x, y, keyboard);
      return true;
    },
    rowContext(this: State, row: Row, event: MouseEvent) {
      if (event.shiftKey || (event.target as Element).closest?.(NATIVE)) return;
      if (this.openRowMenu(row, event.currentTarget as HTMLElement, event.clientX, event.clientY, false)) event.preventDefault();
    },
    rowTouch(this: State, row: Row, event: TouchEvent) {
      const t = event.touches[0];
      if (!t || (event.target as Element).closest?.(NATIVE)) return;
      const el = event.currentTarget as HTMLElement;
      clearTimeout(this.press);
      this.press = setTimeout(() => this.openRowMenu(row, el, t.clientX, t.clientY, false), 500);
    },
    rowTouchEnd(this: State) {
      clearTimeout(this.press);
    },
    /** Shift+F10 or the Menu key on a row (or something in it): the context menu at the row, else the ⋯ button. */
    rowMenuKey(this: State, row: Row, event: KeyboardEvent): boolean {
      if (!isMenuKey(event) || (event.target as Element).closest?.(NATIVE)) return false;
      const rowEl = event.currentTarget as HTMLElement;
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const rtl = getComputedStyle(rowEl).direction === "rtl";
      if (this.openRowMenu(row, rowEl, rtl ? rect.right - 24 : rect.left + 24, rect.top + rect.height / 2, true)) {
        event.preventDefault();
        return true;
      }
      const trigger = rowEl.querySelector<HTMLElement>("[data-slot=data-table-row-actions]");
      if (trigger && this.hasActions(row)) {
        event.preventDefault();
        trigger.click();
        return true;
      }
      return false;
    },
    /** Called when the context menu closes: focus goes back to the row it was opened on. */
    menuClosed(this: State, open: boolean) {
      this.ctxOpen = open;
      if (open || !this.ctxReturn) return;
      const back = this.ctxReturn;
      this.ctxReturn = null;
      void this.$nextTick(() => {
        const a = document.activeElement;
        if (!a || a === document.body || !document.contains(a)) back.focus({ preventScroll: true });
      });
    },
    act(this: State, action: string, row: Row) {
      const i = this.actions.findIndex((a) => a.id === action);
      if (i >= 0 && (!this.actionOn(row, i) || this.actionOff(row, i))) return;
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
      if (this.rowMenuKey(row, event)) return;
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
      return !!col.edit && !(this.cellId(row, col) in this.pending) && !(col.editDisabledWhen && this.matches(row, col.editDisabledWhen));
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
