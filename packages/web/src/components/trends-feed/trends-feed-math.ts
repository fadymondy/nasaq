/* Pure logic for the trends feed and the sources catalogue. No imports, so it runs under node --test. */

export type TrendState = "new" | "saved" | "reviewed" | "dismissed";
export const TREND_STATES: readonly TrendState[] = ["new", "saved", "reviewed", "dismissed"];

export type TrendAction = "save" | "review" | "dismiss" | "restore";

/** The state an action leads to. */
export function stateAfter(action: TrendAction): TrendState {
  return action === "save" ? "saved" : action === "review" ? "reviewed" : action === "dismiss" ? "dismissed" : "new";
}

/** The actions that make sense from a state (a saved topic can still be reviewed or dismissed, not saved again). */
export function actionsFor(state: TrendState): TrendAction[] {
  switch (state) {
    case "new":
      return ["save", "review", "dismiss"];
    case "saved":
      return ["review", "dismiss", "restore"];
    case "reviewed":
      return ["save", "dismiss", "restore"];
    default:
      return ["restore"];
  }
}

export function countByState(topics: readonly { state: TrendState }[]): Record<TrendState, number> {
  const out: Record<TrendState, number> = { new: 0, saved: 0, reviewed: 0, dismissed: 0 };
  for (const t of topics) out[t.state] += 1;
  return out;
}

/** The calendar day ("YYYY-MM-DD") of an instant in a time zone. Without a zone, the runtime's. */
export function dayKey(value: Date | string | number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export interface TrendDayGroup<T> {
  day: string;
  topics: T[];
}

/** Newest day first; inside a day the highest score first, then the newest. */
export function groupTopicsByDay<T extends { score: number; detectedAt: Date | string | number }>(topics: readonly T[], timeZone?: string): TrendDayGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const t of topics) {
    const key = dayKey(t.detectedAt, timeZone);
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([day, list]) => ({ day, topics: list.sort((a, b) => b.score - a.score || new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()) }));
}

export type SourceTier = 1 | 2 | 3;
export type SourceHealth = "ok" | "degraded" | "down";

export interface SourceLike {
  tier: SourceTier;
  enabled: boolean;
  health: SourceHealth;
}

/** A source can feed the tier when it is switched on and not down. Degraded sources still count. */
export const isSourceUsable = (s: SourceLike) => s.enabled && s.health !== "down";

export interface ActiveTier {
  /** The lowest tier that has a usable source, or null when none has. */
  tier: SourceTier | null;
  /** True when a higher priority tier (a lower number) has sources but none is usable. */
  fellBack: boolean;
  /** Tiers that have sources but none usable, in order. */
  skipped: SourceTier[];
}

/** Tier 1 is preferred; when it has no usable source the feed falls back to tier 2, then tier 3. Empty tiers are not "skipped". */
export function resolveActiveTier(sources: readonly SourceLike[]): ActiveTier {
  const skipped: SourceTier[] = [];
  for (const tier of [1, 2, 3] as const) {
    const inTier = sources.filter((s) => s.tier === tier);
    if (!inTier.length) continue;
    if (inTier.some(isSourceUsable)) return { tier, fellBack: skipped.length > 0, skipped };
    skipped.push(tier);
  }
  return { tier: null, fellBack: false, skipped };
}
