// Copy of packages/html/src/core/money.ts (kept in sync by test/sync.test.ts).
// Money: the same rule as the React kit. Defaults to USD, or SAR when the locale is Arabic. Never a shekel.

/** USD, or SAR for Arabic locales. */
export function defaultCurrency(locale = "en"): string {
  return /^ar\b/i.test(locale) ? "SAR" : "USD";
}

export interface MoneyOptions {
  /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** BCP 47 locale; defaults to "en". */
  locale?: string;
  /** Show the amount without decimals when it is whole. */
  compact?: boolean;
}

/** Formats an amount with Intl, using Latin digits in Arabic so prices stay scannable. */
export function formatMoney(amount: number, options: MoneyOptions = {}): string {
  const locale = options.locale ?? "en";
  const currency = options.currency ?? defaultCurrency(locale);
  const whole = options.compact && Number.isInteger(amount);
  const digits = whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {};
  try {
    return new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "currency", currency: currency.toUpperCase(), ...digits }).format(amount);
  } catch {
    // unknown currency code or locale: fall back rather than throw inside a template
    return new Intl.NumberFormat("en", { style: "currency", currency: "USD", ...digits }).format(amount);
  }
}
