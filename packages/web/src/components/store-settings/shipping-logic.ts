/*
 * Shipping zones, rates and local pickup, resolved to the options a customer can choose.
 * Pure: no React, no runtime imports. Money is integer minor units, weight is grams.
 */
import { type CommerceMoney, type CommerceRateResult, type CommerceShippingMethod, type CommerceShippingRate, type CommerceShippingRateType, type CommerceShippingTier, type CommerceShippingZone, commerceRateFor, commerceTierFor } from "../../lib/commerce";

/* The zone, rate and tier shapes live in the shared model (lib/commerce.ts) so the cart and checkout can read the same zones. */
export type ShippingRateType = CommerceShippingRateType;
export type ShippingTier = CommerceShippingTier;
export type ShippingRate = CommerceShippingRate;
export type ShippingZone = CommerceShippingZone;

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  country: string;
  city?: string;
  /** Fee for picking up. Usually 0. */
  fee?: CommerceMoney;
  /** Hours until the order is ready. */
  readyInHours?: number;
  active?: boolean;
}

export interface ShippingDestination {
  country: string;
  city?: string;
}

export interface ShippingCart {
  /** Goods total after discounts, before shipping. */
  subtotal: CommerceMoney;
  weightGrams: number;
}

export interface ShippingOption {
  id: string;
  label: string;
  amount: CommerceMoney;
  kind: "delivery" | "express" | "pickup";
  free: boolean;
  etaDays?: [number, number];
  zoneId?: string;
  rateType?: ShippingRateType;
  /** Pickup: where. */
  address?: string;
}

export type RateUnavailable = "inactive" | "no-tier" | "below-threshold";

export type RateResult = CommerceRateResult;

const norm = (s: string) => s.trim().toLowerCase();
const upper = (s: string) => s.trim().toUpperCase();

/** Which zone serves a destination: a city match beats a country match beats "*". The first zone wins a tie. */
export function zoneFor(zones: readonly ShippingZone[], to: ShippingDestination): ShippingZone | undefined {
  const country = upper(to.country);
  const city = to.city ? norm(to.city) : "";
  let best: { zone: ShippingZone; score: number } | undefined;
  for (const zone of zones) {
    const codes = zone.countries.map(upper);
    const inCountry = codes.includes(country);
    const rest = codes.includes("*");
    if (!inCountry && !rest) continue;
    const cities = zone.cities?.map(norm).filter(Boolean) ?? [];
    if (cities.length > 0 && !(inCountry && city && cities.includes(city))) continue;
    const score = cities.length > 0 ? 3 : inCountry ? 2 : 1;
    if (!best || score > best.score) best = { zone, score };
  }
  return best?.zone;
}

/** Finds the band for a value. Promoted to the shared model as `commerceTierFor`. */
export const tierFor = commerceTierFor;

/** The price of one rate for a cart, or why it is not offered. Promoted to the shared model as `commerceRateFor`. */
export const rateFor = commerceRateFor;

/**
 * The options a customer sees for a destination and cart: the matching zone's rates, then pickup points in the
 * same country (and city, when the point names one). Cheapest first; the faster one first on a tie.
 * No zone means no delivery, but pickup can still be offered.
 */
export function resolveShippingOptions(zones: readonly ShippingZone[], pickups: readonly PickupLocation[], to: ShippingDestination, cart: ShippingCart): { zone: ShippingZone | undefined; options: ShippingOption[]; hidden: { rateId: string; reason: RateUnavailable; remaining?: CommerceMoney }[] } {
  const zone = zoneFor(zones, to);
  const options: ShippingOption[] = [];
  const hidden: { rateId: string; reason: RateUnavailable; remaining?: CommerceMoney }[] = [];
  for (const rate of zone?.rates ?? []) {
    const r = rateFor(rate, cart);
    if (!r.available) {
      hidden.push({ rateId: rate.id, reason: r.reason, ...(r.remaining !== undefined ? { remaining: r.remaining } : {}) });
      continue;
    }
    options.push({ id: rate.id, label: rate.label, amount: r.amount, kind: rate.express ? "express" : "delivery", free: r.free, ...(rate.etaDays ? { etaDays: rate.etaDays } : {}), zoneId: zone?.id, rateType: rate.type });
  }
  const country = upper(to.country);
  const city = to.city ? norm(to.city) : "";
  for (const p of pickups) {
    if (p.active === false || upper(p.country) !== country) continue;
    if (p.city && norm(p.city) !== city) continue;
    const fee = p.fee ?? 0;
    options.push({ id: p.id, label: p.name, amount: fee, kind: "pickup", free: fee === 0, address: p.address, ...(p.readyInHours !== undefined ? { etaDays: [0, Math.ceil(p.readyInHours / 24)] as [number, number] } : {}) });
  }
  options.sort((a, b) => a.amount - b.amount || (a.etaDays?.[1] ?? 99) - (b.etaDays?.[1] ?? 99));
  return { zone, options, hidden };
}

/** The cheapest delivery option (pickup excluded), or undefined. */
export function cheapestDelivery(options: readonly ShippingOption[]): ShippingOption | undefined {
  return options.filter((o) => o.kind !== "pickup").sort((a, b) => a.amount - b.amount)[0];
}

/** Converts options to the shared checkout shape. */
export function toCommerceShippingMethods(options: readonly ShippingOption[]): CommerceShippingMethod[] {
  return options.map((o) => ({ id: o.id, label: o.label, price: o.amount, kind: o.kind, ...(o.etaDays ? { etaDays: o.etaDays } : {}) }));
}

export type TierIssue = "overlap" | "gap" | "min-after-max" | "negative" | "no-tiers" | "not-open-ended";

/** Problems in a weight or price table: overlaps, gaps, and a last band that stops short. */
export function tierIssues(tiers: readonly ShippingTier[]): TierIssue[] {
  const issues = new Set<TierIssue>();
  if (tiers.length === 0) return ["no-tiers"];
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  for (const t of sorted) {
    if (t.min < 0 || t.amount < 0) issues.add("negative");
    if (t.max !== undefined && t.max <= t.min) issues.add("min-after-max");
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1] as ShippingTier;
    const cur = sorted[i] as ShippingTier;
    if (prev.max === undefined || prev.max > cur.min) issues.add("overlap");
    else if (prev.max < cur.min) issues.add("gap");
  }
  if (sorted[sorted.length - 1]?.max !== undefined) issues.add("not-open-ended");
  return [...issues];
}

/** Country codes covered by two zones at once (the first zone wins in checkout; this warns the merchant). */
export function overlappingCountries(zones: readonly ShippingZone[]): string[] {
  const seen = new Map<string, number>();
  for (const z of zones) {
    if (z.cities && z.cities.length > 0) continue;
    for (const c of new Set(z.countries.map(upper))) seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([c]) => c);
}
