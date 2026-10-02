// Pure helpers for a 0-100 score and the reasons behind it (score-explainer-logic.ts of packages/web).

export type ScoreExplainerBand = "high" | "medium" | "low";

export interface ScoreExplainerDimensionLike {
  points: number;
  maxPoints?: number;
}

export function clampScore(score: number, max = 100): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(max, Math.max(0, score));
}

/** The band a score falls in: 70 % of the maximum or more is high, 40 % or more is medium. */
export function scoreExplainerBand(score: number, max = 100): ScoreExplainerBand {
  const share = max > 0 ? clampScore(score, max) / max : 0;
  return share >= 0.7 ? "high" : share >= 0.4 ? "medium" : "low";
}

/** Dimensions ordered by what they add, the biggest first. Ties keep their given order. */
export function sortScoreDimensions<T extends ScoreExplainerDimensionLike>(dimensions: readonly T[]): T[] {
  return dimensions.map((d, i) => ({ d, i })).sort((a, b) => b.d.points - a.d.points || a.i - b.i).map((x) => x.d);
}

export function sumScorePoints(dimensions: readonly ScoreExplainerDimensionLike[]): number {
  return dimensions.reduce((sum, d) => sum + d.points, 0);
}

/**
 * Points the score has that no listed dimension explains. A positive number is shown as "other factors" so the
 * reasons always add up to the score; a tiny rounding gap is ignored.
 */
export function scoreRemainder(score: number, dimensions: readonly ScoreExplainerDimensionLike[]): number {
  const gap = Math.round((score - sumScorePoints(dimensions)) * 10) / 10;
  return Math.abs(gap) < 0.5 ? 0 : gap;
}

/** How full a dimension's bar is, 0 to 1: its points over its own ceiling, or over the whole score when it has none. */
export function scoreDimensionFill(dimension: ScoreExplainerDimensionLike, max = 100): number {
  const ceiling = dimension.maxPoints && dimension.maxPoints > 0 ? dimension.maxPoints : max;
  return Math.min(1, Math.max(0, dimension.points / ceiling));
}
