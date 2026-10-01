// Copy of the pure helpers in packages/web/src/lib/delivery.ts that courier-card and route-stops use.
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

/** "850 m" under a kilometre, "1.2 km" above. Arabic uses م and كم. Latin digits. */
export function deliveryDistance(meters: number, locale = "en"): string {
  const ar = locale.startsWith("ar");
  const nf = (v: number, max: number) => new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en", { maximumFractionDigits: max }).format(v);
  const m = Math.max(0, meters);
  if (m < 1000) return `${nf(Math.round(m), 0)} ${ar ? "م" : "m"}`;
  return `${nf(m / 1000, m < 10000 ? 1 : 0)} ${ar ? "كم" : "km"}`;
}

/** "12 min" or "1 h 5 min" from seconds, rounded up to a whole minute. Arabic uses د and س. */
export function deliveryDuration(seconds: number, locale = "en"): string {
  const ar = locale.startsWith("ar");
  const nf = new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en");
  const total = Math.max(1, Math.ceil(Math.max(0, seconds) / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hu = ar ? "س" : "h";
  const mu = ar ? "د" : "min";
  if (h === 0) return `${nf.format(m)} ${mu}`;
  return m === 0 ? `${nf.format(h)} ${hu}` : `${nf.format(h)} ${hu} ${nf.format(m)} ${mu}`;
}

/* ------------------------------------------------------------------ trips (route-stops) */

export type StopKind = "pickup" | "dropoff";
export type StopStatus = "done" | "pending" | "failed" | "skipped";

export interface StopLike {
  id: string;
  kind: StopKind;
  status?: StopStatus;
  /** Cash to collect at this stop, in minor units. Only drop-offs normally carry one. */
  cashMinor?: DeliveryMoney;
}

export interface RouteSummary {
  total: number;
  done: number;
  /** Id of the first stop that is still pending, the one the courier drives to next. */
  currentId: string | undefined;
  /** Cash still to collect at pending stops. */
  cashPendingMinor: DeliveryMoney;
  /** Cash for stops already done. */
  cashCollectedMinor: DeliveryMoney;
}

export function routeSummary(stops: readonly StopLike[]): RouteSummary {
  let done = 0;
  let currentId: string | undefined;
  let pending = 0;
  let collected = 0;
  for (const s of stops) {
    const status = s.status ?? "pending";
    if (status === "done") {
      done += 1;
      collected += s.cashMinor ?? 0;
    } else if (status === "pending") {
      currentId ??= s.id;
      pending += s.cashMinor ?? 0;
    }
  }
  return { total: stops.length, done, currentId, cashPendingMinor: pending, cashCollectedMinor: collected };
}
