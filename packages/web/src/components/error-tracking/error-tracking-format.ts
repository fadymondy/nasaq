/*
 * Error tracking logic. Pure: counting, ranking and describing captured errors, testable under node.
 */

export type ErrorLevel = "fatal" | "error" | "warning" | "info";
export type ErrorStatus = "unresolved" | "resolved" | "ignored";

const LEVEL_RANK: Record<ErrorLevel, number> = { fatal: 0, error: 1, warning: 2, info: 3 };

export function levelRank(level: ErrorLevel): number {
  return LEVEL_RANK[level];
}

export interface RankableIssue {
  id: string;
  level: ErrorLevel;
  status: ErrorStatus;
  count: number;
  lastSeen: Date | number | string;
}

const time = (v: Date | number | string) => new Date(v).getTime();

/** Unresolved first, then by severity, then the most recent. Resolved and ignored sink to the end. */
export function sortIssues<T extends RankableIssue>(issues: T[]): T[] {
  const open = (i: T) => (i.status === "unresolved" ? 0 : 1);
  return [...issues].sort((a, b) => open(a) - open(b) || levelRank(a.level) - levelRank(b.level) || time(b.lastSeen) - time(a.lastSeen));
}

export function countByStatus(issues: { status: ErrorStatus }[]): Record<ErrorStatus, number> {
  const out: Record<ErrorStatus, number> = { unresolved: 0, resolved: 0, ignored: 0 };
  for (const i of issues) out[i.status] += 1;
  return out;
}

/** Events in a frequency series. */
export function totalEvents(series: number[] | undefined): number {
  return (series ?? []).reduce((a, b) => a + b, 0);
}

export type ErrorTrend = "up" | "down" | "flat";

/** Compares the second half of the series with the first: more than 20 % either way is a trend. */
export function seriesTrend(series: number[] | undefined): ErrorTrend {
  const s = series ?? [];
  if (s.length < 4) return "flat";
  const mid = Math.floor(s.length / 2);
  const before = totalEvents(s.slice(0, mid));
  const after = totalEvents(s.slice(s.length - mid));
  if (before === 0 && after === 0) return "flat";
  if (after > before * 1.2) return "up";
  if (after < before * 0.8) return "down";
  return "flat";
}

export interface FrameLike {
  file: string;
  line?: number;
  column?: number;
}

/** `src/app.ts:42:7`, dropping what is missing. */
export function frameLocation(frame: FrameLike): string {
  let out = frame.file;
  if (frame.line !== undefined) out += `:${frame.line}`;
  if (frame.line !== undefined && frame.column !== undefined) out += `:${frame.column}`;
  return out;
}

export type HttpTone = "success" | "info" | "warning" | "danger" | "neutral";

/** A network entry's status colour: 2xx success, 3xx info, 4xx warning, 5xx or a failed request danger. */
export function httpTone(status: number | undefined): HttpTone {
  if (status === undefined || status === 0) return "danger";
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "info";
  if (status >= 200) return "success";
  return "neutral";
}

/** `840 ms` or `1.4 s`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(Math.round(ms / 100) / 10).toString()} s`;
}

export function filterByLevel<T extends { level?: string }>(rows: T[], levels: string[]): T[] {
  return levels.length === 0 ? rows : rows.filter((r) => r.level !== undefined && levels.includes(r.level));
}
