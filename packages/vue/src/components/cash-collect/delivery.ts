// Copy of the pure helpers in packages/web/src/lib/delivery.ts that cash-collect uses.
// Kept inside the component folder (no shared lib/delivery yet); not re-exported from the index.
export type DeliveryMoney = number;
export const DELIVERY_DEFAULT_CURRENCY = "USD";

/** The currency when a caller sets none: Saudi riyal in Arabic, US dollar otherwise. */
export function deliveryCurrency(locale = "en"): string {
  return locale.startsWith("ar") ? "SAR" : DELIVERY_DEFAULT_CURRENCY;
}

const LATIN = /[A-Za-z]/;
const factorCache = new Map<string, number>();

/** Minor units per major unit (100 for USD and SAR, 1 for JPY, 1000 for KWD). Unknown codes use 100. */
export function deliveryMinorFactor(currency: string): number {
  const code = currency.toUpperCase();
  const known = factorCache.get(code);
  if (known !== undefined) return known;
  let factor = 100;
  try {
    factor = 10 ** (new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2);
  } catch {
    factor = 100;
  }
  factorCache.set(code, factor);
  return factor;
}

/**
 * Formats an amount in minor units for display, with Latin digits. A Latin currency code or symbol is isolated
 * (LRI...PDI) so it keeps its place beside Arabic text. Display only: never do arithmetic on the result.
 */
export function deliveryMoney(minor: DeliveryMoney, currency: string | undefined = undefined, locale = "en"): string {
  currency ??= deliveryCurrency(locale);
  const factor = deliveryMinorFactor(currency);
  const lang = locale.startsWith("ar") ? "ar-u-nu-latn" : `${locale}-u-nu-latn`;
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(lang, { style: "currency", currency: currency.toUpperCase() });
  } catch {
    format = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });
  }
  return format
    .formatToParts(minor / factor)
    .map((part) => (part.type === "currency" && LATIN.test(part.value) ? `⁦${part.value}⁩` : part.value))
    .join("");
}

export type CashState = "unpaid" | "short" | "exact" | "over";

export interface CashBreakdown {
  /** Order total plus delivery fee, minus anything already paid online. Never negative. */
  due: DeliveryMoney;
  collected: DeliveryMoney;
  /** Still owed: due minus collected, never negative. */
  shortBy: DeliveryMoney;
  /** Collected above what is due: the change to hand back. */
  change: DeliveryMoney;
  state: CashState;
}

export interface CashInput {
  orderTotal: DeliveryMoney;
  deliveryFee: DeliveryMoney;
  /** Already paid online or from the wallet, taken off the due amount. */
  prepaid?: DeliveryMoney;
  collected?: DeliveryMoney | null;
}

export function cashBreakdown({ orderTotal, deliveryFee, prepaid = 0, collected }: CashInput): CashBreakdown {
  const due = Math.max(0, Math.round(orderTotal) + Math.round(deliveryFee) - Math.round(prepaid));
  const got = Math.max(0, Math.round(collected ?? 0));
  const state: CashState = collected == null || got === 0 ? (due === 0 ? "exact" : "unpaid") : got < due ? "short" : got === due ? "exact" : "over";
  return { due, collected: got, shortBy: Math.max(0, due - got), change: Math.max(0, got - due), state };
}
