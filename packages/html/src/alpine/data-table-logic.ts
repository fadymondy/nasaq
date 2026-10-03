// Pure helpers shared with the React/Vue DataTable (copied verbatim: sorting, range filters, in-cell edit coercion).
/* Pure helpers behind useDataTable: multi-column sorting, range filters and column pinning. No React. */

export type DataTableSortDirection = "asc" | "desc";
export interface DataTableSort {
  id: string;
  direction: DataTableSortDirection;
}

/** Bounds of a range filter. Numbers, or `YYYY-MM-DD` dates (`max` then includes that whole day). */
export interface DataTableRange {
  min?: number | string | null;
  max?: number | string | null;
}

/** Columns pinned to the inline start and end, in display order. */
export interface DataTablePinning {
  start?: string[];
  end?: string[];
}

export type SortableValue = string | number | Date | null | undefined;

/**
 * The sort after a header click. A plain click sorts by that column alone (asc → desc → off). An additive click
 * (Shift, with `multiSort`) adds the column at the end, flips it to desc, or removes it.
 */
export function nextSorting(sorting: readonly DataTableSort[], id: string, additive = false): DataTableSort[] {
  const current = sorting.find((s) => s.id === id);
  if (!additive) {
    if (!current) return [{ id, direction: "asc" }];
    // A column that was one of several restarts the cycle as the only sort.
    if (sorting.length > 1) return [{ id, direction: current.direction }];
    return current.direction === "asc" ? [{ id, direction: "desc" }] : [];
  }
  if (!current) return [...sorting, { id, direction: "asc" }];
  if (current.direction === "asc") return sorting.map((s) => (s.id === id ? { id, direction: "desc" } : s));
  return sorting.filter((s) => s.id !== id);
}

function comparable(v: SortableValue): string | number | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  return v;
}

/**
 * Sorts by each key in turn. Nulls and empty strings always sort last, in either direction, and ties keep the
 * original order. Strings compare with `Intl.Collator` (numeric, accent- and case-insensitive).
 */
export function sortTableRows<T>(
  rows: readonly T[],
  sorting: readonly DataTableSort[],
  valueOf: (id: string) => ((row: T) => SortableValue) | undefined,
  locale = "en",
): T[] {
  const keys = sorting.map((s) => ({ fn: valueOf(s.id), dir: s.direction === "asc" ? 1 : -1 })).filter((k) => k.fn);
  if (!keys.length) return [...rows];
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return rows
    .map((row, i) => ({ row, i, v: keys.map((k) => comparable(k.fn!(row))) }))
    .sort((a, b) => {
      for (let k = 0; k < keys.length; k++) {
        const x = a.v[k] ?? null;
        const y = b.v[k] ?? null;
        if (x === null || y === null) {
          if (x === y) continue;
          return x === null ? 1 : -1;
        }
        const cmp = typeof x === "string" && typeof y === "string" ? collator.compare(x, y) : Number(x) - Number(y);
        if (cmp) return cmp * keys[k]!.dir;
      }
      return a.i - b.i;
    })
    .map((x) => x.row);
}

const DAY = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A bound as a number: dates become epoch milliseconds. `null` when empty or unreadable. */
export function rangeBound(value: number | string | null | undefined, edge: "min" | "max"): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (ISO_DAY.test(trimmed)) {
    const t = Date.parse(`${trimmed}T00:00:00Z`);
    return Number.isNaN(t) ? null : edge === "max" ? t + DAY - 1 : t;
  }
  const n = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(n)) return n;
  const t = Date.parse(trimmed);
  return Number.isNaN(t) ? null : t;
}

/** A row value as a number for range checks. Dates and ISO strings become epoch milliseconds. */
export function rangeValueOf(value: SortableValue): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return rangeBound(value, "min");
}

/** Whether a range has at least one usable bound. */
export function isActiveRange(range: DataTableRange | null | undefined): boolean {
  return !!range && (rangeBound(range.min, "min") !== null || rangeBound(range.max, "max") !== null);
}

/** Inclusive on both ends. A row without a value fails any active range. */
export function inRange(value: SortableValue, range: DataTableRange): boolean {
  const min = rangeBound(range.min, "min");
  const max = rangeBound(range.max, "max");
  if (min === null && max === null) return true;
  const v = rangeValueOf(value);
  if (v === null) return false;
  return (min === null || v >= min) && (max === null || v <= max);
}

/** Column ids in display order: start-pinned, then the rest in their own order, then end-pinned. */
export function orderByPinning(ids: readonly string[], pinning: DataTablePinning): string[] {
  const known = new Set(ids);
  const start = (pinning.start ?? []).filter((id) => known.has(id));
  const end = (pinning.end ?? []).filter((id) => known.has(id) && !start.includes(id));
  const pinned = new Set([...start, ...end]);
  return [...start, ...ids.filter((id) => !pinned.has(id)), ...end];
}

/** Moves a column to a side, or unpins it with `null`. */
export function pinColumnIn(pinning: DataTablePinning, id: string, side: "start" | "end" | null): DataTablePinning {
  const start = (pinning.start ?? []).filter((c) => c !== id);
  const end = (pinning.end ?? []).filter((c) => c !== id);
  if (side === "start") start.push(id);
  if (side === "end") end.unshift(id);
  return { start, end };
}

/**
 * Sticky offsets for pinned cells, from measured widths. Start offsets add up from the inline start, end offsets
 * from the inline end. `widths` lists every rendered column in order, with its pin side.
 */
export function pinOffsets(cols: readonly { id: string; pin?: "start" | "end" | null; width: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  let start = 0;
  for (const c of cols) {
    if (c.pin !== "start") continue;
    out[c.id] = start;
    start += c.width;
  }
  let end = 0;
  for (let i = cols.length - 1; i >= 0; i--) {
    const c = cols[i]!;
    if (c.pin !== "end") continue;
    out[c.id] = end;
    end += c.width;
  }
  return out;
}

/** Keeps a resized width inside the column's limits. */
export function clampColumnSize(width: number, min = 48, max = 960): number {
  return Math.round(Math.min(max, Math.max(min, width)));
}

/* Pure helpers for DataTable's in-cell editing: value coercion, change detection and where focus goes after a commit. */

export type CellEditKind = "text" | "number" | "select" | "date" | "switch" | "custom";
export type CellValue = string | number | boolean | null;

export type CoerceResult = { ok: true; value: CellValue } | { ok: false; reason: "number" | "date" };

/** Turns what was typed into the column's value. Blank numbers and dates become `null`; text stays a string. */
export function coerceEditValue(kind: CellEditKind, raw: string): CoerceResult {
  if (kind === "number") {
    // Accept Arabic-Indic digits and the Arabic decimal separator, as people type them on an Arabic keyboard.
    const latin = raw
      .trim()
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/٫/g, ".")
      .replace(/٬/g, "")
      .replace(/,/g, "");
    if (latin === "") return { ok: true, value: null };
    const n = Number(latin);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: "number" };
  }
  if (kind === "date") {
    const v = raw.trim();
    if (v === "") return { ok: true, value: null };
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? { ok: true, value: v } : { ok: false, reason: "date" };
  }
  return { ok: true, value: raw };
}

/** Whether two cell values are the same for the purpose of skipping a pointless save. Empty text equals null. */
export function sameCellValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === null || v === "" ? null : v);
  return norm(a) === norm(b);
}

/** Key for per-cell state (pending, error). */
export const cellKey = (rowId: string, columnId: string) => `${rowId}\u0000${columnId}`;

export interface CellPos {
  row: number;
  col: number;
}

/**
 * Where to go after a commit. `down` stays in the column (no wrap), `right` and `left` walk the editable columns and
 * wrap to the next or previous row. Returns `null` at the edges. `editable(row, col)` says whether a cell can be edited.
 */
export function nextCell(
  from: CellPos,
  move: "down" | "up" | "right" | "left",
  rowCount: number,
  colCount: number,
  editable: (row: number, col: number) => boolean,
): CellPos | null {
  if (move === "down" || move === "up") {
    const step = move === "down" ? 1 : -1;
    for (let r = from.row + step; r >= 0 && r < rowCount; r += step) if (editable(r, from.col)) return { row: r, col: from.col };
    return null;
  }
  const step = move === "right" ? 1 : -1;
  let { row, col } = from;
  for (;;) {
    col += step;
    if (col >= colCount || col < 0) {
      row += step;
      col = step === 1 ? 0 : colCount - 1;
    }
    if (row < 0 || row >= rowCount) return null;
    if (editable(row, col)) return { row, col };
  }
}
