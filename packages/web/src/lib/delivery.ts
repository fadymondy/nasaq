/*
 * Shared pieces of the delivery kit (delivery-tracker, courier-card, dispatch-offer, route-stops, cash-collect).
 * Pure functions and types only: no React, no imports, so node tests can load it.
 * Money is integer minor units (piasters, agorot, cents) in one currency, ILS unless a caller says otherwise.
 */

export type DeliveryMoney = number;
export const DELIVERY_DEFAULT_CURRENCY = "ILS";

const LATIN = /[A-Za-z]/;
const factorCache = new Map<string, number>();

/** Minor units per major unit (100 for ILS and USD, 1 for JPY, 1000 for KWD). Unknown codes use 100. */
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
export function deliveryMoney(minor: DeliveryMoney, currency: string = DELIVERY_DEFAULT_CURRENCY, locale = "en"): string {
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

/* ------------------------------------------------------------------ order progress (delivery-tracker) */

export const DELIVERY_STEPS = ["placed", "assigned", "picked-up", "on-the-way", "delivered"] as const;
export type DeliveryStep = (typeof DELIVERY_STEPS)[number];
export type DeliveryTerminal = "cancelled" | "failed";
export type DeliveryOrderStatus = DeliveryStep | DeliveryTerminal;
export type DeliveryStepState = "done" | "current" | "upcoming" | "stopped";

export interface DeliveryProgressStep {
  key: DeliveryStep;
  state: DeliveryStepState;
}

export interface DeliveryProgress {
  steps: DeliveryProgressStep[];
  /** Index of the current step, or -1 when delivered or stopped. */
  current: number;
  /** 0 to 1 of the way from placed to delivered. */
  fraction: number;
  terminal?: DeliveryTerminal;
}

/**
 * The state of each of the five steps. A delivered order has every step done. A cancelled or failed order keeps
 * the steps it had reached as done (`reachedBefore` is the last of them, "placed" by default) and marks the next
 * one stopped, so the timeline shows where it ended rather than hiding the history.
 */
export function deliveryProgress(status: DeliveryOrderStatus, reachedBefore: DeliveryStep = "placed"): DeliveryProgress {
  if (status === "cancelled" || status === "failed") {
    const last = Math.max(0, DELIVERY_STEPS.indexOf(reachedBefore));
    const steps = DELIVERY_STEPS.map((key, i): DeliveryProgressStep => ({ key, state: i <= last ? "done" : i === last + 1 ? "stopped" : "upcoming" }));
    return { steps, current: -1, fraction: last / (DELIVERY_STEPS.length - 1), terminal: status };
  }
  const at = DELIVERY_STEPS.indexOf(status);
  const delivered = status === "delivered";
  const steps = DELIVERY_STEPS.map((key, i): DeliveryProgressStep => ({ key, state: delivered || i < at ? "done" : i === at ? "current" : "upcoming" }));
  return { steps, current: delivered ? -1 : at, fraction: at / (DELIVERY_STEPS.length - 1) };
}

/* ------------------------------------------------------------------ offers (dispatch-offer) */

/** Seconds left until `expiresAt` (ms since epoch), never below 0. */
export function offerSecondsLeft(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}

/** Fraction of the offer window still left, 0 to 1, for the ring. */
export function offerFraction(expiresAt: number, now: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, (expiresAt - now) / (totalSeconds * 1000)));
}

/** The ring turns to a warning in the last quarter of the window, and to danger in the last five seconds. */
export function offerTone(secondsLeft: number, totalSeconds: number): "primary" | "warning" | "danger" {
  if (secondsLeft <= 5) return "danger";
  return secondsLeft <= totalSeconds / 4 ? "warning" : "primary";
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

/* ------------------------------------------------------------------ cash on delivery (cash-collect) */

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
