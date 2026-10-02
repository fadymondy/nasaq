/** Pure helpers for ProjectView: status counts, burndown, budget, timeline bars and board moves. */
// Only types come from issue-logic, so this file loads on its own under node --test.
import type { Issue } from "../issue-view/issue-logic";
import type { WorkStatus } from "../status-label-manager/status-label-logic";

const DAY = 86_400_000;

const stageOf = (statuses: readonly WorkStatus[], statusId: string) => statuses.find((s) => s.id === statusId)?.stage;
const isOpenIssue = (issue: Pick<Issue, "statusId">, statuses: readonly WorkStatus[]) => {
  const stage = stageOf(statuses, issue.statusId);
  return stage !== "done" && stage !== "canceled";
};

/** "2026-10-04" for a date, a timestamp or an ISO string, by the local calendar day. */
export function dayKey(value: Date | string | number): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A civil date as UTC midnight, so day arithmetic never crosses a daylight-saving change. */
function utcDay(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Adds whole days to a civil date key. */
export function addDays(key: string, days: number): string {
  return new Date(utcDay(key) + days * DAY).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (both civil keys). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcDay(b) - utcDay(a)) / DAY);
}

export interface StatusCount {
  statusId: string;
  count: number;
}

/** How many issues sit in each status, in the order of `statuses`. Statuses with no issues are kept, at zero. */
export function statusCounts(issues: readonly Pick<Issue, "statusId">[], statuses: readonly WorkStatus[]): StatusCount[] {
  const counts = new Map<string, number>();
  for (const i of issues) counts.set(i.statusId, (counts.get(i.statusId) ?? 0) + 1);
  return statuses.map((s) => ({ statusId: s.id, count: counts.get(s.id) ?? 0 }));
}

export interface ProjectTotals {
  total: number;
  open: number;
  done: number;
  overdue: number;
  /** 0 to 100 by issues in a done stage. */
  percent: number;
}

/** Open, done and overdue issue counts. Canceled issues count in neither open nor done and leave the percentage. */
export function projectTotals(issues: readonly Issue[], statuses: readonly WorkStatus[], today: string): ProjectTotals {
  let open = 0;
  let done = 0;
  let canceled = 0;
  let overdue = 0;
  for (const i of issues) {
    const stage = stageOf(statuses, i.statusId);
    if (stage === "done") done++;
    else if (stage === "canceled") canceled++;
    else {
      open++;
      if (i.dueDate && i.dueDate < today) overdue++;
    }
  }
  const counted = issues.length - canceled;
  return { total: issues.length, open, done, overdue, percent: counted === 0 ? 0 : Math.round((done / counted) * 100) };
}

export interface BurndownPoint {
  /** Civil date. */
  date: string;
  /** Issues still open at the end of that day. Missing after `today`. */
  remaining: number | null;
  /** The straight line from the scope at the start to zero at the end. */
  ideal: number;
}

/**
 * Open issues at the end of each day from `start` to `end`, against the ideal line. An issue counts from the day it
 * was created until the day it was completed. Days after `today` have no `remaining`.
 */
export function burndown(issues: readonly Pick<Issue, "createdAt" | "completedAt" | "statusId">[], start: string, end: string, today: string): BurndownPoint[] {
  const span = Math.max(1, daysBetween(start, end));
  const made = issues.map((i) => ({ from: dayKey(i.createdAt), to: i.completedAt ? dayKey(i.completedAt) : null }));
  const scope = made.filter((m) => m.from <= start).length;
  const points: BurndownPoint[] = [];
  for (let n = 0; n <= span; n++) {
    const date = addDays(start, n);
    let remaining: number | null = null;
    if (date <= today) remaining = made.filter((m) => m.from <= date && (m.to === null || m.to > date)).length;
    points.push({ date, remaining, ideal: Math.max(0, Math.round(scope * (1 - n / span) * 10) / 10) });
  }
  return points;
}

export interface BudgetState {
  /** Spent as a fraction of the total (can pass 1). 0 when there is no budget. */
  ratio: number;
  remaining: number;
  over: boolean;
}

export function budgetState(total: number | null | undefined, spent: number): BudgetState {
  if (!total || total <= 0) return { ratio: 0, remaining: 0, over: false };
  return { ratio: spent / total, remaining: total - spent, over: spent > total };
}

export interface TimelineBar {
  id: string;
  /** Percent from the start of the range, 0 to 100. */
  offset: number;
  /** Percent of the range, at least a sliver so a one-day task can be seen. */
  width: number;
  start: string;
  end: string;
  done: boolean;
}

/** The dates an issue occupies: start (or creation) to due (or completion). Null when it has no end. */
export function issueSpan(issue: Pick<Issue, "createdAt" | "startDate" | "dueDate" | "completedAt">): { start: string; end: string } | null {
  const start = issue.startDate ?? dayKey(issue.createdAt);
  const end = issue.dueDate ?? (issue.completedAt ? dayKey(issue.completedAt) : null);
  if (!end) return null;
  return end < start ? { start: end, end: start } : { start, end };
}

/** The range that holds every scheduled issue, widened to whole weeks. Null when nothing is scheduled. */
export function timelineRange(issues: readonly Pick<Issue, "createdAt" | "startDate" | "dueDate" | "completedAt">[]): { start: string; end: string } | null {
  let start: string | null = null;
  let end: string | null = null;
  for (const i of issues) {
    const s = issueSpan(i);
    if (!s) continue;
    if (start === null || s.start < start) start = s.start;
    if (end === null || s.end > end) end = s.end;
  }
  if (start === null || end === null) return null;
  return { start, end: daysBetween(start, end) < 6 ? addDays(start, 6) : end };
}

/** Where each scheduled issue's bar sits inside `range`. Unscheduled issues are left out. */
export function timelineBars(issues: readonly (Pick<Issue, "id" | "createdAt" | "startDate" | "dueDate" | "completedAt" | "statusId">)[], range: { start: string; end: string }, statuses: readonly WorkStatus[]): TimelineBar[] {
  const total = daysBetween(range.start, range.end) + 1;
  const bars: TimelineBar[] = [];
  for (const i of issues) {
    const s = issueSpan(i);
    if (!s) continue;
    const from = Math.max(0, daysBetween(range.start, s.start));
    const to = Math.min(total, daysBetween(range.start, s.end) + 1);
    if (to <= 0 || from >= total) continue;
    bars.push({ id: i.id, start: s.start, end: s.end, offset: (from / total) * 100, width: Math.max(1.5, ((to - from) / total) * 100), done: stageOf(statuses, i.statusId) === "done" });
  }
  return bars;
}

/** Week starts inside the range, for the ruler above the bars. */
export function rulerTicks(range: { start: string; end: string }, every = 7): { date: string; offset: number }[] {
  const total = daysBetween(range.start, range.end) + 1;
  const ticks: { date: string; offset: number }[] = [];
  for (let n = 0; n < total; n += every) ticks.push({ date: addDays(range.start, n), offset: (n / total) * 100 });
  return ticks;
}

/**
 * Applies a board drop: the issue takes the status of `toColumn` and lands at `toIndex` among that column's issues
 * (the index it has once it is out of its old place). Other columns keep their order. Moving into a done status
 * stamps `completedAt`, moving out clears it.
 */
export function moveProjectIssue(issues: readonly Issue[], id: string, toStatusId: string, toIndex: number, statuses: readonly WorkStatus[], now: number = Date.now()): Issue[] {
  const moving = issues.find((i) => i.id === id);
  if (!moving) return [...issues];
  const moved: Issue = moving.statusId === toStatusId ? moving : { ...moving, statusId: toStatusId, updatedAt: now, completedAt: stageOf(statuses, toStatusId) === "done" ? now : null };
  const rest = issues.filter((i) => i.id !== id);
  const inColumn = rest.filter((i) => i.statusId === toStatusId);
  const at = Math.max(0, Math.min(toIndex, inColumn.length));
  const anchor = inColumn[at];
  if (!anchor) {
    const last = inColumn[inColumn.length - 1];
    if (!last) return [...rest, moved];
    const pos = rest.indexOf(last) + 1;
    return [...rest.slice(0, pos), moved, ...rest.slice(pos)];
  }
  const pos = rest.indexOf(anchor);
  return [...rest.slice(0, pos), moved, ...rest.slice(pos)];
}

/** Issues that are not finished, oldest due date first, then by key. Used for "what is left". */
export function openIssues(issues: readonly Issue[], statuses: readonly WorkStatus[]): Issue[] {
  return issues.filter((i) => isOpenIssue(i, statuses)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.key.localeCompare(b.key));
}

/* ------------------------------------------------------------------ feed */

export interface FeedLike {
  id: string;
  kind?: string;
  actor?: { name: string };
  title: string;
  description?: string;
  at: Date | string | number;
}

/** Filter a feed by kind and person; an empty or "all" value keeps everything. */
export function filterFeed<T extends FeedLike>(items: readonly T[], filter: { kind?: string; actor?: string }): T[] {
  return items.filter((i) => (!filter.kind || filter.kind === "all" || (i.kind ?? "other") === filter.kind) && (!filter.actor || filter.actor === "all" || i.actor?.name === filter.actor));
}

/** Newest first, grouped by local day. */
export function groupByDay<T extends FeedLike>(items: readonly T[]): { day: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const groups: { day: string; items: T[] }[] = [];
  for (const item of sorted) {
    const day = dayKey(item.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

/* ------------------------------------------------------------------ memory */

export interface MemoryLike {
  id: string;
  kind?: "fact" | "decision";
  text: string;
  tags?: readonly string[];
  source?: string;
  at: Date | string | number;
}

/** Search text, tags (all must match) and kind. Newest first. */
export function filterMemories<T extends MemoryLike>(items: readonly T[], filter: { query?: string; tags?: readonly string[]; kind?: string }): T[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return items
    .filter((m) => {
      if (filter.kind && filter.kind !== "all" && (m.kind ?? "fact") !== filter.kind) return false;
      if (filter.tags?.length && !filter.tags.every((t) => m.tags?.includes(t))) return false;
      if (!q) return true;
      return [m.text, m.source ?? "", ...(m.tags ?? [])].some((s) => s.toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** Every tag in use with its count, most used first. */
export function memoryTags(items: readonly MemoryLike[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const m of items) for (const t of m.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** "api, billing,, API" becomes ["api", "billing"]. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[,،\n]/)) {
    const t = part.trim().replace(/^#/, "").toLowerCase();
    if (t) seen.add(t);
  }
  return [...seen];
}
