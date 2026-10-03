import type { CheckResult, IncidentImpact, IncidentStatus, MonitorStatus, UptimePeriod } from "./format";

export type UptimeResult = void | { error?: string };

export interface UptimeMonitor {
  id: string;
  name: string;
  /** URL, or host:port. Stays left to right. */
  target: string;
  kind: "http" | "tcp" | "ping" | "keyword";
  status: MonitorStatus;
  /** Uptime in percent per period. `null` when there is no data. */
  uptime: Partial<Record<UptimePeriod, number | null>>;
  /** Recent checks, oldest first, for the strip. */
  checks?: readonly CheckResult[];
  responseMs?: number;
  lastCheckAt?: Date | number | string;
  intervalSec?: number;
}

export interface IncidentUpdate {
  at: Date | number | string;
  status: IncidentStatus;
  body: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  startedAt: Date | number | string;
  resolvedAt?: Date | number | string;
  /** Names of the services affected. */
  services?: string[];
  /** Oldest first. */
  updates?: IncidentUpdate[];
}

export type MonitorInput = { name: string; target: string; kind: UptimeMonitor["kind"]; intervalSec: number };
