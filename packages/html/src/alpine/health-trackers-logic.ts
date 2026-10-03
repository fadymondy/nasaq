// Pure helpers of the health trackers (cups, verdicts, item completeness), copied from health-trackers-logic.ts.

export type FoodVerdict = "safe" | "trigger" | "unreviewed";
export type FoodKind = "food" | "drink";
/** Who decided the verdict. `none` is shown, never hidden. */
export type FoodVerdictSource = "none" | "you" | "catalogue" | "clinician";

export const FOOD_VERDICTS: readonly FoodVerdict[] = ["safe", "trigger", "unreviewed"];

export type CupState = "filled" | "next" | "empty";

/** One cup's state in a row of `total`. Only the first empty cup can be logged. */
export function cupState(index: number, filled: number, total: number): CupState {
  if (index < filled) return "filled";
  return index === filled && filled < total ? "next" : "empty";
}

/** Clamps the numbers a server gave, so a bad snapshot never draws a negative or endless row. */
export function cupCounts(filled: number, total: number, max = 60): { filled: number; total: number } {
  const t = Math.min(max, Math.max(0, Math.floor(Number.isFinite(total) ? total : 0)));
  const f = Math.min(t, Math.max(0, Math.floor(Number.isFinite(filled) ? filled : 0)));
  return { filled: f, total: t };
}

export interface CatalogueEntry {
  verdict: FoodVerdict;
  kind: FoodKind;
  triggerFamilies?: readonly string[];
}

/** How many entries are in each verdict. */
export function verdictCounts(items: readonly { verdict: FoodVerdict }[]): Record<FoodVerdict, number> {
  const counts: Record<FoodVerdict, number> = { safe: 0, trigger: 0, unreviewed: 0 };
  for (const item of items) counts[item.verdict] += 1;
  return counts;
}

/** Tone for a verdict. Unreviewed stays neutral: an item nobody judged must never look safe. */
export function verdictTone(verdict: FoodVerdict): "success" | "danger" | "neutral" {
  return verdict === "safe" ? "success" : verdict === "trigger" ? "danger" : "neutral";
}

export interface FoodDraft {
  kind: FoodKind;
  name: string;
  nameAr?: string;
  verdict: FoodVerdict;
  triggerFamilies: readonly string[];
  note?: string;
}

export type FoodDraftStep = "name" | "nameAr" | "verdict" | "families" | "note";

/**
 * How complete a catalogue item is, as a fraction and the steps still missing. This measures the entry, never the
 * food: it says nothing about health. A "trigger" item needs at least one family; other verdicts do not.
 */
export function foodDraftCompleteness(draft: FoodDraft): { score: number; done: number; total: number; missing: FoodDraftStep[] } {
  const needsFamilies = draft.verdict === "trigger";
  const steps: [FoodDraftStep, boolean][] = [
    ["name", draft.name.trim().length > 0],
    ["nameAr", (draft.nameAr ?? "").trim().length > 0],
    ["verdict", draft.verdict !== "unreviewed"],
    ...(needsFamilies ? ([["families", draft.triggerFamilies.length > 0]] as [FoodDraftStep, boolean][]) : []),
    ["note", (draft.note ?? "").trim().length > 0],
  ];
  const missing = steps.filter(([, ok]) => !ok).map(([step]) => step);
  const total = steps.length;
  const done = total - missing.length;
  return { score: total === 0 ? 0 : done / total, done, total, missing };
}

/** A draft can be saved when it has a name, and a trigger has at least one family. */
export function foodDraftValid(draft: FoodDraft): boolean {
  if (!draft.name.trim()) return false;
  return draft.verdict !== "trigger" || draft.triggerFamilies.length > 0;
}
