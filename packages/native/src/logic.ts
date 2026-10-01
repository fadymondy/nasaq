/*
 * Pure helpers behind the native components: no React, no react-native, so node tests can load them.
 * Delivery maths (money, offers, cash, routes) is shared with the web kit from packages/web/src/lib/delivery.ts.
 */
export {
  cashBreakdown,
  DELIVERY_DEFAULT_CURRENCY,
  deliveryCurrency,
  deliveryDistance,
  deliveryDuration,
  deliveryMinorFactor,
  deliveryMoney,
  deliveryProgress,
  offerFraction,
  offerSecondsLeft,
  offerTone,
  routeSummary,
} from "../../web/src/lib/delivery";
export type { CashBreakdown, CashState, StopKind, StopStatus } from "../../web/src/lib/delivery";

import { DELIVERY_DEFAULT_CURRENCY, deliveryMinorFactor } from "../../web/src/lib/delivery";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** A 6-digit token colour with an alpha channel ("#RRGGBB" + 0 to 1), for soft tints of a tone. */
export function alpha(hex: string, opacity: number): string {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  const base = hex.length === 9 ? hex.slice(0, 7) : hex;
  return `${base}${a.toString(16).padStart(2, "0")}`;
}

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Latin digits to Arabic-Indic (٠-٩), leaving everything else alone. */
export function toArabicIndic(text: string): string {
  return text.replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

/** Arabic-Indic and Persian digits to Latin, so a keyboard in either script parses the same. */
export function toLatinDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d))).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Tone of a signed amount: positive success, negative danger, zero neutral. */
export function signTone(minor: number): "success" | "danger" | "neutral" {
  return minor > 0 ? "success" : minor < 0 ? "danger" : "neutral";
}

/** Keeps only digits (any script) and cuts to `length`: the value a PIN box holds. */
export function sanitizePin(text: string, length: number): string {
  return toLatinDigits(text).replace(/\D/g, "").slice(0, Math.max(0, length));
}

/**
 * Parses what a courier types into the cash field ("12", "12.5", "12,50", Arabic digits) to minor units.
 * Returns null for empty or unreadable text. Rounds to the currency's minor unit.
 */
export function parseAmountMinor(text: string, currency = DELIVERY_DEFAULT_CURRENCY): number | null {
  const clean = toLatinDigits(text).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "");
  if (!clean) return null;
  const [whole = "", ...rest] = clean.split(".");
  const n = Number(rest.length ? `${whole || "0"}.${rest.join("")}` : whole);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * deliveryMinorFactor(currency));
}

/** Minor units as the plain editable text for the cash field ("12.5"), without symbol or grouping. */
export function formatAmountInput(minor: number | null, currency = DELIVERY_DEFAULT_CURRENCY): string {
  if (minor == null) return "";
  const factor = deliveryMinorFactor(currency);
  const digits = Math.round(Math.log10(factor));
  return String(Number((minor / factor).toFixed(digits)));
}

/** Index of the next PIN box to focus after `value` has been typed. */
export function pinFocusIndex(value: string, length: number): number {
  return Math.min(value.length, Math.max(0, length - 1));
}

/** Where a step sits relative to `current`: done before it, current at it, upcoming after. */
export function stepState(index: number, current: number): "done" | "current" | "upcoming" {
  return index < current ? "done" : index === current ? "current" : "upcoming";
}

/** Whole seconds as "m:ss" for countdown labels. */
export function clockLabel(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Countdown tone: danger at 10 seconds or fewer (the app's rule), warning in the last quarter, else primary. */
export function countdownTone(secondsLeft: number, total: number): "primary" | "warning" | "danger" {
  if (secondsLeft <= 10) return "danger";
  return secondsLeft <= total / 4 ? "warning" : "primary";
}

export type SchemePreference = "system" | "light" | "dark";

/** A stored value to a scheme preference; anything unknown (or missing) is "system". */
export function parseSchemePreference(raw: unknown): SchemePreference {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** The `scheme` prop for NasaqProvider: undefined follows the OS, so "system" maps to undefined. */
export function schemeFromPreference(preference: SchemePreference): "light" | "dark" | undefined {
  return preference === "system" ? undefined : preference;
}

/** What a delivery customer pays, and what the courier collects in cash: order total plus the delivery fee (minor units). */
export function offerAmountDue(orderTotalMinor: number, feeMinor: number): number {
  return Math.max(0, Math.round(orderTotalMinor)) + Math.max(0, Math.round(feeMinor));
}

/** The text in a count badge: "" for zero or less, the number up to `max`, then "99+". Arabic-Indic digits when asked. */
export function badgeCountLabel(count: number, max = 99, arabicIndic = false): string {
  if (!(count > 0)) return "";
  const text = count > max ? `${max}+` : String(Math.floor(count));
  return arabicIndic ? toArabicIndic(text) : text;
}
