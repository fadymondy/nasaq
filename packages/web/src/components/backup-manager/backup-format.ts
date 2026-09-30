/** Pure helpers for the backup manager: sizes, the next scheduled run, and what retention would delete. No React here. */

export type DateLike = Date | number | string;
export type BackupFrequency = "hourly" | "daily" | "weekly" | "monthly";
export type BackupStatus = "completed" | "running" | "failed" | "restoring";

export const toMs = (v: DateLike): number => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** `842 B`, `12.4 MB`, `1.8 GB`. Base 1024, Latin digits; the units stay Latin in Arabic too. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < UNITS.length - 1) {
    value /= 1024;
    i++;
  }
  const text = i === 0 || value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  return `${text} ${UNITS[i]}`;
}

export const totalSize = (backups: readonly { sizeBytes?: number; status: BackupStatus }[]): number =>
  backups.reduce((sum, b) => sum + (b.status === "completed" ? (b.sizeBytes ?? 0) : 0), 0);

export interface BackupSchedule {
  enabled: boolean;
  frequency: BackupFrequency;
  /** `HH:MM`, 24 hour, in the server's local time. For hourly only the minutes count. */
  time: string;
  /** 0 is Sunday. Used by weekly. */
  dayOfWeek?: number;
}

export interface BackupRetention {
  /** Keep at most this many backups. */
  keepLast: number;
  /** Also delete backups older than this many days. 0 or undefined means no age limit. */
  maxAgeDays?: number;
}

export function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

/** The next time the schedule fires after `now`, or null when it is off or the time is invalid. Uses local time. */
export function nextRun(schedule: BackupSchedule, now: DateLike = Date.now()): Date | null {
  if (!schedule.enabled) return null;
  const t = parseTime(schedule.time);
  if (!t) return null;
  const from = new Date(toMs(now));
  const next = new Date(from);
  next.setSeconds(0, 0);
  if (schedule.frequency === "hourly") {
    next.setMinutes(t.m);
    if (next <= from) next.setHours(next.getHours() + 1);
    return next;
  }
  next.setHours(t.h, t.m, 0, 0);
  if (schedule.frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
  } else if (schedule.frequency === "weekly") {
    const target = schedule.dayOfWeek ?? 0;
    let add = (target - next.getDay() + 7) % 7;
    if (add === 0 && next <= from) add = 7;
    next.setDate(next.getDate() + add);
  } else {
    next.setDate(1);
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
    }
  }
  return next;
}

export interface RetentionBackup {
  id: string;
  createdAt: DateLike;
  status: BackupStatus;
  /** A locked backup is never removed by retention. */
  locked?: boolean;
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
  return done
    .filter((b, i) => i > 0 && !b.locked && (i >= keep || current - toMs(b.createdAt) > maxAge))
    .map((b) => b.id);
}

export type RetentionError = "keepLast" | "maxAgeDays";

export function validateRetention(retention: { keepLast: number; maxAgeDays?: number | undefined }): RetentionError | null {
  if (!Number.isInteger(retention.keepLast) || retention.keepLast < 1 || retention.keepLast > 1000) return "keepLast";
  if (retention.maxAgeDays !== undefined && (!Number.isInteger(retention.maxAgeDays) || retention.maxAgeDays < 0 || retention.maxAgeDays > 3650)) return "maxAgeDays";
  return null;
}

/** Clamp a percentage for a progress bar. */
export const clampPercent = (value: number | undefined): number => (value === undefined || !Number.isFinite(value) ? 0 : Math.min(100, Math.max(0, value)));
