/**
 * Core Web Vitals thresholds and ratings, from Google's published guidance (https://web.dev/articles/vitals).
 * A value is judged at the 75th percentile of page loads. "Good" is at or below the good threshold, "poor" is above
 * the poor threshold, and everything between is "needs improvement".
 */
export type WebVitalId = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type VitalRating = "good" | "needs-improvement" | "poor";

export interface VitalThreshold {
  /** At or below this is good. */
  good: number;
  /** Above this is poor. */
  poor: number;
  /** Unit of the raw value: milliseconds, or a unitless layout-shift score. */
  unit: "ms" | "score";
  /** One of the three Core Web Vitals (LCP, INP, CLS), the ones Google uses for page experience. */
  core: boolean;
}

export const VITAL_THRESHOLDS: Record<WebVitalId, VitalThreshold> = {
  LCP: { good: 2500, poor: 4000, unit: "ms", core: true },
  INP: { good: 200, poor: 500, unit: "ms", core: true },
  CLS: { good: 0.1, poor: 0.25, unit: "score", core: true },
  FCP: { good: 1800, poor: 3000, unit: "ms", core: false },
  TTFB: { good: 800, poor: 1800, unit: "ms", core: false },
};

export const WEB_VITAL_IDS: readonly WebVitalId[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];

/** Good at or below the good threshold, poor above the poor threshold, otherwise needs improvement. */
export function rateVital(metric: WebVitalId, value: number): VitalRating {
  const t = VITAL_THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

/** The gauge's full scale: 1.5 times the poor threshold, so the poor band has room. */
export function vitalScaleMax(metric: WebVitalId): number {
  return VITAL_THRESHOLDS[metric].poor * 1.5;
}

/** Position on the gauge as 0 to 1, clamped. */
export function gaugeFraction(metric: WebVitalId, value: number): number {
  const max = vitalScaleMax(metric);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, value / max);
}

/** The bands of the gauge as fractions of the scale: good ends at `good`, needs improvement at `poor`, poor at 1. */
export function vitalBands(metric: WebVitalId): { good: number; poor: number } {
  const max = vitalScaleMax(metric);
  const t = VITAL_THRESHOLDS[metric];
  return { good: t.good / max, poor: t.poor / max };
}

/** How to show a raw value: LCP and FCP in seconds, INP and TTFB in milliseconds, CLS as a plain score. */
export function vitalDisplay(metric: WebVitalId, value: number): { value: number; unit: "s" | "ms" | "" ; fractionDigits: number } {
  if (metric === "CLS") return { value, unit: "", fractionDigits: 2 };
  if (metric === "LCP" || metric === "FCP") return { value: value / 1000, unit: "s", fractionDigits: 2 };
  return { value: Math.round(value), unit: "ms", fractionDigits: 0 };
}

/** A share of page loads in each rating. Values are counts or fractions; they are normalised to fractions summing to 1. */
export interface VitalDistribution {
  good: number;
  needsImprovement: number;
  poor: number;
}

export function normalizeDistribution(d: VitalDistribution): VitalDistribution {
  const good = Math.max(0, d.good);
  const needsImprovement = Math.max(0, d.needsImprovement);
  const poor = Math.max(0, d.poor);
  const total = good + needsImprovement + poor;
  if (total === 0) return { good: 0, needsImprovement: 0, poor: 0 };
  return { good: good / total, needsImprovement: needsImprovement / total, poor: poor / total };
}

/** A page passes Core Web Vitals when LCP, INP and CLS at the 75th percentile are all good. Missing metrics do not pass. */
export function passesCoreWebVitals(p75: Partial<Record<WebVitalId, number>>): boolean {
  return (["LCP", "INP", "CLS"] as const).every((id) => {
    const v = p75[id];
    return v !== undefined && rateVital(id, v) === "good";
  });
}

/** The worst rating among the given values, for a page-level summary. */
export function worstRating(ratings: readonly VitalRating[]): VitalRating {
  if (ratings.includes("poor")) return "poor";
  if (ratings.includes("needs-improvement")) return "needs-improvement";
  return "good";
}
