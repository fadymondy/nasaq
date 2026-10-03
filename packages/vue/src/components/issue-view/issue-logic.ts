/** Pure helpers for IssueView: the issue model, stages, due state, estimates and patches. Functions carry an `issue` prefix: the package index re-exports every component with `export *`. */
import { Bug, Sparkles, SquareCheck, TrendingUp, Wrench, type LucideIcon } from "lucide-vue-next";
import type { StatusStage, WorkStatus } from "../status-label-manager/status-label-logic";

export const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_TYPES = ["bug", "feature", "improvement", "task", "chore"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export interface IssuePerson {
  id: string;
  name: string;
  avatar?: string;
}

/** A short pointer to an issue: sub-issues, parents, pickers. */
export interface IssueRef {
  id: string;
  /** "NSQ-42". Always shown left-to-right. */
  key: string;
  title: string;
  statusId: string;
  assigneeId?: string | null;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  /** HTML from the rich text editor. */
  description?: string;
  statusId: string;
  priority: IssuePriority;
  type: IssueType;
  assigneeId?: string | null;
  labelIds: string[];
  /** Hours. */
  estimateHours?: number | null;
  /** Civil date "2026-10-04". */
  dueDate?: string | null;
  startDate?: string | null;
  projectId: string;
  parentId?: string | null;
  createdAt: Date | string | number;
  updatedAt?: Date | string | number;
  completedAt?: Date | string | number | null;
}

export type IssuePatch = Partial<Pick<Issue, "title" | "description" | "statusId" | "priority" | "type" | "assigneeId" | "labelIds" | "estimateHours" | "dueDate" | "startDate" | "projectId" | "parentId">>;

export type IssueResult = void | { error?: string };

/** Rank for sorting: urgent first. */
export const ISSUE_PRIORITY_RANK: Record<IssuePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

export const ISSUE_TYPE_ICONS: Record<IssueType, LucideIcon> = { bug: Bug, feature: Sparkles, improvement: TrendingUp, task: SquareCheck, chore: Wrench };

export function issueStageOf(statuses: readonly WorkStatus[], statusId: string): StatusStage | undefined {
  return statuses.find((s) => s.id === statusId)?.stage;
}

/** Not finished and not canceled. */
export function issueIsOpenStage(stage: StatusStage | undefined): boolean {
  return stage !== "done" && stage !== "canceled";
}

export function issueIsOpen(issue: Pick<Issue, "statusId">, statuses: readonly WorkStatus[]): boolean {
  return issueIsOpenStage(issueStageOf(statuses, issue.statusId));
}

/** Milliseconds of a civil date "2026-10-04" at local midnight. */
export function issueCivilMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

export type IssueDueState = "none" | "overdue" | "today" | "soon" | "later";

/** How urgent a due date is: overdue, today, within three days ("soon") or later. Finished issues are never overdue. */
export function issueDueState(dueDate: string | null | undefined, now: number, open = true): IssueDueState {
  if (!dueDate) return "none";
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const days = Math.round((issueCivilMs(dueDate) - start.getTime()) / 86_400_000);
  if (days < 0) return open ? "overdue" : "later";
  if (days === 0) return "today";
  return days <= 3 ? "soon" : "later";
}

export interface IssueEstimateSummary {
  loggedHours: number;
  estimateHours: number | null;
  /** 0 to 1 of the estimate used, uncapped; null without an estimate. */
  ratio: number | null;
  over: boolean;
}

/** Time logged against the estimate. `loggedSeconds` are whole seconds from the time entries. */
export function issueEstimateSummary(loggedSeconds: number, estimateHours: number | null | undefined): IssueEstimateSummary {
  const loggedHours = loggedSeconds / 3600;
  const est = estimateHours && estimateHours > 0 ? estimateHours : null;
  const ratio = est ? loggedHours / est : null;
  return { loggedHours, estimateHours: est, ratio, over: ratio !== null && ratio > 1 };
}

/** Whole and fractional hours as "1h 30m". Returns "0m" for zero. */
export function issueFormatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return [h ? `${h}h` : "", m || !h ? `${m}m` : ""].filter(Boolean).join(" ");
}

/** Parses an estimate typed as "2", "1.5", "1,5" or "2h 30m". Null for empty or invalid input. */
export function issueParseEstimate(text: string): number | null {
  const s = text.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  const hm = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(s);
  if (hm && (hm[1] || hm[2])) return Number(hm[1] ?? 0) + Number(hm[2] ?? 0) / 60;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Applies a patch. Moving into a done stage stamps `completedAt`; moving out clears it. */
export function applyIssuePatch(issue: Issue, patch: IssuePatch, statuses: readonly WorkStatus[], now: number = Date.now()): Issue {
  const next: Issue = { ...issue, ...patch, updatedAt: now };
  if (patch.statusId && patch.statusId !== issue.statusId) {
    next.completedAt = issueStageOf(statuses, patch.statusId) === "done" ? now : null;
  }
  return next;
}

/** Sub-issue progress: how many are in a done stage. */
export function issueSubProgress(subs: readonly Pick<IssueRef, "statusId">[], statuses: readonly WorkStatus[]): { done: number; total: number; percent: number } {
  const done = subs.filter((s) => issueStageOf(statuses, s.statusId) === "done").length;
  return { done, total: subs.length, percent: subs.length ? Math.round((done / subs.length) * 100) : 0 };
}

/** Issues a parent may take: not itself, not one of its own descendants (no cycles). */
export function issueParentCandidates<T extends { id: string; parentId?: string | null }>(issueId: string, all: readonly T[]): T[] {
  const banned = new Set<string>([issueId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of all) {
      if (i.parentId && banned.has(i.parentId) && !banned.has(i.id)) {
        banned.add(i.id);
        grew = true;
      }
    }
  }
  return all.filter((i) => !banned.has(i.id));
}

/** Plain text of the description's HTML, for a view without a rich text editor loaded. Paragraph and line breaks become newlines. */
export function issueHtmlToText(html: string): string {
  const spaced = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n");
  if (typeof DOMParser === "undefined") return spaced.replace(/<[^>]*>/g, "").trim();
  return (new DOMParser().parseFromString(spaced, "text/html").body.textContent ?? "").trim();
}
