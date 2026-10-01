/** Pure helpers for WeightedCriteriaCard. No React, so they can be tested and reused on the server. */

export type CriterionWeight = "low" | "medium" | "high";

export interface WeightedCriterion {
  id: string;
  label: string;
  description?: string;
  weight: CriterionWeight;
  enabled: boolean;
  /** Added by the person, not suggested. Only custom criteria can be removed. */
  custom?: boolean;
}

export const CRITERION_WEIGHTS: readonly CriterionWeight[] = ["low", "medium", "high"];

const POINTS: Record<CriterionWeight, number> = { low: 1, medium: 2, high: 3 };

/** low → medium → high → low. */
export function cycleWeight(weight: CriterionWeight): CriterionWeight {
  return CRITERION_WEIGHTS[(CRITERION_WEIGHTS.indexOf(weight) + 1) % CRITERION_WEIGHTS.length] as CriterionWeight;
}

/**
 * The share of each enabled criterion in the decision, as a fraction that sums to 1: low counts 1, medium 2, high 3.
 * Disabled criteria get 0. Returns an empty map when nothing is enabled.
 */
export function criteriaShares(criteria: readonly WeightedCriterion[]): Map<string, number> {
  const on = criteria.filter((c) => c.enabled);
  const total = on.reduce((sum, c) => sum + POINTS[c.weight], 0);
  const out = new Map<string, number>();
  if (total === 0) return out;
  for (const c of criteria) out.set(c.id, c.enabled ? POINTS[c.weight] / total : 0);
  return out;
}

/** Adds a custom criterion from free text. Ignores blank text and a label that is already in the list (any case). */
export function addCriterion(criteria: readonly WeightedCriterion[], label: string, id: string): WeightedCriterion[] {
  const clean = label.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) return [...criteria];
  const key = clean.toLocaleLowerCase();
  if (criteria.some((c) => c.label.toLocaleLowerCase() === key)) return [...criteria];
  return [...criteria, { id, label: clean, weight: "medium", enabled: true, custom: true }];
}
