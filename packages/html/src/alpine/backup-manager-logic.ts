/** Pure helpers for the backup manager (copied from packages/web/src/components/backup-manager/backup-format.ts): time parsing, retention checks and what retention would delete. */

export type DateLike = Date | number | string;
export type BackupStatus = "completed" | "running" | "failed" | "restoring";

export const toMs = (v: DateLike): number => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

export interface BackupRetention {
  /** Keep at most this many backups. */
  keepLast: number;
  /** Also delete backups older than this many days. 0 or undefined means no age limit. */
  maxAgeDays?: number;
}

export interface RetentionBackup {
  id: string;
  createdAt: DateLike;
  status: BackupStatus;
  /** A locked backup is never removed by retention. */
  locked?: boolean;
}

export function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

/**
 * The ids retention would delete: completed, unlocked backups beyond the newest `keepLast`, or older than
 * `maxAgeDays`. The newest completed backup is always kept so a bad setting can never leave you with none.
 */
export function pruneCandidates(backups: readonly RetentionBackup[], retention: BackupRetention, now: DateLike = Date.now()): string[] {
  const current = toMs(now);
  const done = backups.filter((b) => b.status === "completed").sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  const keep = Math.max(1, Math.floor(retention.keepLast));
  const maxAge = retention.maxAgeDays && retention.maxAgeDays > 0 ? retention.maxAgeDays * 86_400_000 : Infinity;
  return done.filter((b, i) => i > 0 && !b.locked && (i >= keep || current - toMs(b.createdAt) > maxAge)).map((b) => b.id);
}

export type RetentionError = "keepLast" | "maxAgeDays";

export function validateRetention(retention: { keepLast: number; maxAgeDays?: number | undefined }): RetentionError | null {
  if (!Number.isInteger(retention.keepLast) || retention.keepLast < 1 || retention.keepLast > 1000) return "keepLast";
  if (retention.maxAgeDays !== undefined && (!Number.isInteger(retention.maxAgeDays) || retention.maxAgeDays < 0 || retention.maxAgeDays > 3650)) return "maxAgeDays";
  return null;
}
