/*
 * Rank tracking maths. A position is where a page shows in the results: 1 is the top, so LOWER IS BETTER, and
 * `null` means it is not in the tracked depth (the top 100). Pure, shared by the UI and the tests.
 */

export type RankPosition = number | null;
export type RankDirection = "up" | "down" | "same" | "new" | "lost" | "none";
export type RankBucket = "top3" | "top10" | "top100" | "unranked";

export interface RankMovement {
  direction: RankDirection;
  /** Places gained (positive) or lost (negative). 0 for same, new, lost and none. */
  delta: number;
}

/** Movement from the previous position to the current one. Moving from 8 to 5 is "up" by 3. */
export function rankChange(previous: RankPosition | undefined, current: RankPosition): RankMovement {
  if (previous === undefined) return { direction: "none", delta: 0 };
  if (previous === null && current === null) return { direction: "none", delta: 0 };
  if (previous === null) return { direction: "new", delta: 0 };
  if (current === null) return { direction: "lost", delta: 0 };
  const delta = previous - current;
  return { direction: delta > 0 ? "up" : delta < 0 ? "down" : "same", delta };
}

export const RANK_BUCKETS: readonly RankBucket[] = ["top3", "top10", "top100", "unranked"];

/** 1 to 3, 4 to 10, 11 to 100, and everything else is unranked. */
export function rankBucket(position: RankPosition): RankBucket {
  if (position === null || !Number.isFinite(position) || position < 1) return "unranked";
  return position <= 3 ? "top3" : position <= 10 ? "top10" : position <= 100 ? "top100" : "unranked";
}

export type RankDistribution = Record<RankBucket, number> & { total: number };

/** How many keywords sit in each bucket. */
export function rankDistribution(positions: readonly RankPosition[]): RankDistribution {
  const out: RankDistribution = { top3: 0, top10: 0, top100: 0, unranked: 0, total: positions.length };
  for (const p of positions) out[rankBucket(p)] += 1;
  return out;
}

/** The best (lowest) position in a history, ignoring gaps. `null` when it never ranked. */
export function bestPosition(history: readonly RankPosition[]): RankPosition {
  const ranked = history.filter((p): p is number => p !== null);
  return ranked.length === 0 ? null : Math.min(...ranked);
}

/** Mean position of the ranked keywords. `null` when none ranks. */
export function averagePosition(positions: readonly RankPosition[]): number | null {
  const ranked = positions.filter((p): p is number => p !== null);
  return ranked.length === 0 ? null : ranked.reduce((a, b) => a + b, 0) / ranked.length;
}

/** Click share by position, from typical organic click curves. Beyond the first page it decays to a floor. */
const CTR_CURVE = [0.3, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];

export function ctrForPosition(position: RankPosition): number {
  if (position === null || position < 1) return 0;
  const p = Math.round(position);
  if (p <= 10) return CTR_CURVE[p - 1]!;
  return p <= 20 ? 0.008 : p <= 50 ? 0.002 : p <= 100 ? 0.0005 : 0;
}

export interface VisibilityInput {
  position: RankPosition;
  volume: number;
}

/**
 * Estimated share of the available search clicks a site captures: the sum of volume times the click share of the
 * position, over the same sum if every keyword ranked first. 0 to 1.
 */
export function visibilityShare(rows: readonly VisibilityInput[]): number {
  const best = rows.reduce((sum, r) => sum + r.volume * ctrForPosition(1), 0);
  if (best <= 0) return 0;
  return rows.reduce((sum, r) => sum + r.volume * ctrForPosition(r.position), 0) / best;
}

export interface MoverInput {
  id: string;
  position: RankPosition;
  previousPosition?: RankPosition;
}

/** The biggest gainers and losers by places moved, ties broken by id. Only keywords that ranked in both periods. */
export function topMovers<T extends MoverInput>(rows: readonly T[], limit = 3): { gainers: T[]; losers: T[] } {
  const moved = rows
    .map((r) => ({ r, delta: rankChange(r.previousPosition, r.position) }))
    .filter((x) => (x.delta.direction === "up" || x.delta.direction === "down") && x.delta.delta !== 0);
  const by = (a: (typeof moved)[number], b: (typeof moved)[number]) => Math.abs(b.delta.delta) - Math.abs(a.delta.delta) || a.r.id.localeCompare(b.r.id);
  return {
    gainers: moved.filter((x) => x.delta.delta > 0).sort(by).slice(0, limit).map((x) => x.r),
    losers: moved.filter((x) => x.delta.delta < 0).sort(by).slice(0, limit).map((x) => x.r),
  };
}

/** A keyword difficulty of 0 to 100 as a word band: easy under 30, medium under 60, hard from 60. */
export function difficultyBand(difficulty: number): "easy" | "medium" | "hard" {
  return difficulty < 30 ? "easy" : difficulty < 60 ? "medium" : "hard";
}

/** Splits pasted keywords on new lines and commas, trims, lowercases and drops blanks and duplicates. */
export function parseKeywordList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[\n,،;]+/)) {
    const k = raw.trim().replace(/\s+/g, " ").toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

export interface CompetitorStats {
  averagePosition: number | null;
  top10: number;
  visibility: number;
  /** Keywords where this domain ranks and `reference` does not, or ranks higher. */
  ahead: number;
}

/**
 * A domain's numbers over the tracked keywords: mean position of the ones it ranks for, how many are in the top 10,
 * the visibility share, and on how many keywords it beats `reference` (a domain that ranks nowhere is beaten by any rank).
 */
export function competitorStats(
  ranks: Readonly<Record<string, RankPosition>>,
  keywords: readonly { id: string; volume: number }[],
  reference?: Readonly<Record<string, RankPosition>>,
): CompetitorStats {
  const positions = keywords.map((k) => ranks[k.id] ?? null);
  let ahead = 0;
  if (reference) {
    for (const k of keywords) {
      const mine = ranks[k.id] ?? null;
      const theirs = reference[k.id] ?? null;
      if (mine !== null && (theirs === null || mine < theirs)) ahead += 1;
    }
  }
  return {
    averagePosition: averagePosition(positions),
    top10: positions.filter((p) => p !== null && p <= 10).length,
    visibility: visibilityShare(keywords.map((k) => ({ position: ranks[k.id] ?? null, volume: k.volume }))),
    ahead,
  };
}
