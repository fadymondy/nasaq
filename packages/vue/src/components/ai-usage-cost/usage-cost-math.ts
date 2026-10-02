/** Pure helpers for AI usage and cost: totals, markup, token splits and shares. */

/** One day of spend. `billed` has been invoiced to the client, `unbilled` has not yet. Both are provider cost in money. */
export interface AiCostDay {
  /** Civil date "2026-09-29". */
  date: string;
  billed: number;
  unbilled: number;
}

export interface AiCostRow {
  id: string;
  /** Model, product or run name. */
  label: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  /** Cost in the previous period, for the change column. */
  previous?: number;
}

export interface AiCostTotals {
  billed: number;
  unbilled: number;
  total: number;
  /** Share of the total that is billed, 0 to 1. 0 when there is no spend. */
  billedShare: number;
}

export function costTotals(days: readonly Pick<AiCostDay, "billed" | "unbilled">[]): AiCostTotals {
  const billed = days.reduce((s, d) => s + d.billed, 0);
  const unbilled = days.reduce((s, d) => s + d.unbilled, 0);
  const total = billed + unbilled;
  return { billed, unbilled, total, billedShare: total > 0 ? billed / total : 0 };
}

/** What the client pays for a provider cost at a markup: 0.2 makes 100 into 120. Negative markups are treated as none. */
export function withMarkup(cost: number, markup: number): number {
  return cost * (1 + Math.max(0, markup));
}

export const totalTokens = (row: Pick<AiCostRow, "tokensIn" | "tokensOut">) => row.tokensIn + row.tokensOut;

export function sumTokens(rows: readonly Pick<AiCostRow, "tokensIn" | "tokensOut">[]): { tokensIn: number; tokensOut: number; total: number } {
  const tokensIn = rows.reduce((s, r) => s + r.tokensIn, 0);
  const tokensOut = rows.reduce((s, r) => s + r.tokensOut, 0);
  return { tokensIn, tokensOut, total: tokensIn + tokensOut };
}

/** Cost per million tokens for a row. 0 when no tokens were used. */
export function costPerMillion(row: Pick<AiCostRow, "tokensIn" | "tokensOut" | "cost">): number {
  const tokens = totalTokens(row);
  return tokens > 0 ? (row.cost / tokens) * 1_000_000 : 0;
}

export interface TokenSplit {
  /** Fractions of the whole, summing to 1 (or all 0 when nothing was used). */
  input: number;
  output: number;
  cached: number;
}

/** Splits a run's tokens into input (not cached), output and cached-input shares. `cached` counts within `tokensIn`. */
export function tokenSplit(tokensIn: number, tokensOut: number, cached = 0): TokenSplit {
  const c = Math.min(Math.max(0, cached), Math.max(0, tokensIn));
  const total = tokensIn + tokensOut;
  if (total <= 0) return { input: 0, output: 0, cached: 0 };
  return { input: (tokensIn - c) / total, output: tokensOut / total, cached: c / total };
}
