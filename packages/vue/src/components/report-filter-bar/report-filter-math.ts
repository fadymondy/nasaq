/*
 * Report filter maths: the filter state, its URL form, saved views and the Markdown export of a report.
 * Pure, so the tests can run it in node. The URL is the source of truth: `filtersToParams` and `filtersFromParams`
 * round-trip, and anything unknown or invalid in a URL is dropped instead of thrown at.
 */
import type { TimeComparison, TimeRangeValue } from "../time-range-picker/time-range-math";

/** Reads and writes a range as text. Pass `parseTimeRange` and `serializeTimeRange` (the bound helpers in report-filter-url do). */
export interface ReportRangeCodec {
  parse: (text: string | null | undefined) => TimeRangeValue | null;
  serialize: (value: TimeRangeValue) => string;
}

/** Whether two ranges are the same window. */
export function sameReportRange(a: TimeRangeValue, b: TimeRangeValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "relative" && b.kind === "relative") return a.preset === b.preset;
  if (a.kind === "week" && b.kind === "week") return a.start === b.start;
  if (a.kind === "custom" && b.kind === "custom") return a.from === b.from && a.to === b.to;
  return false;
}

export type ReportFilterKind = "select" | "multi" | "toggle";

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFilterFieldSpec {
  id: string;
  kind: ReportFilterKind;
  /** The values a URL may carry. Anything else is dropped. Without it every value is accepted. */
  options?: readonly ReportFilterOption[];
}

export interface ReportFilterState {
  range: TimeRangeValue;
  comparison: TimeComparison;
  /** One entry per field. Empty means "all". A "select" or "toggle" field holds at most one value. */
  fields: Record<string, string[]>;
}

const COMPARISONS: readonly TimeComparison[] = ["none", "previous", "year"];
export const REPORT_PARAM_RANGE = "range";
export const REPORT_PARAM_COMPARE = "compare";

/** Field ids that would collide with the range and comparison keys. */
export const RESERVED_FILTER_IDS: readonly string[] = [REPORT_PARAM_RANGE, REPORT_PARAM_COMPARE];

export function emptyReportFilters(fields: readonly ReportFilterFieldSpec[], range: TimeRangeValue, comparison: TimeComparison = "none"): ReportFilterState {
  return { range, comparison, fields: Object.fromEntries(fields.map((f) => [f.id, [] as string[]])) };
}

/** Clean a list of values for a field: only listed options, no duplicates, one value for single choice fields. */
export function cleanFieldValues(field: ReportFilterFieldSpec, values: readonly string[]): string[] {
  const allowed = field.options ? new Set(field.options.map((o) => o.value)) : null;
  const seen: string[] = [];
  for (const v of values) {
    if (v === "" || seen.includes(v)) continue;
    if (allowed && !allowed.has(v)) continue;
    seen.push(v);
  }
  return field.kind === "multi" ? seen : seen.slice(0, 1);
}

/** The query string form. Defaults are left out so a shared link stays short. Fields use repeated keys: `status=a&status=b`. */
export function filtersToParams(state: ReportFilterState, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState, codec: ReportRangeCodec): URLSearchParams {
  const out = new URLSearchParams();
  if (!sameReportRange(state.range, defaults.range)) out.set(REPORT_PARAM_RANGE, codec.serialize(state.range));
  if (state.comparison !== defaults.comparison) out.set(REPORT_PARAM_COMPARE, state.comparison);
  for (const f of fields) {
    const values = cleanFieldValues(f, state.fields[f.id] ?? []);
    const base = cleanFieldValues(f, defaults.fields[f.id] ?? []);
    if (sameList(values, base, f.kind === "multi")) continue;
    // A field that was cleared while its default has values must stay cleared: mark it with an empty value.
    if (values.length === 0) out.append(f.id, "");
    else for (const v of values) out.append(f.id, v);
  }
  return out;
}

/** Reads the state back from a query string. Unknown keys, bad values and bad ranges fall back to the defaults. */
export function filtersFromParams(input: URLSearchParams | string, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState, codec: ReportRangeCodec): ReportFilterState {
  const params = typeof input === "string" ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input) : input;
  const range = codec.parse(params.get(REPORT_PARAM_RANGE)) ?? defaults.range;
  const rawCompare = params.get(REPORT_PARAM_COMPARE);
  const comparison = COMPARISONS.find((c) => c === rawCompare) ?? defaults.comparison;
  const out: Record<string, string[]> = {};
  for (const f of fields) {
    if (!params.has(f.id)) {
      out[f.id] = [...cleanFieldValues(f, defaults.fields[f.id] ?? [])];
      continue;
    }
    out[f.id] = cleanFieldValues(f, params.getAll(f.id));
  }
  return { range, comparison, fields: out };
}

function sameList(a: readonly string[], b: readonly string[], unordered: boolean): boolean {
  if (a.length !== b.length) return false;
  if (!unordered) return a.every((v, i) => v === b[i]);
  const set = new Set(b);
  return a.every((v) => set.has(v));
}

export function sameReportFilters(a: ReportFilterState, b: ReportFilterState, fields: readonly ReportFilterFieldSpec[]): boolean {
  if (!sameReportRange(a.range, b.range) || a.comparison !== b.comparison) return false;
  return fields.every((f) => sameList(cleanFieldValues(f, a.fields[f.id] ?? []), cleanFieldValues(f, b.fields[f.id] ?? []), f.kind === "multi"));
}

/** How many filters differ from the defaults: the range, the comparison and each field count as one. */
export function activeFilterCount(state: ReportFilterState, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState): number {
  let n = 0;
  if (!sameReportRange(state.range, defaults.range)) n++;
  if (state.comparison !== defaults.comparison) n++;
  for (const f of fields) {
    if (!sameList(cleanFieldValues(f, state.fields[f.id] ?? []), cleanFieldValues(f, defaults.fields[f.id] ?? []), f.kind === "multi")) n++;
  }
  return n;
}

/* ------------------------------------------------------------------------------------------ saved views */

export interface SavedReportView {
  id: string;
  name: string;
  /** The filters as a query string, made by `filtersToParams(...).toString()`. */
  query: string;
  /** Anyone with the link can open it. */
  shared?: boolean;
}

export function viewToState(view: Pick<SavedReportView, "query">, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState, codec: ReportRangeCodec): ReportFilterState {
  return filtersFromParams(view.query, fields, defaults, codec);
}

/** Whether the current filters are the ones a view stores. */
export function viewMatches(view: Pick<SavedReportView, "query">, state: ReportFilterState, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState, codec: ReportRangeCodec): boolean {
  return sameReportFilters(viewToState(view, fields, defaults, codec), state, fields);
}

/** A name that is not taken: "Weekly", then "Weekly (2)". Comparison ignores case and spaces at the ends. */
export function uniqueViewName(name: string, taken: readonly string[]): string {
  const clean = name.trim().replace(/\s+/g, " ");
  const used = new Set(taken.map((n) => n.trim().toLowerCase()));
  if (!used.has(clean.toLowerCase())) return clean;
  let i = 2;
  while (used.has(`${clean} (${i})`.toLowerCase())) i++;
  return `${clean} (${i})`;
}

export function isValidViewName(name: string, max = 60): boolean {
  const clean = name.trim();
  return clean.length > 0 && clean.length <= max;
}

/* -------------------------------------------------------------------------------------- markdown export */

export type ReportCell = string | number | null | undefined;

export interface ReportDocSection {
  heading?: string;
  text?: string;
  /** Label and value pairs, shown as a list. */
  stats?: readonly { label: string; value: string }[];
  table?: { columns: readonly string[]; rows: readonly (readonly ReportCell[])[] };
}

export interface ReportDoc {
  title: string;
  subtitle?: string;
  /** What the report was filtered by, as text. */
  filters?: readonly { label: string; value: string }[];
  generatedAt?: string;
  sections: readonly ReportDocSection[];
}

/** Escape text for a Markdown table cell: pipes, line breaks and backslashes. */
export function markdownCell(value: ReportCell): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** The report as Markdown: title, filters, then each section. Tables are GitHub style. */
export function reportToMarkdown(doc: ReportDoc): string {
  const lines: string[] = [`# ${doc.title}`, ""];
  if (doc.subtitle) lines.push(doc.subtitle, "");
  if (doc.filters?.length) {
    for (const f of doc.filters) lines.push(`- **${f.label}:** ${f.value}`);
    lines.push("");
  }
  if (doc.generatedAt) lines.push(`_${doc.generatedAt}_`, "");
  for (const s of doc.sections) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    if (s.text) lines.push(s.text, "");
    if (s.stats?.length) {
      for (const st of s.stats) lines.push(`- **${st.label}:** ${st.value}`);
      lines.push("");
    }
    if (s.table && s.table.columns.length) {
      lines.push(`| ${s.table.columns.map(markdownCell).join(" | ")} |`);
      lines.push(`| ${s.table.columns.map(() => "---").join(" | ")} |`);
      for (const row of s.table.rows) lines.push(`| ${s.table.columns.map((_, i) => markdownCell(row[i])).join(" | ")} |`);
      lines.push("");
    }
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
