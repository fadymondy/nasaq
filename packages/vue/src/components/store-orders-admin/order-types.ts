// Copies of the order types and helpers in packages/web/src/lib/commerce.ts that the store admin uses.
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

export type { CommerceOrderStatus, CommercePaymentStatus, CommerceOrderEvent } from "../store-order-timeline/order-labels";
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "../store-order-timeline/order-labels";

export type CommerceFulfilmentState = "unfulfilled" | "partial" | "fulfilled" | "none";

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

export interface CommerceRefundRecord {
  id?: string;
  at?: string;
  /** Money handed back, in minor units. */
  amount: CommerceMoney;
  picks?: CommerceLinePick[];
  shipping?: boolean;
  restock?: boolean;
  note?: string;
  by?: string;
}

export interface CommerceAbandonedCart {
  id: string;
  customer: { name: string; email?: string } | null;
  lines: CommerceCartLine[];
  lastActivityAt: string;
  stage: "cart" | "checkout" | "payment";
  emailsSent: number;
  lastEmailAt?: string;
  recoveredOrderId?: string;
  discountCode?: string;
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
export type RefundRecord = CommerceRefundRecord;
