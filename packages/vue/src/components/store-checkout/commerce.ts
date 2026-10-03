// Copy of the pieces of packages/web/src/lib/commerce.ts that the checkout uses (address, cart line, shipping method, order,
// totals with the COD and gift-wrap fees, delivery window). Kept inside the component folder; not re-exported. Money is integer minor units.
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "../store-order-timeline/order-labels";

export type CommerceMoney = number;

export interface CommerceCartLine {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantLabel?: string;
  image?: string;
  unitPrice: CommerceMoney;
  compareAt?: CommerceMoney;
  quantity: number;
  maxQuantity?: number;
  savedForLater?: boolean;
}

export interface CommerceAddress {
  id?: string;
  name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  isDefault?: boolean;
}

export interface CommerceShippingMethod {
  id: string;
  label: string;
  price: CommerceMoney;
  /** Free when the subtotal reaches this. */
  freeOver?: CommerceMoney;
  etaDays?: [number, number];
  kind?: "delivery" | "pickup" | "express";
}

export interface CommerceTotals {
  subtotal: CommerceMoney;
  discount: CommerceMoney;
  shipping: CommerceMoney;
  tax: CommerceMoney;
  total: CommerceMoney;
  itemCount: number;
  savings: CommerceMoney;
}

export interface CommerceOrder {
  id: string;
  number: string;
  placedAt: string;
  status: CommerceOrderStatus;
  payment: CommercePaymentStatus;
  customer: { name: string; email?: string; phone?: string };
  lines: (CommerceCartLine & { fulfilled?: number; refunded?: number; returned?: number })[];
  shippingAddress?: CommerceAddress;
  billingAddress?: CommerceAddress;
  shippingMethod?: CommerceShippingMethod;
  totals: CommerceTotals;
  tracking?: { carrier: string; number: string; url?: string };
  events?: CommerceOrderEvent[];
  notes?: string;
}

export type CommercePaymentKind = "card" | "cod" | "local" | "wallet";

export interface CommercePaymentPolicy {
  card?: boolean;
  cod?: {
    /** Largest order paid on delivery, minor units. */
    maxTotal?: CommerceMoney;
    /** Countries it is offered in. Default: everywhere. */
    countries?: readonly string[];
    /** Fee added to the order, minor units. */
    fee?: CommerceMoney;
  };
  /** The shopper's wallet balance, minor units. */
  wallet?: { balance: CommerceMoney };
  /** Local methods (bank transfer, mobile wallets) with their limits. */
  local?: readonly { id: string; min?: number; max?: number }[];
}

export interface CommerceTotalsInput {
  lines: readonly CommerceCartLine[];
  discount?: CommerceMoney;
  shipping?: CommerceShippingMethod;
  /** Basis points, e.g. 1400 = 14%. */
  taxBps?: number;
  taxInclusive?: boolean;
}

/** Cart/checkout totals. Saved-for-later lines are ignored. Tax rounds half up once on the order. */
export function commerceTotals({ lines, discount = 0, shipping, taxBps = 0, taxInclusive = false }: CommerceTotalsInput): CommerceTotals {
  const active = lines.filter((l) => !l.savedForLater);
  const subtotal = active.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const savings = active.reduce((s, l) => s + (l.compareAt && l.compareAt > l.unitPrice ? (l.compareAt - l.unitPrice) * l.quantity : 0), 0);
  const itemCount = active.reduce((s, l) => s + l.quantity, 0);
  const applied = Math.min(Math.max(discount, 0), subtotal);
  const shippingCost = shipping ? (shipping.freeOver !== undefined && subtotal - applied >= shipping.freeOver ? 0 : shipping.price) : 0;
  const base = subtotal - applied;
  const tax = taxBps
    ? taxInclusive
      ? base - Math.round((base * 10000) / (10000 + taxBps))
      : Math.round((base * taxBps) / 10000)
    : 0;
  const total = base + shippingCost + (taxInclusive ? 0 : tax);
  return { subtotal, discount: applied, shipping: shippingCost, tax, total, itemCount, savings: savings + applied };
}

export interface CommerceCheckoutSummaryInput {
  lines: readonly CommerceCartLine[];
  /** Promo and other discount, minor units. */
  discount?: CommerceMoney;
  shippingMethod?: CommerceShippingMethod;
  taxBps?: number;
  taxInclusive?: boolean;
  paymentKind?: CommercePaymentKind;
  policy?: CommercePaymentPolicy;
  giftWrap?: boolean;
  /** Price of gift wrapping, minor units. */
  giftWrapFee?: CommerceMoney;
}

export interface CommerceCheckoutSummary extends CommerceTotals {
  /** Cash-on-delivery fee, 0 unless paying on delivery. */
  codFee: CommerceMoney;
  giftWrapFee: CommerceMoney;
  /** What the shopper pays: `total` plus fees. */
  payable: CommerceMoney;
}

/** The order totals: `commerceTotals` plus the COD and gift-wrap fees. */
export function commerceCheckoutSummary({ lines, discount, shippingMethod, taxBps, taxInclusive, paymentKind, policy, giftWrap, giftWrapFee = 0 }: CommerceCheckoutSummaryInput): CommerceCheckoutSummary {
  const totals = commerceTotals({ lines, ...(discount !== undefined ? { discount } : {}), ...(shippingMethod ? { shipping: shippingMethod } : {}), ...(taxBps !== undefined ? { taxBps } : {}), ...(taxInclusive !== undefined ? { taxInclusive } : {}) });
  const codFee = paymentKind === "cod" ? (policy?.cod?.fee ?? 0) : 0;
  const wrap = giftWrap ? giftWrapFee : 0;
  return { ...totals, codFee, giftWrapFee: wrap, payable: totals.total + codFee + wrap };
}

export interface CommerceDeliveryWindow {
  /** ISO dates (YYYY-MM-DD). */
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

/**
 * Delivery window from an order time and a range of days. Works on UTC calendar days so results do not depend on the
 * machine's time zone. `skipWeekdays` (0 = Sunday to 6 = Saturday) are not counted as delivery days.
 */
export function commerceDeliveryWindow(
  now: Date | string | number,
  days: readonly [number, number],
  opts: { skipWeekdays?: readonly number[]; cutoffHour?: number } = {},
): CommerceDeliveryWindow {
  const skip = new Set(opts.skipWeekdays ?? []);
  const start = new Date(now);
  let day = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (opts.cutoffHour !== undefined && start.getUTCHours() >= opts.cutoffHour) day += DAY_MS;
  const add = (n: number) => {
    let cursor = day;
    let left = Math.max(0, Math.floor(n));
    let guard = 0;
    while (left > 0 && guard++ < 400) {
      cursor += DAY_MS;
      if (!skip.has(new Date(cursor).getUTCDay())) left--;
    }
    while (skip.has(new Date(cursor).getUTCDay()) && skip.size < 7 && guard++ < 800) cursor += DAY_MS;
    return cursor;
  };
  const lo = Math.min(days[0], days[1]);
  const hi = Math.max(days[0], days[1]);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(add(lo)), to: iso(add(hi)) };
}
