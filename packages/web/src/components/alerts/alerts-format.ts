/** Pure helpers for alert lists: severity order, filtering, sorting and counts. No React here. */

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type DateLike = Date | number | string;

export const SEVERITIES: readonly AlertSeverity[] = ["critical", "high", "medium", "low", "info"];
export const STATUSES: readonly AlertStatus[] = ["open", "acknowledged", "resolved"];

export const toMs = (v: DateLike): number => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

/** 0 is the most severe. */
export const severityRank = (severity: AlertSeverity): number => SEVERITIES.indexOf(severity);

export interface AlertLike {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  createdAt: DateLike;
  updatedAt?: DateLike | undefined;
}

export interface AlertFilter {
  query?: string;
  severity?: AlertSeverity | "all";
  status?: AlertStatus | "all";
  source?: string | "all";
}

/** Fields the search box looks in, besides title and source. */
export type Searchable<T> = (alert: T) => (string | undefined | null)[];

export function filterAlerts<T extends AlertLike>(alerts: readonly T[], filter: AlertFilter, extra?: Searchable<T>): T[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return alerts.filter((a) => {
    if (filter.severity && filter.severity !== "all" && a.severity !== filter.severity) return false;
    if (filter.status && filter.status !== "all" && a.status !== filter.status) return false;
    if (filter.source && filter.source !== "all" && a.source !== filter.source) return false;
    if (!q) return true;
    return [a.title, a.source, a.id, ...(extra ? extra(a) : [])].some((f) => f?.toLowerCase().includes(q));
  });
}

export type AlertSort = "newest" | "severity";

/** Newest first, or most severe first with open before acknowledged before resolved and newest first inside a group. */
export function sortAlerts<T extends AlertLike>(alerts: readonly T[], sort: AlertSort): T[] {
  const list = [...alerts];
  if (sort === "newest") return list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return list.sort(
    (a, b) =>
      STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) ||
      severityRank(a.severity) - severityRank(b.severity) ||
      toMs(b.createdAt) - toMs(a.createdAt),
  );
}

export interface AlertCounts {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
}

export function countAlerts(alerts: readonly Pick<AlertLike, "severity" | "status">[]): AlertCounts {
  const bySeverity: Record<AlertSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byStatus: Record<AlertStatus, number> = { open: 0, acknowledged: 0, resolved: 0 };
  for (const a of alerts) {
    bySeverity[a.severity]++;
    byStatus[a.status]++;
  }
  return { total: alerts.length, bySeverity, byStatus };
}

/** The distinct sources, sorted, for the source filter. */
export const sourcesOf = (alerts: readonly Pick<AlertLike, "source">[]): string[] => [...new Set(alerts.map((a) => a.source))].sort((a, b) => a.localeCompare(b));

/** Alerts that still need someone: open or acknowledged (not resolved) and at least `high`. */
export const urgentCount = (alerts: readonly Pick<AlertLike, "severity" | "status">[]): number =>
  alerts.filter((a) => a.status !== "resolved" && severityRank(a.severity) <= severityRank("high")).length;

/** Whether an action makes sense in this status: acknowledge only when open, resolve when not resolved, reopen when resolved. */
export const canAcknowledge = (status: AlertStatus): boolean => status === "open";
export const canResolve = (status: AlertStatus): boolean => status !== "resolved";
export const canReopen = (status: AlertStatus): boolean => status === "resolved";
