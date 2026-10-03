import { nextRuns } from "../cron-builder";
import { cycleMonthlyEquivalent, divRound, nextOccurrences, shiftDay, type CycleUnit } from "./rates-logic";
import { keyOf } from "./strings";

export interface Rate {
  id: string;
  /** Per hour, minor units. */
  amount: number;
  /** First day it applies. It holds until the next rate starts. */
  from: string;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type SubscriptionSchedule = { kind: "cycle"; every: number; unit: CycleUnit } | { kind: "cron"; expr: string; timeZone?: string };

export interface Subscription {
  id: string;
  name: string;
  /** Empty for an organisation-wide subscription. */
  projectId?: string;
  projectName?: string;
  /** Price per unit per charge, minor units. */
  amount: number;
  quantity?: number;
  schedule: SubscriptionSchedule;
  /** The day the cycle started, which sets the charge day for cycle schedules. */
  anchor: string;
  status: SubscriptionStatus;
}

export interface SubscriptionInput {
  name: string;
  projectId?: string;
  amount: number;
  quantity: number;
  schedule: SubscriptionSchedule;
  anchor: string;
}

/** The next `count` charge days for a subscription on or after `from` (a day key). Cron schedules are read in their own time zone. */
export function subscriptionCharges(s: Pick<Subscription, "schedule" | "anchor">, from: string, count = 3): string[] {
  if (s.schedule.kind === "cycle") return nextOccurrences(s.schedule, s.anchor, from, count);
  const tz = s.schedule.timeZone ?? "UTC";
  return nextRuns(s.schedule.expr, { from: new Date(`${shiftDay(from, -1)}T23:59:59Z`).getTime(), count, timeZone: tz }).map((d) => keyOf(d));
}

/** What a subscription costs per month, whole minor units: quantity times price, a cycle turned into a month, a cron by counting the year's runs. */
export function subscriptionMonthly(s: Pick<Subscription, "schedule" | "amount" | "quantity">, from: string): number {
  const each = s.amount * (s.quantity ?? 1);
  if (s.schedule.kind === "cycle") return cycleMonthlyEquivalent(each, s.schedule);
  const end = shiftDay(from, 365);
  const runs = subscriptionCharges({ schedule: s.schedule, anchor: from }, from, 400).filter((d) => d <= end).length;
  return divRound(each * runs, 12);
}
