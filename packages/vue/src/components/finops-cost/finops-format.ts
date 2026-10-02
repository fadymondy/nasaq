/** Pure helpers for the FinOps cost page: rightsizing hints, monthly equivalents, totals and input checks. No React here. */

export interface PlanOption {
  name: string;
  monthlyPrice: number;
}

export interface ServerUsage {
  /** Average over the period, 0 to 100. */
  cpu: number;
  memory: number;
  disk: number;
}

export type Rightsize =
  | { kind: "ok" }
  | { kind: "downsize"; savings: number; plan?: PlanOption }
  | { kind: "upsize"; extra: number; plan?: PlanOption };

export const RIGHTSIZE_LOW = 25;
export const RIGHTSIZE_HIGH = 85;

/**
 * Downsize when both CPU and memory stay low; upsize when either CPU or memory runs hot. Disk alone never triggers a
 * downsize (disks do not shrink) but a full disk asks for a bigger plan.
 */
export function rightsize(usage: ServerUsage, monthlyPrice: number, smaller?: PlanOption, larger?: PlanOption): Rightsize {
  if (usage.cpu >= RIGHTSIZE_HIGH || usage.memory >= RIGHTSIZE_HIGH || usage.disk >= 90) {
    return { kind: "upsize", extra: larger ? Math.max(0, larger.monthlyPrice - monthlyPrice) : 0, plan: larger };
  }
  if (usage.cpu < RIGHTSIZE_LOW && usage.memory < RIGHTSIZE_LOW) {
    return { kind: "downsize", savings: smaller ? Math.max(0, monthlyPrice - smaller.monthlyPrice) : 0, plan: smaller };
  }
  return { kind: "ok" };
}

export type LineItemPeriod = "monthly" | "yearly" | "once";

export interface CostLineItem {
  amount: number;
  period: LineItemPeriod;
}

/** What the item costs per month: a yearly one over twelve, a one-off counts nothing towards the monthly run rate. */
export function monthlyEquivalent(item: CostLineItem): number {
  if (item.period === "monthly") return item.amount;
  if (item.period === "yearly") return item.amount / 12;
  return 0;
}

export const sumBy = <T,>(list: readonly T[], pick: (item: T) => number): number => list.reduce((sum, item) => sum + pick(item), 0);

/** Rounds to cents so summed floats do not show `0.30000000000000004`. */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export interface Totals {
  servers: number;
  items: number;
  total: number;
}

export function finopsTotals(servers: readonly { monthlyPrice: number }[], items: readonly CostLineItem[]): Totals {
  const s = roundMoney(sumBy(servers, (x) => x.monthlyPrice));
  const i = roundMoney(sumBy(items, monthlyEquivalent));
  return { servers: s, items: i, total: roundMoney(s + i) };
}

export type BudgetState = "none" | "under" | "near" | "over";

/** `near` from 90% of the budget. */
export function budgetState(total: number, budget: number | undefined): BudgetState {
  if (budget === undefined || budget <= 0) return "none";
  if (total > budget) return "over";
  return total >= budget * 0.9 ? "near" : "under";
}

export type LineItemProblem = "name" | "amount";

export interface LineItemDraft {
  name: string;
  amount: string;
}

/** Checks the add form. The amount is typed with Latin or Arabic-Indic digits. */
export function validateLineItem(draft: LineItemDraft): { ok: true; amount: number } | { ok: false; problems: LineItemProblem[] } {
  const problems: LineItemProblem[] = [];
  if (!draft.name.trim()) problems.push("name");
  const amount = parseAmount(draft.amount);
  if (amount === null || amount <= 0) problems.push("amount");
  return problems.length || amount === null ? { ok: false, problems } : { ok: true, amount };
}

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** `1,250.50`, `1250,5` and `١٢٥٠` all parse; anything else is null. */
export function parseAmount(text: string): number | null {
  const latin = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
  if (!latin) return null;
  const cleaned = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(latin) ? latin.replace(/,/g, "") : latin.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
