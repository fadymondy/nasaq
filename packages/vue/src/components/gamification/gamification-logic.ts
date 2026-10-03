/** Pure helpers behind the gamification kit. No React, so they run under node --test. */

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** 0 for common up to 4 for legendary. Unknown values sort as common. */
export function rarityRank(rarity: Rarity | undefined): number {
  const i = RARITIES.indexOf(rarity ?? "common");
  return i < 0 ? 0 : i;
}

export interface AchievementLike {
  id: string;
  rarity?: Rarity;
  /** Steps done so far. */
  progress?: number;
  /** Steps needed. Default 1. */
  goal?: number;
  /** When it was earned. Setting it makes the achievement earned whatever the progress. */
  earnedAt?: Date | string | number | null;
}

export type AchievementStatus = "earned" | "in-progress" | "locked";
export type AchievementFilter = "all" | AchievementStatus;

export function achievementStatus(a: AchievementLike): AchievementStatus {
  const goal = a.goal && a.goal > 0 ? a.goal : 1;
  if (a.earnedAt || (a.progress ?? 0) >= goal) return "earned";
  return (a.progress ?? 0) > 0 ? "in-progress" : "locked";
}

/** Whole percent of the goal reached, 0 to 100. Earned is always 100. */
export function achievementPercent(a: AchievementLike): number {
  if (achievementStatus(a) === "earned") return 100;
  const goal = a.goal && a.goal > 0 ? a.goal : 1;
  return Math.min(100, Math.max(0, Math.floor(((a.progress ?? 0) / goal) * 100)));
}

export function filterAchievements<T extends AchievementLike>(list: readonly T[], filter: AchievementFilter): T[] {
  return filter === "all" ? [...list] : list.filter((a) => achievementStatus(a) === filter);
}

export function achievementCounts(list: readonly AchievementLike[]): Record<AchievementFilter, number> {
  const c: Record<AchievementFilter, number> = { all: list.length, earned: 0, "in-progress": 0, locked: 0 };
  for (const a of list) c[achievementStatus(a)] += 1;
  return c;
}

/* ------------------------------------------------------------------ leaderboard */

export interface LeaderboardEntryLike {
  id: string;
  name: string;
  score: number;
  /** Rank in the previous period. Omit for a new entry. */
  previousRank?: number;
}

export type Ranked<T> = T & { rank: number };

/**
 * Sorts by score, highest first, and numbers the entries. Equal scores share a rank and the next rank
 * skips (1, 2, 2, 4). Ties keep input order.
 */
export function rankEntries<T extends LeaderboardEntryLike>(entries: readonly T[]): Ranked<T>[] {
  const sorted = entries.map((e, i) => ({ e, i })).sort((a, b) => b.e.score - a.e.score || a.i - b.i);
  const out: Ranked<T>[] = [];
  let rank = 0;
  sorted.forEach(({ e }, index) => {
    if (index === 0 || e.score !== sorted[index - 1]?.e.score) rank = index + 1;
    out.push({ ...e, rank });
  });
  return out;
}

export type MovementDirection = "up" | "down" | "same" | "new";

/** Change since the previous period. `by` is always positive. */
export function movement(entry: { rank: number; previousRank?: number }): { direction: MovementDirection; by: number } {
  if (entry.previousRank === undefined) return { direction: "new", by: 0 };
  const diff = entry.previousRank - entry.rank;
  return diff > 0 ? { direction: "up", by: diff } : diff < 0 ? { direction: "down", by: -diff } : { direction: "same", by: 0 };
}

/** The top three for the podium, the rest for the list. Pass `podium: false` to keep everyone in the list. */
export function splitPodium<T extends { rank: number }>(ranked: readonly T[], podium = true): { top: T[]; rest: T[] } {
  if (!podium) return { top: [], rest: [...ranked] };
  // Rank ties can put four people on the podium steps; a podium only holds three.
  return { top: ranked.slice(0, 3), rest: ranked.slice(3) };
}

/**
 * The current user's row when it falls outside the visible rows, so it can be pinned below the list.
 * `null` when there is no such user or they are already visible.
 */
export function pinnedEntry<T extends { id: string }>(ranked: readonly T[], youId: string | undefined, visible: number): T | null {
  if (!youId) return null;
  const index = ranked.findIndex((e) => e.id === youId);
  return index >= visible ? (ranked[index] ?? null) : null;
}

/* ------------------------------------------------------------------ xp and levels */

export interface LevelCurve {
  /** XP to reach level 2. Default 100. */
  base?: number;
  /** How fast each level costs more: 1 is linear, 1.5 is gentle, 2 is steep. Default 1.5. */
  growth?: number;
}

/** Total XP at which `level` starts. Level 1 starts at 0. */
export function xpForLevel(level: number, { base = 100, growth = 1.5 }: LevelCurve = {}): number {
  if (level <= 1) return 0;
  return Math.round(base * (level - 1) ** growth);
}

export interface LevelProgress {
  level: number;
  /** XP earned inside this level. */
  xp: number;
  /** XP this level is worth (the distance to the next level). */
  span: number;
  /** XP still needed for the next level. */
  remaining: number;
  /** 0 to 100. */
  percent: number;
}

/** Turns a lifetime XP total into a level and the progress toward the next one. */
export function levelProgress(totalXp: number, curve: LevelCurve = {}): LevelProgress {
  const total = Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0));
  let level = 1;
  while (xpForLevel(level + 1, curve) <= total && level < 1000) level += 1;
  const start = xpForLevel(level, curve);
  const next = xpForLevel(level + 1, curve);
  const span = Math.max(1, next - start);
  const xp = total - start;
  return { level, xp, span, remaining: next - total, percent: Math.min(100, Math.floor((xp / span) * 100)) };
}

/* ------------------------------------------------------------------ streaks and calendar */

/** `YYYY-MM-DD` of a date in local time. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function addDays(key: string, n: number): string {
  const date = parseDay(key);
  date.setDate(date.getDate() + n);
  return dayKey(date);
}

/** Normalises anything date-like to a day key. Invalid values become `null`. */
export function toDayKey(value: Date | string | number): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : dayKey(date);
}

export interface StreakStats {
  /** Consecutive active days ending today. A streak that ended yesterday still counts, so it is not lost before today is over. */
  current: number;
  longest: number;
  /** Today has no activity yet but the streak is alive. */
  atRisk: boolean;
}

export function streakStats(activeDays: readonly (Date | string | number)[], today: Date = new Date()): StreakStats {
  const set = new Set(activeDays.map(toDayKey).filter((k): k is string => k !== null));
  const todayKey = dayKey(today);
  let cursor = set.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  return { current, longest, atRisk: current > 0 && !set.has(todayKey) };
}

export interface CalendarCell {
  key: string;
  day: number;
  active: boolean;
  today: boolean;
  /** After today: cannot have activity yet. */
  future: boolean;
}

/**
 * The weeks of a month, each 7 long, with `null` before the 1st and after the last day.
 * `weekStart` is the first column: 0 Sunday, 1 Monday, 6 Saturday.
 */
export function monthGrid(year: number, month: number, activeDays: readonly (Date | string | number)[], today: Date = new Date(), weekStart = 0): (CalendarCell | null)[][] {
  const active = new Set(activeDays.map(toDayKey).filter((k): k is string => k !== null));
  const todayKey = dayKey(today);
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const key = dayKey(new Date(year, month, day));
    cells.push({ key, day, active: active.has(key), today: key === todayKey, future: key > todayKey });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
