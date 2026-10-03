/* Pure logic of the Markdown extras: frontmatter, table sorting and filtering, fenced-code meta and download names. */

// Same folding as blog-index, kept local so this file has no imports and runs under plain node tests.
const MARKS = /[̀-ًͯ-ٰٟـ]/g;
function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .trim();
}


/* ------------------------------------------------------------ frontmatter */

export type FrontmatterValue = string | number | boolean | string[];

export interface ParsedFrontmatter {
  /** Keys in source order. */
  data: [key: string, value: FrontmatterValue][];
  /** The document without its frontmatter block. */
  body: string;
}

function scalar(raw: string): string | number | boolean {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/**
 * Reads a leading `---` block of simple YAML: `key: value` scalars, `key: [a, b]` and `- item` lists. Nested maps are
 * not supported; their lines are ignored. When the text does not start with a closed block, `data` is empty and the
 * body is the whole text.
 */
export function parseMarkdownFrontmatter(source: string): ParsedFrontmatter {
  const text = source.replace(/^﻿/, "");
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: [], body: source };
  const data: [string, FrontmatterValue][] = [];
  let list: string[] | null = null;
  for (const line of (match[1] as string).split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line) ?? /^-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(String(scalar(item[1] as string)));
      continue;
    }
    if (/^\s/.test(line)) continue;
    const kv = /^([^:#]+?):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = (kv[1] as string).trim();
    const rest = (kv[2] as string).trim();
    list = null;
    if (rest === "") {
      list = [];
      data.push([key, list]);
    } else if (rest.startsWith("[") && rest.endsWith("]")) {
      data.push([key, rest.slice(1, -1).split(",").map((s) => String(scalar(s))).filter(Boolean)]);
    } else {
      data.push([key, scalar(rest)]);
    }
  }
  // A key with no value and no list items is an empty string, not an empty list.
  const cleaned = data.map(([k, v]) => [k, Array.isArray(v) && v.length === 0 ? "" : v] as [string, FrontmatterValue]);
  return { data: cleaned, body: text.slice(match[0].length) };
}

/** "publishDate" and "publish_date" to "Publish date". */
export function frontmatterLabel(key: string): string {
  const words = key
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ------------------------------------------------------------ tables */

export type MarkdownSortDirection = "asc" | "desc";
export interface MarkdownSortState {
  column: number;
  direction: MarkdownSortDirection;
}

/** Click on a header: ascending, then descending, then unsorted. A different column starts at ascending. */
export function nextMarkdownSort(current: MarkdownSortState | null, column: number): MarkdownSortState | null {
  if (!current || current.column !== column) return { column, direction: "asc" };
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

/** A number in a cell, ignoring currency signs, percent, thousands separators and Arabic-Indic digits. `null` when it is not numeric. */
export function markdownCellNumber(text: string): number | null {
  const latin = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
  const m = /^\s*[-+−]?\s*(?:[$€£¥]|SAR|USD|EUR|ر\.س)?\s*[-+−]?\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(?:%|[kKmMbB]|ms|s|KB|MB|GB)?\s*$/.exec(latin);
  if (!m) return null;
  const n = Number((m[1] as string).replace(/,/g, ""));
  return /^\s*[-−]/.test(latin) || /^\s*(?:[$€£¥]|SAR|USD|EUR|ر\.س)?\s*[-−]/.test(latin) ? -n : n;
}

const collator = typeof Intl !== "undefined" ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }) : null;

/** Numbers by value, everything else by locale-aware natural order. Empty cells sort last in both directions (handled by `sortMarkdownRows`). */
export function compareMarkdownCells(a: string, b: string): number {
  const na = markdownCellNumber(a);
  const nb = markdownCellNumber(b);
  if (na !== null && nb !== null) return na - nb;
  return collator ? collator.compare(a, b) : a < b ? -1 : a > b ? 1 : 0;
}

export interface MarkdownTextRow {
  /** Plain text of each cell, used to sort and to filter. */
  texts: string[];
}

/** A sorted copy. Stable, and empty cells stay last whichever way the column is sorted. */
export function sortMarkdownRows<R extends MarkdownTextRow>(rows: readonly R[], sort: MarkdownSortState | null): R[] {
  if (!sort) return [...rows];
  const sign = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      const a = x.row.texts[sort.column] ?? "";
      const b = y.row.texts[sort.column] ?? "";
      if (!a.trim() && b.trim()) return 1;
      if (a.trim() && !b.trim()) return -1;
      return sign * compareMarkdownCells(a, b) || x.index - y.index;
    })
    .map((x) => x.row);
}

/** Rows where every word of the query appears in some cell (accents, tashkeel and hamza forms folded). */
export function filterMarkdownRows<R extends MarkdownTextRow>(rows: readonly R[], query: string): R[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...rows];
  return rows.filter((row) => {
    const hay = normalizeText(row.texts.join(" \u0000 "));
    return words.every((w) => hay.includes(w));
  });
}


/* ------------------------------------------------------------ code fences */

export interface FenceMeta {
  title?: string;
  lineNumbers?: boolean;
  highlight?: string;
}

/** Meta string of a fence: ```ts title="app.ts" showLineNumbers {2,4-6}. */
export function parseFenceMeta(meta: string | undefined | null): FenceMeta {
  if (!meta) return {};
  const out: FenceMeta = {};
  const title = /(?:title|filename|file)=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta);
  if (title) out.title = title[1] ?? title[2] ?? title[3];
  if (/\b(?:showLineNumbers|lineNumbers|linenos)\b/.test(meta)) out.lineNumbers = true;
  const hl = /\{([\d,\s-]+)\}/.exec(meta);
  if (hl) out.highlight = (hl[1] as string).replace(/\s+/g, "");
  return out;
}

const EXTENSIONS: Record<string, string> = {
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
  js: "js",
  javascript: "js",
  jsx: "jsx",
  json: "json",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  zsh: "sh",
  css: "css",
  html: "html",
  md: "md",
  markdown: "md",
  go: "go",
  php: "php",
  py: "py",
  python: "py",
  sql: "sql",
  yaml: "yml",
  yml: "yml",
  text: "txt",
};

/** The file name a downloaded fence gets: its title when it has one, else `code.<ext>` by language. */
export function codeDownloadName(language: string, title?: string): string {
  const clean = title?.trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (clean) return clean;
  return `code.${EXTENSIONS[language.toLowerCase()] ?? "txt"}`;
}
