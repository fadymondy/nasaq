/** Pure helpers for the GitHub activity feed: statuses, sha and message shortening, and merging feeds. No React here. */

export type DateLike = Date | number | string;
export type PullState = "open" | "draft" | "merged" | "closed";
export type RunStatus = "queued" | "in_progress" | "success" | "failure" | "cancelled" | "skipped";
export type DeploymentStatus = "pending" | "in_progress" | "success" | "failure" | "inactive";
export type ActivityTone = "neutral" | "info" | "success" | "warning" | "danger";
export type ActivityKind = "commit" | "pull" | "run" | "deployment";

export const toMs = (v: DateLike): number => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

/** The seven-character short form of a commit sha. */
export function shortSha(sha: string, length = 7): string {
  return sha.slice(0, length);
}

/** The first line of a commit message: what git calls the subject. */
export function commitTitle(message: string): string {
  return (message.split("\n")[0] ?? "").trim();
}

/** Everything after the subject line, trimmed; empty when the commit has no body. */
export function commitBody(message: string): string {
  return message.split("\n").slice(1).join("\n").trim();
}

export const runTone: Record<RunStatus, ActivityTone> = {
  queued: "neutral",
  in_progress: "info",
  success: "success",
  failure: "danger",
  cancelled: "warning",
  skipped: "neutral",
};

export const pullTone: Record<PullState, ActivityTone> = { open: "success", draft: "neutral", merged: "info", closed: "danger" };

export const deploymentTone: Record<DeploymentStatus, ActivityTone> = {
  pending: "neutral",
  in_progress: "info",
  success: "success",
  failure: "danger",
  inactive: "neutral",
};

/** A run or deployment that is still going. */
export const isActive = (status: RunStatus | DeploymentStatus): boolean => status === "in_progress" || status === "queued" || status === "pending";

/** Case-insensitive match of a query against several fields; an empty query matches everything. */
export function matches(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}

export interface ActivityEvent {
  kind: ActivityKind;
  id: string;
  time: number;
}

/** Merge feeds of dated items into one list, newest first. Ties keep the input order (commits, pulls, runs, deployments). */
export function mergeActivity<T extends { id: string }>(
  feeds: { kind: ActivityKind; items: readonly T[]; time: (item: T) => DateLike }[],
): (ActivityEvent & { item: T })[] {
  const all = feeds.flatMap(({ kind, items, time }) => items.map((item) => ({ kind, id: item.id, time: toMs(time(item)), item })));
  return all.map((e, i) => ({ e, i })).sort((a, b) => b.e.time - a.e.time || a.i - b.i).map(({ e }) => e);
}

/** How many items are in each state, for tab badges and summaries. */
export function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}
