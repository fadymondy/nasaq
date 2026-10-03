/*
 * Run history helpers: sorting, filtering, the failing step, timeline bars and durations. Pure functions of the
 * run records, so the list, the detail view and the tests share one definition.
 */
import type { WorkflowStatus } from "../workflow-canvas/workflow-model";

export type RunStatus = WorkflowStatus;

export interface RunScreenshot {
  src: string;
  /** What it shows, for screen readers. */
  alt: string;
  caption?: string;
}

export interface RunStep {
  id: string;
  name: string;
  status: RunStatus;
  /** Milliseconds after the run started. Without it steps are laid out one after another. */
  startedAtMs?: number;
  durationMs?: number;
  /** Nesting depth for a step tree (a loop's body, a branch). Default 0. */
  depth?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  /** Log lines, oldest first. */
  logs?: string[];
  screenshots?: RunScreenshot[];
  /** Which retry this was, when the step was retried. */
  attempt?: number;
}

export type SpanAttributeValue = string | number | boolean | null;

export interface RunSpan {
  id: string;
  parentId?: string;
  name: string;
  /** What ran it: "worker", "http", "postgres". */
  service?: string;
  /** Milliseconds after the run started. */
  startMs: number;
  durationMs: number;
  error?: boolean;
  attributes?: Record<string, SpanAttributeValue>;
}

export interface RunRecord {
  id: string;
  /** Short name for the run: the workflow or job it belongs to. */
  name?: string;
  status: RunStatus;
  startedAt: Date | number | string;
  durationMs?: number;
  /** "Manual", "Schedule", "Webhook": localised by the caller. */
  trigger?: string;
  steps: RunStep[];
  spans?: RunSpan[];
  /** The raw payload the run started with (or the whole raw record). */
  payload?: unknown;
  /** Why the run failed, when it did. */
  error?: string;
}

export type RunFilter = "all" | "failed" | "success" | "running";

export const RUN_FILTERS: RunFilter[] = ["all", "failed", "success", "running"];

const time = (r: RunRecord) => new Date(r.startedAt).getTime();

/** Newest first. */
export function sortRuns(runs: readonly RunRecord[]): RunRecord[] {
  return [...runs].sort((a, b) => time(b) - time(a));
}

const matchesFilter = (r: RunRecord, f: RunFilter) => f === "all" || (f === "failed" ? r.status === "error" : f === "running" ? r.status === "running" || r.status === "waiting" : r.status === "success");

/** Runs matching a status filter and a search over id, name, trigger and failure text. */
export function filterRuns(runs: readonly RunRecord[], filter: RunFilter, query = ""): RunRecord[] {
  const q = query.trim().toLowerCase();
  return sortRuns(runs).filter((r) => matchesFilter(r, filter) && (!q || [r.id, r.name, r.trigger, r.error].some((x) => x?.toLowerCase().includes(q))));
}

export function countRuns(runs: readonly RunRecord[]): Record<RunFilter, number> {
  return { all: runs.length, failed: runs.filter((r) => matchesFilter(r, "failed")).length, success: runs.filter((r) => matchesFilter(r, "success")).length, running: runs.filter((r) => matchesFilter(r, "running")).length };
}

/** The first step that failed, in the order they ran. */
export function failingStep(run: RunRecord): RunStep | undefined {
  return run.steps.find((s) => s.status === "error");
}

export interface StepBar {
  id: string;
  /** Percent of the run's length, from the start edge. */
  left: number;
  width: number;
}

/** Where each step sits on a shared time axis. Steps without a start time follow the one before. */
export function stepBars(steps: readonly RunStep[]): StepBar[] {
  let cursor = 0;
  const placed = steps.map((s) => {
    const start = s.startedAtMs ?? cursor;
    const dur = Math.max(0, s.durationMs ?? 0);
    cursor = Math.max(cursor, start + dur);
    return { id: s.id, start, dur };
  });
  const total = Math.max(1, ...placed.map((p) => p.start + p.dur));
  return placed.map((p) => ({ id: p.id, left: (p.start / total) * 100, width: Math.max(0.8, Math.min(100 - (p.start / total) * 100, (p.dur / total) * 100)) }));
}

/** Run length: its own `durationMs`, else the end of the last step. */
export function runLength(run: RunRecord): number {
  if (run.durationMs !== undefined) return run.durationMs;
  return Math.max(0, ...run.steps.map((s) => (s.startedAtMs ?? 0) + (s.durationMs ?? 0)));
}

/** "850 ms", "3.4 s", "2 min 05 s"; Arabic units when `ar`. Digits stay Latin. */
export function formatRunDuration(ms: number, ar = false): string {
  const u = ar ? { ms: "م.ث", s: "ث", min: "د" } : { ms: "ms", s: "s", min: "min" };
  if (ms < 1000) return `${Math.round(ms)} ${u.ms}`;
  if (ms < 60_000) return `${Number((ms / 1000).toFixed(ms < 10_000 ? 2 : 1))} ${u.s}`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return sec === 60 ? `${min + 1} ${u.min}` : `${min} ${u.min} ${String(sec).padStart(2, "0")} ${u.s}`;
}

/** Spans in start order with their depth (root 0) following `parentId`; missing or cyclic parents count as roots. */
export function orderSpans(spans: readonly RunSpan[]): { span: RunSpan; depth: number }[] {
  const byId = new Map(spans.map((s) => [s.id, s]));
  const depth = (s: RunSpan) => {
    let d = 0;
    let cur: RunSpan | undefined = s;
    const seen = new Set<string>();
    while (cur?.parentId && byId.has(cur.parentId) && !seen.has(cur.parentId)) {
      seen.add(cur.parentId);
      cur = byId.get(cur.parentId);
      d++;
    }
    return d;
  };
  return [...spans].sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id)).map((span) => ({ span, depth: depth(span) }));
}

/** The whole run as JSON text, for the raw tab: the payload when given, else the record without its bulky screenshots. */
export function rawRun(run: RunRecord): string {
  if (run.payload !== undefined) return JSON.stringify(run.payload, null, 2);
  return JSON.stringify({ ...run, steps: run.steps.map(({ screenshots: _shots, ...s }) => s) }, null, 2);
}
