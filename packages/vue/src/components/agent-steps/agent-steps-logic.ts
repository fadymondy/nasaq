/** Pure helpers behind AgentSteps and AgentConfirm. No React, so they run under node --test. */

export type AgentStepStatus = "pending" | "running" | "awaiting" | "done" | "error" | "skipped";

/** One tool call an agent made or plans to make. */
export interface AgentStep {
  id: string;
  /** What happens in words: "Search the invoices". */
  label: string;
  /** Tool name, shown as code. */
  tool?: string;
  status: AgentStepStatus;
  /** Arguments sent to the tool. Values for `redactKeys` are masked before they are shown. */
  args?: Record<string, unknown>;
  /** What the tool returned. Plain text or a JSON string. */
  result?: string;
  /** Language for the result code block. Default `json` when it parses as JSON, else `text`. */
  resultLanguage?: string;
  /** Why the step failed. */
  error?: string;
  durationMs?: number;
}

export type AgentRunState = "idle" | "running" | "awaiting" | "error" | "done";

/** Where the whole run stands. Waiting on a person outranks running, and a failure outranks both. */
export function agentRunState(steps: readonly AgentStep[]): AgentRunState {
  if (steps.length === 0) return "idle";
  if (steps.some((s) => s.status === "error")) return "error";
  if (steps.some((s) => s.status === "awaiting")) return "awaiting";
  if (steps.some((s) => s.status === "running" || s.status === "pending")) return "running";
  return "done";
}

export interface AgentStepCounts {
  total: number;
  done: number;
  running: number;
  awaiting: number;
  error: number;
  pending: number;
  skipped: number;
}

export function agentStepCounts(steps: readonly AgentStep[]): AgentStepCounts {
  const c: AgentStepCounts = { total: steps.length, done: 0, running: 0, awaiting: 0, error: 0, pending: 0, skipped: 0 };
  for (const s of steps) c[s.status]++;
  return c;
}

/** The step to talk about now: the one waiting on a person, else the failed one, else the running one. */
export function currentStep(steps: readonly AgentStep[]): AgentStep | undefined {
  return steps.find((s) => s.status === "awaiting") ?? steps.find((s) => s.status === "error") ?? steps.find((s) => s.status === "running") ?? steps.find((s) => s.status === "pending");
}

/** Total time of the finished steps, in ms. Steps without a duration count as zero. */
export function totalDurationMs(steps: readonly AgentStep[]): number {
  return steps.reduce((sum, s) => sum + (Number.isFinite(s.durationMs) ? (s.durationMs as number) : 0), 0);
}

export const AGENT_MASK = "••••••••";

/** A deep copy of `value` where every property named in `keys` (any depth, case-insensitive) is masked. */
export function redactDeep(value: unknown, keys: readonly string[]): unknown {
  const set = new Set(keys.map((k) => k.toLowerCase()));
  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 8) return v;
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, set.has(k.toLowerCase()) ? AGENT_MASK : walk(x, depth + 1)]));
    return v;
  };
  return walk(value, 0);
}

/** Arguments as pretty JSON with the redacted keys masked. Falls back to `String()` for values JSON cannot hold. */
export function stringifyArgs(args: Record<string, unknown> | undefined, redactKeys: readonly string[] = []): string {
  if (!args) return "";
  try {
    return JSON.stringify(redactDeep(args, redactKeys), null, 2);
  } catch {
    return String(args);
  }
}

/** `json` when the result parses as JSON, else `text`. An explicit language wins. */
export function resultLanguage(step: Pick<AgentStep, "result" | "resultLanguage">): string {
  if (step.resultLanguage) return step.resultLanguage;
  const r = step.result?.trim();
  if (!r || !/^[[{]/.test(r)) return "text";
  try {
    JSON.parse(r);
    return "json";
  } catch {
    return "text";
  }
}

/* ------------------------------------------------------------------ changes to confirm */

export type AgentRisk = "low" | "medium" | "high";
export type AgentChangeKind = "create" | "edit" | "delete";

/** One change the agent wants to make. `before` is missing for a new thing, `after` for a deletion. */
export interface AgentChange {
  id: string;
  title: string;
  /** Where it lands: a file path, a record id, an endpoint. Kept left to right. */
  target?: string;
  description?: string;
  before?: string;
  after?: string;
  /** Syntax for the diff text. Reserved for callers that render their own view. */
  language?: string;
  risk?: AgentRisk;
}

export function agentChangeKind(c: Pick<AgentChange, "before" | "after">): AgentChangeKind {
  if (c.before === undefined && c.after !== undefined) return "create";
  if (c.after === undefined && c.before !== undefined) return "delete";
  return "edit";
}

const RISK_ORDER: Record<AgentRisk, number> = { low: 0, medium: 1, high: 2 };

/** The highest risk among the changes. No changes, or none marked, is low. */
export function agentHighestRisk(changes: readonly Pick<AgentChange, "risk">[]): AgentRisk {
  return changes.reduce<AgentRisk>((max, c) => (c.risk && RISK_ORDER[c.risk] > RISK_ORDER[max] ? c.risk : max), "low");
}

/** Ids from `selected` that still exist in `changes`, in the order of `changes`. */
export function selectedChangeIds(changes: readonly Pick<AgentChange, "id">[], selected: ReadonlySet<string>): string[] {
  return changes.filter((c) => selected.has(c.id)).map((c) => c.id);
}

/** Toggles one id in a selection without mutating it. */
export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
