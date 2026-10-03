/** Pure log helpers: levels, timestamps, filtering, match ranges and the virtual window. No React here. */

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface LogEntry {
  /** Stable, unique key. Also the selection key. */
  id: string | number;
  /** Epoch milliseconds, a Date, or an ISO string. */
  time: Date | string | number;
  level: LogLevel;
  message: string;
  /** Where it came from: a service, container or file. */
  source?: string;
  /** Structured fields shown in the detail panel and searched with the message. Values are shown as JSON. */
  fields?: Record<string, unknown>;
}

const LEVEL_ALIASES: Record<string, LogLevel> = {
  trace: "trace",
  verbose: "trace",
  debug: "debug",
  info: "info",
  information: "info",
  notice: "info",
  warn: "warn",
  warning: "warn",
  error: "error",
  err: "error",
  fatal: "fatal",
  critical: "fatal",
  crit: "fatal",
  panic: "fatal",
};

/** Maps `WARNING`, `err`, `Critical` and friends onto the six levels. `undefined` when unknown. */
export function normalizeLevel(value: string): LogLevel | undefined {
  return LEVEL_ALIASES[value.trim().toLowerCase()];
}

export function toMillis(time: LogEntry["time"]): number {
  return time instanceof Date ? time.getTime() : typeof time === "number" ? time : Date.parse(time);
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export interface LogTimeOptions {
  /** Show the date before the time. */
  date?: boolean;
  /** Show milliseconds. Default true. */
  millis?: boolean;
  /** UTC instead of local time. */
  utc?: boolean;
}

/** `14:03:07.128` or `2026-09-29 14:03:07.128`. Latin digits and a fixed width, so columns line up in any locale. */
export function formatLogTime(time: LogEntry["time"], { date = false, millis = true, utc = false }: LogTimeOptions = {}): string {
  const d = new Date(toMillis(time));
  if (Number.isNaN(d.getTime())) return "--:--:--";
  const get = utc
    ? { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, day: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds() }
    : { y: d.getFullYear(), mo: d.getMonth() + 1, day: d.getDate(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds() };
  const clock = `${pad(get.h)}:${pad(get.mi)}:${pad(get.s)}${millis ? `.${pad(get.ms, 3)}` : ""}`;
  return date ? `${get.y}-${pad(get.mo)}-${pad(get.day)} ${clock}` : clock;
}

/** Everything a search looks at for one entry: message, source and fields. */
export function entryText(entry: LogEntry): string {
  const fields = entry.fields ? Object.entries(entry.fields).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`).join(" ") : "";
  return [entry.message, entry.source ?? "", fields].join(" ").trim();
}

export interface Matcher {
  /** Whether the text contains a match. */
  test: (text: string) => boolean;
  /** `[start, end)` ranges of each match, for highlighting. */
  ranges: (text: string) => [number, number][];
}

/** A case-insensitive matcher for a search box. Returns `null` for an empty query and `"invalid"` for a bad regex. */
export function compileMatcher(query: string, regex = false): Matcher | null | "invalid" {
  if (!query) return null;
  let re: RegExp;
  try {
    re = new RegExp(regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  } catch {
    return "invalid";
  }
  return {
    test: (text) => {
      re.lastIndex = 0;
      return re.test(text);
    },
    ranges: (text) => {
      const out: [number, number][] = [];
      re.lastIndex = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        if (m[0] === "") {
          re.lastIndex++;
          continue;
        }
        out.push([m.index, m.index + m[0].length]);
        if (out.length >= 50) break;
      }
      return out;
    },
  };
}

export interface LogFilter {
  /** Levels to keep. `undefined` or empty keeps all. */
  levels?: ReadonlySet<LogLevel> | undefined;
  query?: string | undefined;
  regex?: boolean | undefined;
  /** Keep entries at or after this time (epoch milliseconds). */
  since?: number | null | undefined;
}

export function filterLogs(entries: readonly LogEntry[], { levels, query = "", regex = false, since }: LogFilter): { entries: LogEntry[]; invalid: boolean } {
  const matcher = compileMatcher(query, regex);
  const byLevel = levels && levels.size > 0 ? levels : undefined;
  const inWindow = (e: LogEntry) => since == null || toMillis(e.time) >= since;
  if (matcher === "invalid") return { entries: entries.filter((e) => (!byLevel || byLevel.has(e.level)) && inWindow(e)), invalid: true };
  const out = entries.filter((e) => (!byLevel || byLevel.has(e.level)) && inWindow(e) && (!matcher || matcher.test(entryText(e))));
  return { entries: out, invalid: false };
}

export function countByLevel(entries: readonly LogEntry[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
  for (const e of entries) counts[e.level]++;
  return counts;
}

/** Splits text into plain and matched pieces from match ranges (which may overlap or touch). */
export function splitByRanges(text: string, ranges: readonly [number, number][]): { text: string; match: boolean }[] {
  const merged: [number, number][] = [];
  for (const [a, b] of [...ranges].sort((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const out: { text: string; match: boolean }[] = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) out.push({ text: text.slice(at, a), match: false });
    out.push({ text: text.slice(a, b), match: true });
    at = b;
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false });
  return out;
}

/** Fixed-height row windowing: which rows to render for a scroll position. */
export function virtualWindow({
  scrollTop,
  viewport,
  rowHeight,
  count,
  overscan = 8,
}: {
  scrollTop: number;
  viewport: number;
  rowHeight: number;
  count: number;
  overscan?: number;
}): { start: number; end: number } {
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visible = Math.ceil(Math.max(0, viewport) / rowHeight) + 1;
  return { start: Math.max(0, first - overscan), end: Math.min(count, first + visible + overscan) };
}

/** The plain text of entries, one line each: `2026-09-29 14:03:07.128 INFO  api  started`. */
export function logsToText(entries: readonly LogEntry[], options: LogTimeOptions = {}): string {
  return entries
    .map((e) => `${formatLogTime(e.time, { date: true, ...options })} ${e.level.toUpperCase().padEnd(5)} ${e.source ? `${e.source} ` : ""}${e.message}`)
    .join("\n");
}

export function fieldsToText(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

/** A time window for the range control: the last `ms` milliseconds, or everything with `ms: null`. */
export interface LogRange {
  id: string;
  label: string;
  labelAr?: string;
  ms: number | null;
}

const MIN = 60_000;
/** Last 15 minutes, hour, 24 hours and 7 days, and everything. */
export const LOG_RANGES: readonly LogRange[] = [
  { id: "15m", label: "Last 15 minutes", labelAr: "آخر ١٥ دقيقة", ms: 15 * MIN },
  { id: "1h", label: "Last hour", labelAr: "آخر ساعة", ms: 60 * MIN },
  { id: "24h", label: "Last 24 hours", labelAr: "آخر ٢٤ ساعة", ms: 24 * 60 * MIN },
  { id: "7d", label: "Last 7 days", labelAr: "آخر ٧ أيام", ms: 7 * 24 * 60 * MIN },
  { id: "all", label: "All time", labelAr: "كل الأوقات", ms: null },
];

/** The earliest time a range keeps, or `null` for no limit. */
export function rangeSince(range: Pick<LogRange, "ms"> | undefined, now = Date.now()): number | null {
  return range?.ms == null ? null : now - range.ms;
}

/**
 * The entries up to and including `lastId`: what a paused list keeps showing. Older entries prepended meanwhile
 * still show; newer ones wait. `null` (paused while empty) keeps nothing; an unknown id keeps everything.
 */
export function entriesUntil(entries: readonly LogEntry[], lastId: LogEntry["id"] | null): readonly LogEntry[] {
  if (lastId === null) return [];
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i]!.id === lastId) return i === entries.length - 1 ? entries : entries.slice(0, i + 1);
  return entries;
}
