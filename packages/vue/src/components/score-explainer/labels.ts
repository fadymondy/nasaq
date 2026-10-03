// Strings of the score explainer, English and Arabic (copied from the React STRINGS table).
import type { ScoreExplainerBand } from "./score-explainer-logic";

export const scoreExplainerStrings = {
  en: {
    score: "Score",
    outOf: (max: string) => `out of ${max}`,
    bands: { high: "High", medium: "Medium", low: "Low" } as Record<ScoreExplainerBand, string>,
    why: "Why this score",
    showWhy: "Show why",
    ariaBadge: (score: string, max: string, band: string) => `Score ${score} of ${max}, ${band}. Show why`,
    inferred: "Inferred",
    inferredHint: "Worked out by the model from other signals. No source states it directly.",
    sources: "Sources",
    matched: "Matched",
    points: (n: string, max: string) => `${n} of ${max} points`,
    pointsNoMax: (n: string) => `${n} points`,
    other: "Other factors",
    otherReason: "Points that no single signal above accounts for.",
    noDimensions: "No reasons were recorded for this score.",
    opensNewTab: "opens in a new tab",
    dimensionConfidence: "Confidence",
  },
  ar: {
    score: "الدرجة",
    outOf: (max: string) => `من ${max}`,
    bands: { high: "مرتفعة", medium: "متوسطة", low: "منخفضة" } as Record<ScoreExplainerBand, string>,
    why: "سبب هذه الدرجة",
    showWhy: "عرض السبب",
    ariaBadge: (score: string, max: string, band: string) => `الدرجة ${score} من ${max}، ${band}. عرض السبب`,
    inferred: "مستنتج",
    inferredHint: "استنتجه النموذج من إشارات أخرى. لا يذكره أي مصدر صراحةً.",
    sources: "المصادر",
    matched: "المطابق",
    points: (n: string, max: string) => `${n} من ${max} نقطة`,
    pointsNoMax: (n: string) => `${n} نقطة`,
    other: "عوامل أخرى",
    otherReason: "نقاط لا تفسرها إشارة واحدة من الإشارات أعلاه.",
    noDimensions: "لم تُسجَّل أسباب لهذه الدرجة.",
    opensNewTab: "يفتح في تبويب جديد",
    dimensionConfidence: "الثقة",
  },
};

export type ScoreExplainerLabels = (typeof scoreExplainerStrings)["en"];
/** Overrides: any string, and any single band word. */
export type ScoreExplainerLabelOverrides = Partial<Omit<ScoreExplainerLabels, "bands">> & { bands?: Partial<ScoreExplainerLabels["bands"]> };

/** The words for a locale with the host's overrides on top. */
export function scoreExplainerWords(locale: string, labels?: ScoreExplainerLabelOverrides): ScoreExplainerLabels {
  const base = scoreExplainerStrings[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...labels, bands: { ...base.bands, ...labels?.bands } } as ScoreExplainerLabels;
}
