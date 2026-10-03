import type { AlertSeverity, AlertStatus, DateLike } from "./alerts-format";

export type { AlertSeverity, AlertSort, AlertStatus } from "./alerts-format";

export type AlertEventType = "created" | "notified" | "acknowledged" | "resolved" | "reopened" | "escalated" | "comment";

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  at: DateLike;
  /** Who did it. Leave out for the system. */
  actor?: string;
  note?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  /** Where it came from: a service, monitor or check. */
  source: string;
  createdAt: DateLike;
  updatedAt?: DateLike;
  /** How many times it fired. Shown when above 1. */
  count?: number;
  tags?: string[];
  /** Oldest first or newest first, both are sorted here (newest on top). */
  timeline?: AlertEvent[];
}

export type SecurityCategory = "auth" | "network" | "malware" | "data" | "policy" | "other";

export interface SecurityAlertItem extends AlertItem {
  category?: SecurityCategory;
  ip?: string;
  location?: string;
  /** The account involved. */
  account?: string;
  /** What to do about it. */
  recommendation?: string;
}

/** What a callback returns: nothing, or `{ error }` to show a message on that alert. */
export type AlertResult = void | { error?: string };
