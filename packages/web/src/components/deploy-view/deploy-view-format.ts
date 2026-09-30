/** Pure helpers for the deploy view: statuses, durations and log trimming. No React here. */

export type DeployStatus = "pending" | "running" | "success" | "failed" | "skipped" | "cancelled";

export interface DeployStepLike {
  status: DeployStatus;
  startedAt?: Date | string | number | undefined;
  durationMs?: number | undefined;
}

const toMs = (t: Date | string | number) => (t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t));

/** How the whole run is doing, from its steps: any failure wins, then running, then cancelled. */
export function deriveStatus(steps: readonly Pick<DeployStepLike, "status">[]): DeployStatus {
  if (steps.length === 0) return "pending";
  if (steps.some((s) => s.status === "failed")) return "failed";
  if (steps.some((s) => s.status === "running")) return "running";
  if (steps.some((s) => s.status === "cancelled")) return "cancelled";
  if (steps.every((s) => s.status === "pending")) return "pending";
  if (steps.every((s) => s.status === "success" || s.status === "skipped")) return "success";
  return "running";
}

/** How long a step took: the reported duration, or the time since it started while it is running. */
export function stepDuration(step: DeployStepLike, now: number): number | undefined {
  if (step.status === "running" && step.startedAt !== undefined) return Math.max(0, now - toMs(step.startedAt));
  return step.durationMs;
}

export function totalDuration(steps: readonly DeployStepLike[], now: number): number {
  return steps.reduce((sum, s) => sum + (stepDuration(s, now) ?? 0), 0);
}

export interface DurationUnits {
  ms: string;
  s: string;
  m: string;
  h: string;
}
export const DEFAULT_UNITS: DurationUnits = { ms: "ms", s: "s", m: "m", h: "h" };

/** `420ms`, `12.4s`, `2m 05s`, `1h 03m`. Latin digits; pass localised `units` for Arabic. */
export function formatDuration(ms: number, units: DurationUnits = DEFAULT_UNITS): string {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)}${units.ms}`;
  const seconds = ms / 1000;
  if (Math.round(seconds) < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}${units.s}`;
  const totalMinutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - totalMinutes * 60);
  const [m, s] = rest === 60 ? [totalMinutes + 1, 0] : [totalMinutes, rest];
  if (m < 60) return `${m}${units.m} ${String(s).padStart(2, "0")}${units.s}`;
  return `${Math.floor(m / 60)}${units.h} ${String(m % 60).padStart(2, "0")}${units.m}`;
}

/** The last `max` lines of a log, and how many were left out. */
export function tailLines(text: string, max: number): { text: string; hidden: number } {
  const lines = text.replace(/\n$/, "").split("\n");
  if (lines.length <= max) return { text: lines.join("\n"), hidden: 0 };
  return { text: lines.slice(lines.length - max).join("\n"), hidden: lines.length - max };
}

/** Steps finished (success, skipped) out of all, for the progress bar. */
export function completedCount(steps: readonly Pick<DeployStepLike, "status">[]): number {
  return steps.filter((s) => s.status === "success" || s.status === "skipped").length;
}
