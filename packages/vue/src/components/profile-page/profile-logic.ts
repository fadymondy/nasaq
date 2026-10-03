import { formatDateRange, formatNumber } from "../numeric";
import { fill, type ProfilePageLabels } from "./strings";

export function tenureLabel(tenure: { years: number; months: number }, t: ProfilePageLabels, locale: string): string {
  const parts: string[] = [];
  if (tenure.years) parts.push(fill(t.yearsShort, { n: formatNumber(tenure.years, locale) }));
  if (tenure.months || !parts.length) parts.push(fill(t.monthsShort, { n: formatNumber(tenure.months, locale) }));
  return parts.join(" ");
}

/** "Mar 2021 – Jun 2023", or "Mar 2021 – Present" for a current role. */
export function periodLabel(start: string, end: string | null | undefined, now: Date | number | undefined, t: ProfilePageLabels, locale: string): string {
  const text = formatDateRange(start, end ?? now ?? Date.now(), locale, { month: "short", year: "numeric" });
  return end ? text : text.replace(/[^–-]+$/, ` ${t.present}`);
}

/** The label of a social link in the identity column. */
export function linkText(l: { kind: string; label: string; href: string; handle?: string }): string {
  if (l.handle) return l.handle;
  if (l.kind === "email") return l.href.replace(/^mailto:/i, "");
  if (l.kind === "website") return l.href.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return l.label;
}
