/* Pure helpers for ContentTableEditor: cell coercion, sorting, filtering, summaries, history and CSV. No React. */

export type ContentColumnType = "text" | "number" | "select" | "date" | "checkbox" | "url" | "tags";
export const CONTENT_COLUMN_TYPES: readonly ContentColumnType[] = ["text", "number", "select", "date", "checkbox", "url", "tags"];

export interface ContentOption {
  value: string;
  label: string;
  /** A badge hue from the Nasaq tag palette: gray, red, orange, amber, green, teal, blue, violet, pink. */
  hue?: string;
}

export interface ContentColumn {
  id: string;
  label: string;
  type: ContentColumnType;
  /** Choices for `select` and `tags` columns. */
  options?: ContentOption[];
  /** A row without a value here is flagged. */
  required?: boolean;
  /** Width in px. Default 180. */
  width?: number;
}

export type ContentCell = string | number | boolean | string[] | null;

export interface ContentRow {
  id: string;
  cells: Record<string, ContentCell>;
}

export interface ContentTableValue {
  columns: ContentColumn[];
  rows: ContentRow[];
}

export type SortDirection = "asc" | "desc";
export interface SortState {
  column: string;
  direction: SortDirection;
}

let counter = 0;
/** A short unique id for rows and columns created in the editor. */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function emptyCell(type: ContentColumnType): ContentCell {
  if (type === "checkbox") return false;
  if (type === "tags") return [];
  return null;
}

export function isEmpty(cell: ContentCell | undefined): boolean {
  if (cell === null || cell === undefined) return true;
  if (typeof cell === "string") return cell.trim() === "";
  if (Array.isArray(cell)) return cell.length === 0;
  return false;
}

/** Turns whatever a cell holds (or a typed string) into a valid value for the column type. */
export function coerceCell(type: ContentColumnType, raw: unknown): ContentCell {
  if (raw === null || raw === undefined) return emptyCell(type);
  switch (type) {
    case "number": {
      if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
      if (typeof raw === "string") {
        const cleaned = raw.replace(/[٬,\s]/g, "").replace("٫", ".");
        if (cleaned === "") return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }
    case "checkbox":
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "string") return ["true", "yes", "1", "x"].includes(raw.trim().toLowerCase());
      return Boolean(raw);
    case "tags":
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    case "date": {
      if (typeof raw !== "string" || raw === "") return null;
      return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
    }
    default:
      if (Array.isArray(raw)) return raw.join(", ");
      return String(raw);
  }
}

/** The text a cell shows or exports, without locale formatting. */
export function cellText(column: ContentColumn, cell: ContentCell | undefined): string {
  if (isEmpty(cell) && cell !== false) return "";
  const labelOf = (v: string) => column.options?.find((o) => o.value === v)?.label ?? v;
  if (Array.isArray(cell)) return cell.map(labelOf).join(", ");
  if (column.type === "select") return labelOf(String(cell));
  if (column.type === "checkbox") return cell ? "true" : "false";
  return String(cell);
}

const blank = (cell: ContentCell | undefined) => isEmpty(cell) && cell !== false;

export function compareCells(column: ContentColumn, a: ContentCell | undefined, b: ContentCell | undefined): number {
  if (blank(a) || blank(b)) return blank(a) === blank(b) ? 0 : blank(a) ? 1 : -1;
  if (column.type === "number") return Number(a) - Number(b);
  if (column.type === "checkbox") return Number(Boolean(a)) - Number(Boolean(b));
  if (column.type === "tags") return (a as string[]).length - (b as string[]).length;
  return cellText(column, a).localeCompare(cellText(column, b), undefined, { numeric: true, sensitivity: "base" });
}

/** Sorts a copy. Empty cells stay last in both directions. */
export function sortRows(rows: ContentRow[], columns: ContentColumn[], sort: SortState | null): ContentRow[] {
  const column = sort ? columns.find((c) => c.id === sort.column) : undefined;
  if (!sort || !column) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const a = x.cells[column.id];
    const b = y.cells[column.id];
    if (blank(a) || blank(b)) return blank(a) === blank(b) ? 0 : blank(a) ? 1 : -1;
    return compareCells(column, a, b) * dir;
  });
}

/** Case-insensitive match against the text of every cell. */
export function filterRows(rows: ContentRow[], columns: ContentColumn[], query: string): ContentRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => columns.some((c) => cellText(c, row.cells[c.id]).toLowerCase().includes(q)));
}

export interface ColumnSummary {
  filled: number;
  total: number;
  sum?: number;
  average?: number;
  min?: number;
  max?: number;
  checked?: number;
}

export function summarize(rows: ContentRow[], column: ContentColumn): ColumnSummary {
  const total = rows.length;
  if (column.type === "checkbox") {
    const checked = rows.filter((r) => r.cells[column.id] === true).length;
    return { filled: checked, total, checked };
  }
  if (column.type !== "number") return { filled: rows.filter((r) => !isEmpty(r.cells[column.id])).length, total };
  const nums = rows.map((r) => r.cells[column.id]).filter((v): v is number => typeof v === "number");
  if (!nums.length) return { filled: 0, total };
  const sum = nums.reduce((s, n) => s + n, 0);
  return { filled: nums.length, total, sum, average: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
}

export type CellIssue = "required" | "url" | null;

const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
export function validateCell(column: ContentColumn, cell: ContentCell | undefined): CellIssue {
  if (column.required && blank(cell)) return "required";
  if (column.type === "url" && typeof cell === "string" && cell.trim() !== "" && !URL_RE.test(cell.trim())) return "url";
  return null;
}

export interface TableIssue {
  rowId: string;
  columnId: string;
  issue: Exclude<CellIssue, null>;
}

export function validateTable(value: ContentTableValue): TableIssue[] {
  const issues: TableIssue[] = [];
  for (const row of value.rows) {
    for (const column of value.columns) {
      const issue = validateCell(column, row.cells[column.id]);
      if (issue) issues.push({ rowId: row.id, columnId: column.id, issue });
    }
  }
  return issues;
}

export function blankRow(columns: ContentColumn[], overrides: Record<string, ContentCell> = {}): ContentRow {
  const cells: Record<string, ContentCell> = {};
  for (const c of columns) cells[c.id] = emptyCell(c.type);
  return { id: makeId("row"), cells: { ...cells, ...overrides } };
}

export function cloneRow(row: ContentRow): ContentRow {
  return { id: makeId("row"), cells: JSON.parse(JSON.stringify(row.cells)) as Record<string, ContentCell> };
}

export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const i = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, i), item, ...list.slice(i)];
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

/** Changes a column's type and converts every cell that can be kept. */
export function changeColumnType(value: ContentTableValue, columnId: string, type: ContentColumnType): ContentTableValue {
  const column = value.columns.find((c) => c.id === columnId);
  if (!column || column.type === type) return value;
  const columns = value.columns.map((c) => (c.id === columnId ? { ...c, type, options: type === "select" || type === "tags" ? c.options ?? [] : undefined } : c));
  const rows = value.rows.map((r) => {
    const current = r.cells[columnId];
    const raw = Array.isArray(current) && type !== "tags" ? current.join(", ") : current;
    return { ...r, cells: { ...r.cells, [columnId]: coerceCell(type, raw) } };
  });
  return { columns, rows };
}

/** Parses "Draft, Review, Live" (one per line or comma separated) into select options. */
export function parseOptions(text: string): ContentOption[] {
  const seen = new Set<string>();
  const hues = ["blue", "green", "amber", "violet", "teal", "pink", "orange", "gray"];
  const out: ContentOption[] = [];
  for (const part of text.split(/[\n,،]/)) {
    const label = part.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ value: label, label, hue: hues[out.length % hues.length] });
  }
  return out;
}

/* ------------------------------------------------------------------ history */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 50;

export function pushHistory<T>(h: History<T>, next: T): History<T> {
  if (Object.is(h.present, next)) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}
export function undoHistory<T>(h: History<T>): History<T> {
  const previous = h.past[h.past.length - 1];
  if (previous === undefined) return h;
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
}
export function redoHistory<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future;
  if (next === undefined) return h;
  return { past: [...h.past, h.present], present: next, future: rest };
}

/* ------------------------------------------------------------------ export */

function csvField(text: string): string {
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(value: ContentTableValue): string {
  const head = value.columns.map((c) => csvField(c.label)).join(",");
  const lines = value.rows.map((r) => value.columns.map((c) => csvField(cellText(c, r.cells[c.id]))).join(","));
  return [head, ...lines].join("\r\n");
}
