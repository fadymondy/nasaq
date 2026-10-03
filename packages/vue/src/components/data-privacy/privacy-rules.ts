/** Pure rules of data export and scheduled account deletion. No React. */

export type ExportStatus = "queued" | "processing" | "ready" | "failed" | "expired";

/** Statuses that still change by themselves, so the screen keeps polling. */
export const isExportActive = (status: ExportStatus) => status === "queued" || status === "processing";

/**
 * Milliseconds to wait before poll number `attempt` (0-based). It starts at `base` and grows by half each
 * time up to `max`, so a long export does not hammer the server.
 */
export function pollDelay(attempt: number, base = 3000, max = 30_000): number {
  return Math.min(max, Math.round(base * 1.5 ** Math.max(0, attempt)));
}

const DAY = 86_400_000;
const time = (d: Date | number | string) => new Date(d).getTime();

/** The instant an account scheduled now would be deleted. */
export function deletionDate(now: Date | number | string, graceDays: number): Date {
  return new Date(time(now) + graceDays * DAY);
}

/** Whole days left before `scheduledFor`, rounded up so "less than a day" reads as 1. Never negative. */
export function daysRemaining(scheduledFor: Date | number | string, now: Date | number | string = Date.now()): number {
  return Math.max(0, Math.ceil((time(scheduledFor) - time(now)) / DAY));
}

/** `pending` while the grace period runs, `due` once it has passed, `none` when nothing is scheduled. */
export function deletionPhase(scheduledFor: Date | number | string | null | undefined, now: Date | number | string = Date.now()): "none" | "pending" | "due" {
  if (scheduledFor === null || scheduledFor === undefined) return "none";
  return time(scheduledFor) > time(now) ? "pending" : "due";
}

/** Share of the grace period already used, from 0 to 1. Useful for a progress bar. */
export function graceElapsed(scheduledFor: Date | number | string, graceDays: number, now: Date | number | string = Date.now()): number {
  const total = graceDays * DAY;
  if (total <= 0) return 1;
  const left = time(scheduledFor) - time(now);
  return Math.min(1, Math.max(0, 1 - left / total));
}
