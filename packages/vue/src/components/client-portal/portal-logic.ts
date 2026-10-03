/*
 * Client portal, pure: what a customer is allowed to see and the numbers on the overview.
 * No runtime imports, so the node tests load it directly.
 *
 * The portal only ever shows aggregates and sent documents: task counts, percent done, hours against a budget,
 * hours per week, open issues, pending requests, and invoices that have left draft.
 */

export type PortalTaskStatus = "todo" | "doing" | "review" | "done";

export interface PortalTask {
  id: string;
  title: string;
  status: PortalTaskStatus;
  /** First name or full name of who is on it. */
  assignee?: string;
  /** ISO date. */
  due?: string;
}

export const PORTAL_TASK_STATUSES: readonly PortalTaskStatus[] = ["todo", "doing", "review", "done"];

export type PortalRequestStatus = "pending" | "accepted" | "declined" | "done";

export interface PortalRequest {
  id: string;
  title: string;
  description?: string;
  status: PortalRequestStatus;
  /** ISO date-time. */
  createdAt: string;
  by?: string;
  /** Why it was declined, when it was. */
  reply?: string;
}

export interface PortalWeek {
  /** ISO date of the Monday (or first day) of the week. */
  week: string;
  hours: number;
}

export interface PortalProgress {
  total: number;
  done: number;
  /** 0 to 100, rounded. */
  percent: number;
  byStatus: Record<PortalTaskStatus, number>;
}

/** Task counts and percent done. An empty project is 0, not NaN. */
export function portalProgress(tasks: readonly Pick<PortalTask, "status">[]): PortalProgress {
  const byStatus: Record<PortalTaskStatus, number> = { todo: 0, doing: 0, review: 0, done: 0 };
  for (const t of tasks) byStatus[t.status] += 1;
  const total = tasks.length;
  return { total, done: byStatus.done, percent: total === 0 ? 0 : Math.round((byStatus.done / total) * 100), byStatus };
}

export interface PortalBudget {
  budget: number;
  used: number;
  remaining: number;
  /** 0 to 100 (used over budget, capped). 0 when there is no budget. */
  percent: number;
  over: boolean;
  tone: "success" | "warning" | "danger";
}

/** Hours against the budget. Warns from 80 percent, danger once over. A zero budget is never "over". */
export function portalBudget(budget: number, used: number): PortalBudget {
  const b = Math.max(0, budget);
  const u = Math.max(0, used);
  const ratio = b === 0 ? 0 : u / b;
  return {
    budget: b,
    used: u,
    remaining: Math.max(0, b - u),
    percent: Math.min(100, Math.round(ratio * 100)),
    over: b > 0 && u > b,
    tone: b > 0 && u > b ? "danger" : ratio >= 0.8 ? "warning" : "success",
  };
}

/** Total hours in the weeks, one decimal at most. */
export function portalTotalHours(weeks: readonly PortalWeek[]): number {
  return Math.round(weeks.reduce((sum, w) => sum + w.hours, 0) * 10) / 10;
}

/** Newest week first, so the table and the bars read from now backwards. */
export function portalWeeksNewestFirst(weeks: readonly PortalWeek[]): PortalWeek[] {
  return [...weeks].sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : 0));
}

/** How many requests wait for an answer. */
export function portalPendingRequests(requests: readonly Pick<PortalRequest, "status">[]): number {
  return requests.filter((r) => r.status === "pending").length;
}

export interface PortalInvoiceLike {
  status: "draft" | "open" | "paid" | "overdue" | "void" | "refunded";
}

/** Drafts are internal: a customer never sees an invoice, or its amount, before it is sent. */
export function portalVisibleInvoices<T extends PortalInvoiceLike>(invoices: readonly T[]): T[] {
  return invoices.filter((i) => i.status !== "draft");
}

/** Stroke offset for a ring of the given radius at `percent` (0 to 100). */
export function portalRing(percent: number, radius: number): { circumference: number; offset: number } {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  const circumference = 2 * Math.PI * radius;
  return { circumference, offset: circumference * (1 - clamped / 100) };
}
