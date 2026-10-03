/** A step's state as it streams in. Anything the server sends that is not one of these counts as `running`. */
export type TestRunStepStatus = "running" | "ok" | "error" | "skipped";

export interface TestRunStep {
  /** Steps with the same `id` (or `name` when there is no id) update one row instead of adding another. */
  id?: string;
  name: string;
  status: TestRunStepStatus | (string & {});
  /** A line under the name, e.g. "Fetched page 2 of 4". */
  detail?: string;
  durationMs?: number;
  /** Items this step produced. */
  count?: number;
  error?: string;
}

/** Something the run produced and kept, e.g. a saved record. */
export interface TestRunResult {
  id: string;
  title?: string;
  url?: string;
  /** Short facts under the title: a date, a language, a hash. */
  meta?: readonly string[];
  body?: string;
  /** Shown as JSON behind a toggle. */
  raw?: unknown;
}

export type TestRunState = "idle" | "running" | "done" | "error" | "stopped";

/** Normalises a streamed status. */
export function testRunStepStatus(status: string): TestRunStepStatus {
  return status === "ok" || status === "success" ? "ok" : status === "error" || status === "failed" ? "error" : status === "skipped" ? "skipped" : "running";
}

const keyOf = (step: TestRunStep) => step.id ?? step.name;

/** Adds a streamed step, or updates the row with the same key in place (keeping its position). */
export function upsertTestRunStep(list: readonly TestRunStep[], step: TestRunStep): TestRunStep[] {
  const key = keyOf(step);
  const i = list.findIndex((s) => keyOf(s) === key);
  if (i < 0) return [...list, step];
  const next = list.slice();
  next[i] = { ...list[i], ...step };
  return next;
}

/** When a run ends early, steps still running are marked skipped. */
export function settleTestRunSteps(list: readonly TestRunStep[]): TestRunStep[] {
  return list.map((s) => (testRunStepStatus(s.status) === "running" ? { ...s, status: "skipped" } : s));
}

export interface TestRunCounts {
  ok: number;
  error: number;
  skipped: number;
  running: number;
  total: number;
}

export function testRunCounts(list: readonly TestRunStep[]): TestRunCounts {
  const out: TestRunCounts = { ok: 0, error: 0, skipped: 0, running: 0, total: list.length };
  for (const s of list) out[testRunStepStatus(s.status)] += 1;
  return out;
}

/** `850 ms`, `2.4 s`, `1 m 05 s`. */
export function formatTestRunDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)} m ${String(total % 60).padStart(2, "0")} s`;
}
