import type { CheckResult, MonitorStatus } from "../uptime-monitors";

export interface StatusPageService {
  id: string;
  name: string;
  description?: string;
  status: MonitorStatus;
  /** Daily results, oldest first. Usually 90 days. */
  days?: readonly CheckResult[];
  /** Uptime over the shown days, in percent. */
  uptime?: number | null;
}

export interface StatusPageMaintenance {
  id: string;
  title: string;
  startsAt: Date | number | string;
  endsAt: Date | number | string;
  description?: string;
}
