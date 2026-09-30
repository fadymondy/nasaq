/** Pure helpers for uptime monitors and status pages: uptime percentages, overall status, incident durations. No React here. */

export type MonitorStatus = "up" | "degraded" | "down" | "paused" | "unknown";
/** One check in a history strip. `none` means there was no check (before the monitor existed, or paused). */
export type CheckResult = "up" | "degraded" | "down" | "none";
export type UptimePeriod = "24h" | "7d" | "30d";
export type OverallStatus = "operational" | "degraded" | "partial-outage" | "major-outage" | "maintenance";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentImpact = "minor" | "major" | "maintenance";

export const UPTIME_PERIODS: readonly UptimePeriod[] = ["24h", "7d", "30d"];

/**
 * Percentage of checks that were not down, ignoring `none`. Degraded counts as up (the service answered).
 * Returns `null` when there is nothing to measure.
 */
export function computeUptime(checks: readonly CheckResult[]): number | null {
  const measured = checks.filter((c) => c !== "none");
  if (measured.length === 0) return null;
  const up = measured.filter((c) => c !== "down").length;
  return (up / measured.length) * 100;
}

/**
 * `99.98%`. Truncates rather than rounds, so 99.996 shows 99.99% and never a false 100%.
 * Digits stay Latin. `null` is an en dash.
 */
export function formatUptime(percent: number | null | undefined, digits = 2): string {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "–";
  const p = Math.max(0, Math.min(100, percent));
  const f = 10 ** digits;
  const cut = Math.floor(p * f + 1e-9) / f;
  return cut === 100 ? "100%" : `${cut.toFixed(digits)}%`;
}

export type UptimeTone = "success" | "warning" | "danger" | "neutral";

/** 99.9 and above is healthy, 99 to 99.9 needs attention, below 99 is bad. */
export function uptimeTone(percent: number | null | undefined): UptimeTone {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "neutral";
  return percent >= 99.9 ? "success" : percent >= 99 ? "warning" : "danger";
}

/** The worst thing happening across services. `maintenance` wins only when nothing is down or degraded. */
export function overallStatus(statuses: readonly MonitorStatus[], openMaintenance = false): OverallStatus {
  const active = statuses.filter((s) => s !== "paused" && s !== "unknown");
  if (active.length === 0) return openMaintenance ? "maintenance" : "operational";
  const down = active.filter((s) => s === "down").length;
  if (down === active.length) return "major-outage";
  if (down > 0) return "partial-outage";
  if (active.some((s) => s === "degraded")) return "degraded";
  return openMaintenance ? "maintenance" : "operational";
}

/** Whole minutes between two times, at least 1. For "Resolved after 42 min". */
export function incidentMinutes(startedAt: Date | number | string, resolvedAt: Date | number | string): number {
  const a = new Date(startedAt).getTime();
  const b = new Date(resolvedAt).getTime();
  return Math.max(1, Math.round((b - a) / 60_000));
}

/** `42 min`, `3 h 5 min`, `2 d 4 h`. Units are given by the caller so they can be localised. */
export function formatIncidentDuration(minutes: number, u: { d: string; h: string; m: string } = { d: "d", h: "h", m: "min" }): string {
  const total = Math.max(1, Math.round(minutes));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return h ? `${d} ${u.d} ${h} ${u.h}` : `${d} ${u.d}`;
  if (h > 0) return m ? `${h} ${u.h} ${m} ${u.m}` : `${h} ${u.h}`;
  return `${m} ${u.m}`;
}

/** An incident is open until it is resolved. */
export const isOpenIncident = (i: { status: IncidentStatus }): boolean => i.status !== "resolved";

export const responseLabel = (ms: number | undefined): string => (ms === undefined || !Number.isFinite(ms) ? "–" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
