/* Pure helpers for ReportEditor and ReportViewer: the block model, chart data, table of contents, counts. No React. */

export type ReportBlockType = "heading" | "text" | "metrics" | "chart" | "table" | "callout" | "divider";
export const REPORT_BLOCK_TYPES: readonly ReportBlockType[] = ["heading", "text", "metrics", "chart", "table", "callout", "divider"];

export type CalloutTone = "info" | "success" | "warning" | "danger";
export const CALLOUT_TONES: readonly CalloutTone[] = ["info", "success", "warning", "danger"];

export type ChartKind = "bar" | "line" | "area";
export const CHART_KINDS: readonly ChartKind[] = ["bar", "line", "area"];

export interface ReportFigure {
  id: string;
  label: string;
  value: number;
  /** Change versus the previous period as a fraction: 0.124 is +12.4%. */
  delta?: number;
  /** A currency code such as "SAR" formats the value as money. */
  currency?: string;
  /** Text after the delta, such as "vs last month". */
  deltaLabel?: string;
}

interface Base {
  id: string;
}
export interface HeadingBlock extends Base {
  type: "heading";
  text: string;
  level: 1 | 2 | 3;
}
export interface TextBlock extends Base {
  type: "text";
  /** HTML produced by the RichTextEditor. */
  html: string;
}
export interface MetricsBlock extends Base {
  type: "metrics";
  items: ReportFigure[];
}
export interface ChartBlock extends Base {
  type: "chart";
  title: string;
  kind: ChartKind;
  /** Series names, in order. Each row has one value per series. */
  series: string[];
  rows: { label: string; values: number[] }[];
  caption?: string;
}
export interface TableBlock extends Base {
  type: "table";
  title?: string;
  columns: string[];
  rows: string[][];
}
export interface CalloutBlock extends Base {
  type: "callout";
  tone: CalloutTone;
  title?: string;
  text: string;
}
export interface DividerBlock extends Base {
  type: "divider";
}
export type ReportBlock = HeadingBlock | TextBlock | MetricsBlock | ChartBlock | TableBlock | CalloutBlock | DividerBlock;

export interface Report {
  title: string;
  subtitle?: string;
  author?: string;
  /** ISO date, yyyy-mm-dd. */
  date?: string;
  blocks: ReportBlock[];
}

let counter = 0;
export function makeBlockId(): string {
  counter += 1;
  return `blk_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function newBlock(type: ReportBlockType): ReportBlock {
  const id = makeBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2 };
    case "text":
      return { id, type, html: "" };
    case "metrics":
      return { id, type, items: [{ id: makeBlockId(), label: "", value: 0 }] };
    case "chart":
      return { id, type, title: "", kind: "bar", series: ["Series 1"], rows: [{ label: "A", values: [0] }, { label: "B", values: [0] }] };
    case "table":
      return { id, type, columns: ["", ""], rows: [["", ""]] };
    case "callout":
      return { id, type, tone: "info", text: "" };
    default:
      return { id, type: "divider" };
  }
}

/** A copy with fresh ids, for Duplicate. */
export function cloneBlock(block: ReportBlock): ReportBlock {
  const copy = JSON.parse(JSON.stringify(block)) as ReportBlock;
  copy.id = makeBlockId();
  if (copy.type === "metrics") copy.items = copy.items.map((m) => ({ ...m, id: makeBlockId() }));
  return copy;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Text of an HTML string without tags, with block ends as newlines. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function plainText(block: ReportBlock): string {
  switch (block.type) {
    case "heading":
      return block.text;
    case "text":
      return htmlToText(block.html);
    case "callout":
      return [block.title, block.text].filter(Boolean).join("\n");
    case "chart":
      return block.title;
    case "table":
      return block.title ?? "";
    case "metrics":
      return block.items.map((m) => m.label).join(", ");
    default:
      return "";
  }
}

/** Switches a block to another type, keeping the text it can carry over. */
export function convertBlock(block: ReportBlock, type: ReportBlockType): ReportBlock {
  if (block.type === type) return block;
  const fresh = newBlock(type);
  const text = plainText(block);
  if (fresh.type === "heading") fresh.text = text.split("\n")[0] ?? "";
  if (fresh.type === "text") fresh.html = text ? `<p>${escapeHtml(text)}</p>` : "";
  if (fresh.type === "callout") fresh.text = text;
  return { ...fresh, id: block.id } as ReportBlock;
}

/** Words in the whole report: runs of letters and digits, so Arabic and Latin text both count. */
export function wordCount(report: Report): number {
  let total = 0;
  for (const block of report.blocks) {
    total += (plainText(block).match(/[\p{L}\p{N}]+/gu) ?? []).length;
  }
  return total;
}

/** Whole minutes to read at about 200 words a minute, at least 1 for any text. */
export function readingMinutes(words: number): number {
  return words <= 0 ? 0 : Math.max(1, Math.round(words / 200));
}

export interface TocEntry {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

/** The headings with text, for the contents list. */
export function tocOf(report: Report): TocEntry[] {
  return report.blocks.flatMap((b) => (b.type === "heading" && b.text.trim() ? [{ id: b.id, text: b.text.trim(), level: b.level }] : []));
}

export function chartSeriesKey(index: number): string {
  return `s${index}`;
}

/** Rows shaped for Recharts: `{ label, s0, s1 }`. Missing values become 0. */
export function chartRows(block: ChartBlock): Record<string, string | number>[] {
  return block.rows.map((row) => {
    const out: Record<string, string | number> = { label: row.label };
    block.series.forEach((_, i) => {
      const v = row.values[i];
      out[chartSeriesKey(i)] = typeof v === "number" && Number.isFinite(v) ? v : 0;
    });
    return out;
  });
}

/** Keeps every row's values the same length as the series list. */
export function fitChart(block: ChartBlock): ChartBlock {
  return { ...block, rows: block.rows.map((r) => ({ ...r, values: block.series.map((_, i) => r.values[i] ?? 0) })) };
}

export function addSeries(block: ChartBlock, name: string): ChartBlock {
  return fitChart({ ...block, series: [...block.series, name] });
}

export function removeSeries(block: ChartBlock, index: number): ChartBlock {
  if (block.series.length <= 1) return block;
  return { ...block, series: block.series.filter((_, i) => i !== index), rows: block.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== index) })) };
}

/** Keeps every table row as wide as the header. */
export function fitTable(block: TableBlock): TableBlock {
  return { ...block, rows: block.rows.map((r) => block.columns.map((_, i) => r[i] ?? "")) };
}

export function addTableColumn(block: TableBlock): TableBlock {
  return fitTable({ ...block, columns: [...block.columns, ""] });
}

export function removeTableColumn(block: TableBlock, index: number): TableBlock {
  if (block.columns.length <= 1) return block;
  return { ...block, columns: block.columns.filter((_, i) => i !== index), rows: block.rows.map((r) => r.filter((_, i) => i !== index)) };
}

/** Parses a typed number, accepting Arabic-Indic digits and separators. Anything unreadable becomes 0. */
export function parseNumber(text: string): number {
  const western = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const cleaned = western.replace(/[٬,\s]/g, "").replace("٫", ".");
  const n = Number(cleaned);
  return cleaned !== "" && Number.isFinite(n) ? n : 0;
}

export interface ReportIssue {
  blockId: string;
  kind: "empty-heading" | "empty-text" | "empty-metric" | "empty-chart" | "empty-table";
}

/** Blocks a reader would see as blank or half filled. */
export function reportIssues(report: Report): ReportIssue[] {
  const out: ReportIssue[] = [];
  for (const b of report.blocks) {
    if (b.type === "heading" && !b.text.trim()) out.push({ blockId: b.id, kind: "empty-heading" });
    else if (b.type === "text" && !htmlToText(b.html)) out.push({ blockId: b.id, kind: "empty-text" });
    else if (b.type === "metrics" && b.items.some((m) => !m.label.trim())) out.push({ blockId: b.id, kind: "empty-metric" });
    else if (b.type === "chart" && b.rows.some((r) => !r.label.trim())) out.push({ blockId: b.id, kind: "empty-chart" });
    else if (b.type === "table" && b.columns.every((c) => !c.trim())) out.push({ blockId: b.id, kind: "empty-table" });
  }
  return out;
}
