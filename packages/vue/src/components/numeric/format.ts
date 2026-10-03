// Locale-aware figures and dates with a fixed digit set. Same functions as the React `numeric` module.

type Digits = "latn" | "arab";

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  /**
   * Digit set. Default "latn": Nasaq renders Western digits in Arabic UI too, so figures line up in
   * tables and match what users type and paste. Pass "arab" for editorial copy that wants ٠١٢٣.
   */
  numberingSystem?: Digits;
}

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  /** Same rule as numbers: "latn" by default. Plain `Intl.DateTimeFormat("ar")` gives ٢٩/٩/٢٠٢٦. */
  numberingSystem?: Digits;
}

// Intl.Locale overrides any existing -u-nu- extension instead of appending a second one.
const withDigits = (locale: string, numberingSystem: Digits) => new Intl.Locale(locale, { numberingSystem }).toString();

/** Latin letters: an ISO code or "US$" that must keep its own order inside an RTL figure. */
const LATIN = /[A-Za-z]/;

/**
 * Locale-aware formatting (grouping, decimal mark, percent/currency placement) with a fixed digit set.
 *
 * Arabic puts the currency after the figure ("48,210 US$"). A currency part with Latin letters is wrapped in
 * an LTR isolate (LRI…PDI), which works in plain strings as well as markup.
 */
export function formatNumber(value: number | bigint, locale: string, { numberingSystem = "latn", ...options }: FormatNumberOptions = {}) {
  const format = new Intl.NumberFormat(withDigits(locale, numberingSystem), options);
  if (options.style !== "currency") return format.format(value);
  return format
    .formatToParts(value)
    .map((part) => (part.type === "currency" && LATIN.test(part.value) ? `⁦${part.value}⁩` : part.value))
    .join("");
}

export type DateInput = Date | number | string;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));
const orMedium = (options: Intl.DateTimeFormatOptions) => (Object.keys(options).length ? options : { dateStyle: "medium" as const });

/** Locale-aware date/time with the Nasaq digit set. Defaults to `{ dateStyle: "medium" }`. */
export function formatDate(value: DateInput, locale: string, { numberingSystem = "latn", ...options }: FormatDateOptions = {}) {
  return new Intl.DateTimeFormat(withDigits(locale, numberingSystem), orMedium(options)).format(toDate(value));
}

/** "Sep 1 – 29, 2026" / "1–29 سبتمبر 2026": shared parts are written once. */
export function formatDateRange(start: DateInput, end: DateInput, locale: string, { numberingSystem = "latn", ...options }: FormatDateOptions = {}) {
  return new Intl.DateTimeFormat(withDigits(locale, numberingSystem), orMedium(options)).formatRange(toDate(start), toDate(end));
}

export interface FormatRelativeTimeOptions extends Intl.RelativeTimeFormatOptions {
  /** Defaults to the current time. */
  now?: DateInput;
  numberingSystem?: Digits;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "3 hours ago" / "قبل 3 ساعات", in the largest unit that fits. */
export function formatRelativeTime(value: DateInput, locale: string, { now = Date.now(), numberingSystem = "latn", ...options }: FormatRelativeTimeOptions = {}) {
  const seconds = (toDate(value).getTime() - toDate(now).getTime()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(withDigits(locale, numberingSystem), { numeric: "auto", ...options }).format(Math.round(seconds / size), unit);
}
