// Pure helpers for the uptime monitors card. Copies of the React ones (uptime-format.ts); no DOM here.

export type MonitorStatus = "up" | "degraded" | "down" | "paused" | "unknown";
export type CheckResult = "up" | "degraded" | "down" | "none";
export type UptimePeriod = "24h" | "7d" | "30d";
export type OverallStatus = "operational" | "degraded" | "partial-outage" | "major-outage" | "maintenance";

/** `99.98%`. Truncates rather than rounds, so 99.996 shows 99.99% and never a false 100%. `null` is an en dash. */
export function formatUptime(percent: number | null | undefined, digits = 2): string {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "–";
  const p = Math.max(0, Math.min(100, percent));
  const f = 10 ** digits;
  const cut = Math.floor(p * f + 1e-9) / f;
  return cut === 100 ? "100%" : `${cut.toFixed(digits)}%`;
}

/** The worst thing happening across services. */
export function overallStatus(statuses: readonly MonitorStatus[], openMaintenance = false): OverallStatus {
  const active = statuses.filter((s) => s !== "paused" && s !== "unknown");
  if (active.length === 0) return openMaintenance ? "maintenance" : "operational";
  const down = active.filter((s) => s === "down").length;
  if (down === active.length) return "major-outage";
  if (down > 0) return "partial-outage";
  if (active.some((s) => s === "degraded")) return "degraded";
  return openMaintenance ? "maintenance" : "operational";
}

export const responseLabel = (ms: number | undefined | null): string =>
  ms === undefined || ms === null || !Number.isFinite(ms) ? "–" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
