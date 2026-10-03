import type { ServerLimits, ServerStatus } from "./server-format";

export type ServerCardResult = void | { error?: string };

export interface ServerSnapshot {
  id: string;
  name: string;
  createdAt: Date | number | string;
  sizeLabel?: string;
  status?: "ready" | "creating";
}

export interface ServerMetrics {
  /** Percentages, 0 to 100. */
  cpu: number;
  memory: number;
  disk: number;
  /** Recent CPU load, oldest first, for the sparkline. */
  cpuHistory?: readonly number[];
}

export interface ServerDeploy {
  ref: string;
  at: Date | number | string;
  status: "success" | "failed" | "running";
  by?: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  status: ServerStatus;
  /** Public IP or hostname. Stays left to right. */
  address: string;
  /** Free text, for example "Frankfurt" or "Riyadh". */
  region?: string;
  os?: string;
  limits: ServerLimits;
  metrics?: ServerMetrics;
  lastDeploy?: ServerDeploy;
  snapshots: readonly ServerSnapshot[];
}
