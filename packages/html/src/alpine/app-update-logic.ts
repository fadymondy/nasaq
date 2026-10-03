export type UpdateStatus = "available" | "downloading" | "ready" | "error";

export interface ReleaseNote {
  type: "new" | "improved" | "fixed";
  text: string;
}

export interface AppRelease {
  id?: string;
  /** Human version such as "2.4.0". */
  version: string;
  /** Monotonic build number. The minimum supported build is compared against this. */
  build: number;
  /** ISO string, timestamp or Date. */
  date?: number | Date | string;
  notes?: readonly ReleaseNote[];
  /** Download size in bytes. */
  size?: number;
  channel?: "stable" | "beta";
}

/** True when the running build is older than the oldest build the server still supports. Pure. */
export function isUpdateRequired(currentBuild: number, minSupportedBuild: number | null | undefined): boolean {
  return minSupportedBuild != null && currentBuild < minSupportedBuild;
}

/** Rounds a percentage into 0..100. Pure. */
export function clampUpdatePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** Bytes as "12.4 MB". Latin digits in every locale. Pure. */
export function formatUpdateSize(bytes: number, locale = "en"): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = Math.max(0, bytes);
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[i],
    unitDisplay: "short",
    numberingSystem: "latn",
    maximumFractionDigits: value >= 100 || i === 0 ? 0 : 1,
  }).format(value);
}

/** Bytes per second as "3.2 MB/s". Pure. */
export function formatUpdateSpeed(bytesPerSecond: number, locale = "en"): string {
  return `${formatUpdateSize(bytesPerSecond, locale)}/${locale.startsWith("ar") ? "ث" : "s"}`;
}

/** Whole seconds left at the current speed, or null when unknown. Pure. */
export function secondsLeft(totalBytes: number, doneBytes: number, bytesPerSecond: number): number | null {
  if (!(bytesPerSecond > 0) || totalBytes <= 0) return null;
  return Math.max(0, Math.ceil((totalBytes - doneBytes) / bytesPerSecond));
}

/** Seconds as "1:05" or "0:12". Pure. */
export function formatUpdateTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** How many of the given user builds are below the minimum supported build. Pure. */
export function countBelow(builds: readonly { build: number; users: number }[], minSupportedBuild: number): number {
  return builds.reduce((sum, b) => (b.build < minSupportedBuild ? sum + b.users : sum), 0);
}

/** Why a minimum supported build value can not be saved, or null when it can. Pure. */
export function minBuildProblem(value: number, latestBuild: number): "invalid" | "too-high" | null {
  if (!Number.isInteger(value) || value < 0) return "invalid";
  if (value > latestBuild) return "too-high";
  return null;
}
