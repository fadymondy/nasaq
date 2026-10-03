// Pure helpers of the FinOps cost page, the same rules as the React finops-format.ts.

export type LineItemPeriod = "monthly" | "yearly" | "once";

/** Rounds to cents so summed floats do not show `0.30000000000000004`. */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/** What the item costs per month: a yearly one over twelve, a one-off counts nothing. */
export function monthlyEquivalent(item: { amount: number; period: LineItemPeriod }): number {
  if (item.period === "monthly") return item.amount;
  if (item.period === "yearly") return item.amount / 12;
  return 0;
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

export type LineItemProblem = "name" | "amount";

/** Checks the add form. */
export function validateLineItem(draft: { name: string; amount: string }): { ok: true; amount: number } | { ok: false; problems: LineItemProblem[] } {
  const problems: LineItemProblem[] = [];
  if (!draft.name.trim()) problems.push("name");
  const amount = parseAmount(draft.amount);
  if (amount === null || amount <= 0) problems.push("amount");
  return problems.length || amount === null ? { ok: false, problems } : { ok: true, amount };
}
