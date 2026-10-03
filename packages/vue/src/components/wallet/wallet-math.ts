/* Pure helpers for the wallet: reading typed amounts, checking them, and grouping transactions by day. */

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/**
 * Reads what people type into an amount field: "1,250.50", "١٢٥٠٫٥", "1250,5" (comma as the decimal mark when it
 * is the only separator and is followed by one or two digits). Returns null when it is not a positive number.
 */
export function parseAmount(input: string): number | null {
  let text = input
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf))
    .replace("٫", ".")
    .replace("٬", ",")
    .replace(/[\s ]/g, "");
  if (!text) return null;
  if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(",", ".");
  else text = text.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Math.round(Number(text) * 100) / 100;
  return value > 0 ? value : null;
}

export type AmountProblem = "invalid" | "min" | "max" | null;

/** Checks a parsed amount against optional limits. */
export function checkAmount(value: number | null, { min = 0.01, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {}): AmountProblem {
  if (value === null) return "invalid";
  if (value < min) return "min";
  if (value > max) return "max";
  return null;
}

export interface Dated {
  date: Date | number | string;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Groups items by local calendar day, newest day first and newest item first inside a day. */
export function groupByDay<T extends Dated>(items: readonly T[]): { key: string; date: Date; items: T[] }[] {
  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const groups: { key: string; date: Date; items: T[] }[] = [];
  for (const item of sorted) {
    const date = new Date(item.date);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, date, items: [item] });
  }
  return groups;
}
