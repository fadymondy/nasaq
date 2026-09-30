/*
 * Pure helpers for the vitals panel: body mass index, its category and progress towards a target. No React.
 * BMI is a rough screening figure. The categories are the standard adult cut-offs and say nothing about one body.
 */
import type { StatusTone } from "../status";

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** Adult cut-offs, in kg/m². The lower bound of each category. */
export const BMI_CUTOFFS = { normal: 18.5, overweight: 25, obese: 30 } as const;

/** Weight over height squared. `null` when either input is missing or not positive. */
export function computeBmi(weightKg: number | undefined, heightCm: number | undefined): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < BMI_CUTOFFS.normal) return "underweight";
  if (bmi < BMI_CUTOFFS.overweight) return "normal";
  if (bmi < BMI_CUTOFFS.obese) return "overweight";
  return "obese";
}

/** Tone for a category. Always shown next to the category's name and an icon, never alone. */
export function bmiTone(category: BmiCategory): StatusTone {
  return category === "normal" ? "success" : category === "obese" ? "danger" : "warning";
}

/** Progress towards a target, as the server reports it. */
export interface VitalTarget {
  current: number;
  target: number;
  /** 0 to 100. Clamped on read. */
  percent: number;
  onTarget: boolean;
}

export function clampPercent(percent: number): number {
  return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
}

/** Signed distance from the current value to the target; 0 when on target. */
export function distanceToTarget(target: Pick<VitalTarget, "current" | "target" | "onTarget">): number {
  return target.onTarget ? 0 : Math.round((target.target - target.current) * 10) / 10;
}
