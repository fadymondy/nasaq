// Copy of the pieces of packages/web/src/lib/commerce.ts and store-orders-admin/order-math.ts that the customer account
// uses (types, return-request shapes, per-line maths, minor-unit factor). Kept inside the component folder; not re-exported.
// Money is always integer minor units.
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "../store-order-timeline/order-labels";

export type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus };

export type CommerceMoney = number;

export interface CommerceImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  kind?: "image" | "video";
}

export interface CommerceOption {
  id: string;
  name: string;
  display?: "button" | "swatch" | "image" | "select";
  values: { id: string; label: string; color?: string; image?: string }[];
}

export interface CommerceVariant {
  id: string;
  sku?: string;
  /** optionId → valueId */
  options: Record<string, string>;
  price: CommerceMoney;
  compareAt?: CommerceMoney;
  /** undefined = not tracked (always in stock). */
  stock?: number;
  allowBackorder?: boolean;
  image?: string;
  weightGrams?: number;
}

export interface CommerceProduct {
  id: string;
  slug?: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  images: CommerceImage[];
  options: CommerceOption[];
  variants: CommerceVariant[];
  rating?: { average: number; count: number };
  badges?: string[];
  tags?: string[];
  status?: "active" | "draft" | "archived";
  cost?: CommerceMoney;
  visibility?: "visible" | "hidden";
  seoTitle?: string;
  seoDescription?: string;
}

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

export interface CommerceLinePick {
  lineId: string;
  quantity: number;
}

export type CommerceRmaStatus = "requested" | "approved" | "shipped-back" | "received" | "refunded" | "rejected" | "cancelled";

/** The happy path of a return, in order. */
export const COMMERCE_RMA_FLOW = ["requested", "approved", "shipped-back", "received", "refunded"] as const;

export const COMMERCE_RETURN_REASONS = ["defective", "wrong-item", "not-as-described", "too-small", "too-large", "changed-mind", "late", "other"] as const;
export type CommerceReturnReason = (typeof COMMERCE_RETURN_REASONS)[number];

export type CommerceRefundMethod = "original" | "store-credit" | "bank";

export interface CommerceReturnRequest {
  id: string;
  /** Shown to the customer, e.g. "RMA-1001". */
  number: string;
  orderId: string;
  createdAt: string;
  status: CommerceRmaStatus;
  lines: CommerceLinePick[];
  reason: CommerceReturnReason;
  note?: string;
  /** Photo URLs. */
  photos?: string[];
  refundMethod: CommerceRefundMethod;
  /** Estimated or final refund, minor units. */
  refundAmount: CommerceMoney;
  /** Why the store said no. */
  rejectionReason?: string;
  /** Status before it was rejected or cancelled. */
  stoppedAfter?: (typeof COMMERCE_RMA_FLOW)[number];
}

const minorFactorCache = new Map<string, number>();

/** Minor units per major unit for an ISO currency (100 for USD and SAR, 1 for JPY, 1000 for KWD). Unknown codes use 100. */
export function commerceMinorFactor(currency: string): number {
  const code = currency.toUpperCase();
  const known = minorFactorCache.get(code);
  if (known !== undefined) return known;
  let factor = 100;
  try {
    factor = 10 ** (new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2);
  } catch {
    factor = 100;
  }
  minorFactorCache.set(code, factor);
  return factor;
}

/* ------------------------------------------------------------------ per-line order maths */

export type OrderLine = CommerceOrder["lines"][number];
export type LinePick = CommerceLinePick;

const whole = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const lineFulfilled = (line: OrderLine) => clamp(whole(line.fulfilled), 0, line.quantity);
export const lineRefunded = (line: OrderLine) => clamp(whole(line.refunded), 0, line.quantity);
export const lineReturned = (line: OrderLine) => clamp(whole(line.returned), 0, line.quantity);

/** Units a customer can still send back: shipped, not yet returned, not refunded, and not already in a return request. */
export function lineReturnable(line: OrderLine, inRequest = 0): number {
  return Math.max(0, Math.min(lineFulfilled(line) - lineReturned(line) - whole(inRequest), line.quantity - lineRefunded(line)));
}

/** Splits `total` across `weights` in whole units, largest remainder first, so the parts add up exactly. */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!weights.length) return [];
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((s, p) => s + p, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) parts[order[k]![1]]! += 1;
  return parts;
}

/** What the customer paid for each whole line: gross, minus its discount share, plus its share of exclusive tax. */
export function linePaidValues(order: Pick<CommerceOrder, "lines" | "totals">): number[] {
  const gross = order.lines.map((l) => l.unitPrice * l.quantity);
  const discount = allocate(Math.min(order.totals.discount, gross.reduce((s, g) => s + g, 0)), gross);
  const net = gross.map((g, i) => g - discount[i]!);
  const extra = order.totals.total - order.totals.shipping - net.reduce((s, n) => s + n, 0);
  const tax = extra > 0 ? allocate(extra, net) : net.map(() => 0);
  return net.map((n, i) => n + tax[i]!);
}

/** Value of `count` more units of a line when `before` are already gone. Cumulative rounding: all units add to the line value. */
export function unitsValue(paid: number, quantity: number, before: number, count: number): number {
  if (quantity <= 0 || count <= 0) return 0;
  const at = (n: number) => Math.floor((2 * paid * n + quantity) / (2 * quantity));
  return at(Math.min(before + count, quantity)) - at(Math.min(before, quantity));
}
