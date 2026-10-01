/*
 * Shared e-commerce model for the commerce kit (storefront + store admin).
 * Pure types and helpers only: no React, no imports, so node tests can load it.
 * Money is always integer minor units (cents, piasters, halalas) in one currency per store.
 */

export type CommerceMoney = number;

export interface CommerceImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Video poster or 3D preview; the gallery shows a play badge. */
  kind?: "image" | "video";
}

/** An option axis such as Colour or Size, with its values in display order. */
export interface CommerceOption {
  id: string;
  name: string;
  /** "swatch" draws a colour chip (value.color must be a token or CSS colour from data), "image" a thumbnail. */
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
  /** Merchant-only fields, edited in the product admin. Never render `cost` on the storefront. */
  /** Cost per item, minor units. */
  cost?: CommerceMoney;
  /** "hidden" keeps an active product out of listings and search while its page still opens by link. Default "visible". */
  visibility?: CommerceProductVisibility;
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

export type CommerceOrderStatus =
  | "pending" | "paid" | "processing" | "partially-fulfilled" | "fulfilled"
  | "shipped" | "out-for-delivery" | "delivered" | "cancelled" | "refunded" | "partially-refunded" | "returned";

export type CommercePaymentStatus = "pending" | "authorized" | "paid" | "partially-refunded" | "refunded" | "failed" | "cod";

export interface CommerceOrderEvent {
  at: string;
  kind: string;
  label: string;
  by?: string;
  note?: string;
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

/** Option values picked so far; missing axes are unpicked. */
export type CommerceSelection = Record<string, string | undefined>;

export function commerceFindVariant(product: CommerceProduct, selection: CommerceSelection): CommerceVariant | undefined {
  if (product.options.some((o) => !selection[o.id])) return product.variants.length === 1 && product.options.length === 0 ? product.variants[0] : undefined;
  return product.variants.find((v) => product.options.every((o) => v.options[o.id] === selection[o.id]));
}

export function commerceInStock(variant: CommerceVariant | undefined, quantity = 1): boolean {
  if (!variant) return false;
  if (variant.stock === undefined || variant.allowBackorder) return true;
  return variant.stock >= quantity;
}

/**
 * Availability of each value on one axis given the other picks: "available", "out" (exists but no stock)
 * or "none" (no variant has this combination). Drives crossed-out and hidden swatches.
 */
export function commerceValueAvailability(
  product: CommerceProduct,
  selection: CommerceSelection,
  optionId: string,
): Record<string, "available" | "out" | "none"> {
  const out: Record<string, "available" | "out" | "none"> = {};
  const option = product.options.find((o) => o.id === optionId);
  if (!option) return out;
  for (const value of option.values) {
    const matches = product.variants.filter(
      (v) => v.options[optionId] === value.id && product.options.every((o) => o.id === optionId || !selection[o.id] || v.options[o.id] === selection[o.id]),
    );
    out[value.id] = matches.length === 0 ? "none" : matches.some((v) => commerceInStock(v)) ? "available" : "out";
  }
  return out;
}

/** Lowest and highest variant price, for "from" pricing on cards. */
export function commercePriceRange(product: CommerceProduct): { min: CommerceMoney; max: CommerceMoney } {
  const prices = product.variants.map((v) => v.price);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
}

/** Integer percentage off, rounded down (so "20% off" is never overstated). */
export function commerceDiscountPercent(price: CommerceMoney, compareAt?: CommerceMoney): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.floor(((compareAt - price) * 100) / compareAt);
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

/** How much more to spend for free shipping, and progress 0..1. */
export function commerceFreeShippingProgress(subtotal: CommerceMoney, threshold: CommerceMoney): { remaining: CommerceMoney; progress: number } {
  if (threshold <= 0) return { remaining: 0, progress: 1 };
  return { remaining: Math.max(threshold - subtotal, 0), progress: Math.min(subtotal / threshold, 1) };
}

/** Clamp a quantity to 1..max (stock or line max). */
export function commerceClampQuantity(quantity: number, max?: number): number {
  const q = Math.max(1, Math.floor(quantity) || 1);
  return max !== undefined ? Math.min(q, Math.max(max, 1)) : q;
}

/* ================================================================== promoted in the integration pass (MH-1020) */
/* Shared pieces that two or more areas needed. Each area keeps its old names as aliases or re-exports. */

/* ------------------------------------------------------------------ money display */

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

/** Minor units to the major amount Intl expects (12550 becomes 125.5 for USD). Display only: never do maths on it. */
export function commerceToMajor(minor: CommerceMoney, currency: string): number {
  return minor / commerceMinorFactor(currency);
}

/* ------------------------------------------------------------------ stock */

/** Stock at or under this is "low" in the admin's restock list. Out of stock (0 or less) is its own state. */
export const COMMERCE_LOW_STOCK_DEFAULT = 5;

export interface CommerceLowStockItem {
  productId: string;
  productName: string;
  variantId: string;
  sku?: string;
  /** Option labels joined for display, for example "Black / M". Empty for a single-variant product. */
  variantLabel: string;
  stock: number;
  level: "out" | "low";
  image?: string;
}

/**
 * Variants that need restocking: stock at or under the threshold, out of stock first, then the lowest. Variants without a
 * `stock` number are untracked and never listed. Archived and draft products are skipped.
 */
export function commerceLowStock(products: readonly CommerceProduct[], threshold = COMMERCE_LOW_STOCK_DEFAULT): CommerceLowStockItem[] {
  const out: CommerceLowStockItem[] = [];
  for (const p of products) {
    if (p.status && p.status !== "active") continue;
    for (const v of p.variants) {
      if (typeof v.stock !== "number" || v.stock > threshold) continue;
      const label = p.options
        .map((o) => o.values.find((x) => x.id === v.options[o.id])?.label)
        .filter((x): x is string => !!x)
        .join(" / ");
      out.push({
        productId: p.id,
        productName: p.name,
        variantId: v.id,
        sku: v.sku,
        variantLabel: label,
        stock: Math.max(0, v.stock),
        level: v.stock <= 0 ? "out" : "low",
        image: v.image ?? p.images[0]?.src,
      });
    }
  }
  return out.sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName) || a.variantId.localeCompare(b.variantId));
}

export type CommerceStockState =
  | { kind: "untracked" }
  | { kind: "in-stock"; left: number }
  | { kind: "low"; left: number }
  | { kind: "backorder" }
  | { kind: "out" }
  | { kind: "unavailable" };

/** Stock wording state. `unavailable` means no variant is selected yet or the combination does not exist. */
export function commerceStockState(variant: CommerceVariant | undefined, lowThreshold = 5): CommerceStockState {
  if (!variant) return { kind: "unavailable" };
  if (variant.stock === undefined) return { kind: "untracked" };
  if (variant.stock <= 0) return variant.allowBackorder ? { kind: "backorder" } : { kind: "out" };
  return variant.stock <= lowThreshold ? { kind: "low", left: variant.stock } : { kind: "in-stock", left: variant.stock };
}

/* ------------------------------------------------------------------ option selection and price */

/** Values that can still be picked on an axis given the other picks (everything that has a variant). */
function reachableValues(product: CommerceProduct, selection: CommerceSelection, optionId: string): { id: string }[] {
  return Object.entries(commerceValueAvailability(product, selection, optionId))
    .filter(([, s]) => s !== "none")
    .map(([id]) => ({ id }));
}

/**
 * Picks the only sensible value on every axis that has exactly one reachable value, repeating until nothing
 * changes (picking one axis can leave another with a single value). An axis with one in-stock value and
 * other values that are sold out is not auto-picked: the shopper should still see the sold-out ones.
 */
export function commerceAutoSelectSingle(product: CommerceProduct, selection: CommerceSelection): CommerceSelection {
  let next: CommerceSelection = { ...selection };
  for (let guard = 0; guard <= product.options.length; guard++) {
    let changed = false;
    for (const option of product.options) {
      if (next[option.id]) continue;
      const values = reachableValues(product, next, option.id);
      if (values.length === 1) {
        next = { ...next, [option.id]: values[0]!.id };
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
}

/**
 * Sets one value and keeps the selection possible: another axis's pick survives only if a variant still
 * has it together with everything kept so far. The value just chosen always wins. Lone values are then
 * auto-picked. Picking a value with no variant at all is ignored.
 */
export function commerceSelectOptionValue(product: CommerceProduct, selection: CommerceSelection, optionId: string, valueId: string): CommerceSelection {
  const option = product.options.find((o) => o.id === optionId);
  if (!option || !option.values.some((v) => v.id === valueId)) return selection;
  if (!product.variants.some((v) => v.options[optionId] === valueId)) return selection;
  const kept: CommerceSelection = { [optionId]: valueId };
  for (const other of product.options) {
    if (other.id === optionId) continue;
    const pick = selection[other.id];
    if (!pick) continue;
    const candidate = { ...kept, [other.id]: pick };
    if (product.variants.some((v) => Object.entries(candidate).every(([k, val]) => v.options[k] === val))) kept[other.id] = pick;
  }
  return commerceAutoSelectSingle(product, kept);
}

export interface CommerceDisplayPrice {
  /** Selected variant price, or the lowest price while nothing is picked. */
  price: CommerceMoney;
  compareAt?: CommerceMoney;
  percentOff: number;
  /** True when no variant is selected and prices differ, so the UI says "from". */
  from: boolean;
}

/** Price to show for the current selection. Before a full selection it is the lowest price ("from"). */
export function commerceDisplayPrice(product: CommerceProduct, variant: CommerceVariant | undefined): CommerceDisplayPrice {
  if (variant) {
    const percentOff = commerceDiscountPercent(variant.price, variant.compareAt);
    return { price: variant.price, ...(percentOff && variant.compareAt ? { compareAt: variant.compareAt } : {}), percentOff, from: false };
  }
  const { min, max } = commercePriceRange(product);
  const cheapest = product.variants.find((v) => v.price === min);
  const percentOff = cheapest ? commerceDiscountPercent(cheapest.price, cheapest.compareAt) : 0;
  return { price: min, ...(percentOff && cheapest?.compareAt ? { compareAt: cheapest.compareAt } : {}), percentOff, from: max > min };
}

/* ------------------------------------------------------------------ delivery dates */

export interface CommerceDeliveryWindow {
  /** ISO dates (YYYY-MM-DD). */
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

/**
 * Delivery window from an order time and a range of days. Works on UTC calendar days so results do not
 * depend on the machine's time zone. `skipWeekdays` (0 = Sunday to 6 = Saturday) are not counted as
 * delivery days: Egypt and the Gulf skip Friday (5) and often Saturday (6). Orders placed at or after
 * `cutoffHour` (UTC, 0-24) count from the next day.
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
    // Landing on a skipped day (zero days, or an order placed on one) moves on to the next delivery day.
    while (skip.has(new Date(cursor).getUTCDay()) && skip.size < 7 && guard++ < 800) cursor += DAY_MS;
    return cursor;
  };
  const lo = Math.min(days[0], days[1]);
  const hi = Math.max(days[0], days[1]);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(add(lo)), to: iso(add(hi)) };
}

/* ------------------------------------------------------------------ reviews and questions */

export type CommerceReviewFit = "small" | "true" | "large";

export interface CommerceReviewPhoto {
  src: string;
  alt?: string;
}

export interface CommerceReview {
  id: string;
  author: string;
  /** 1 to 5. */
  rating: number;
  title?: string;
  body: string;
  /** ISO date. */
  date: string;
  /** Bought this product from the store. */
  verified?: boolean;
  photos?: readonly CommerceReviewPhoto[];
  /** Helpful votes from other shoppers. */
  helpful?: number;
  /** The variant they bought, e.g. "Black · M". */
  variantLabel?: string;
  fit?: CommerceReviewFit;
  reply?: { author: string; body: string; date: string };
}

export interface CommerceAnswer {
  id: string;
  author: string;
  body: string;
  date: string;
  /** Answered by the store or brand. */
  seller?: boolean;
  votes?: number;
}

export interface CommerceQuestion {
  id: string;
  author: string;
  question: string;
  date: string;
  votes?: number;
  answers: readonly CommerceAnswer[];
}

/* ------------------------------------------------------------------ catalogue listing */

export type CommerceListingSort = "relevance" | "popular" | "rating" | "price-asc" | "price-desc" | "discount" | "name";
export const COMMERCE_LISTING_SORTS: readonly CommerceListingSort[] = ["relevance", "popular", "rating", "price-asc", "price-desc", "discount", "name"];

export interface CommerceCategoryNode {
  /** Matches `CommerceProduct.category`. */
  id: string;
  label: string;
  children?: CommerceCategoryNode[];
}

export interface CommerceListingFilters {
  query: string;
  /** A category node id; its descendants match too. */
  category: string | null;
  brands: string[];
  /** optionId to selected value ids (OR within an option, AND between options). */
  options: Record<string, string[]>;
  /** Inclusive variant price range in minor units. */
  price: [number, number] | null;
  /** Minimum average rating (1..5). */
  minRating: number | null;
  inStock: boolean;
  onSale: boolean;
}

export const COMMERCE_EMPTY_LISTING_FILTERS: CommerceListingFilters = { query: "", category: null, brands: [], options: {}, price: null, minRating: null, inStock: false, onSale: false };

export interface CommerceFacetValue {
  id: string;
  label: string;
  count: number;
  selected: boolean;
  color?: string;
  image?: string;
}

export interface CommerceCategoryFacet {
  id: string;
  label: string;
  count: number;
  selected: boolean;
  /** This node or one of its descendants is selected. */
  open: boolean;
  children: CommerceCategoryFacet[];
}

export interface CommerceOptionFacet {
  id: string;
  name: string;
  display: "button" | "swatch" | "image" | "select";
  values: CommerceFacetValue[];
}

export interface CommerceFacets {
  categories: CommerceCategoryFacet[];
  brands: CommerceFacetValue[];
  options: CommerceOptionFacet[];
  /** Cumulative: "4 and up" counts products rated 4 or more. */
  ratings: { min: number; count: number; selected: boolean }[];
  inStock: number;
  onSale: number;
  /** Price bounds of the whole catalogue, so the slider does not move while filtering. */
  price: { min: CommerceMoney; max: CommerceMoney };
}

/* ------------------------------------------------------------------ payment policy and order summary */

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

/* ------------------------------------------------------------------ shipping zones */

export type CommerceShippingRateType = "flat" | "weight" | "price" | "free-over";

/** A band of a weight or price table. `min` is inclusive, `max` is exclusive; no `max` means "and above". */
export interface CommerceShippingTier {
  min: number;
  max?: number;
  amount: CommerceMoney;
}

export interface CommerceShippingRate {
  id: string;
  label: string;
  type: CommerceShippingRateType;
  /** flat: the price. free-over: the price below the threshold; leave it out to hide the rate below the threshold. */
  amount?: CommerceMoney;
  /** weight (grams) and price (minor units) tables. */
  tiers?: CommerceShippingTier[];
  /** free-over: the subtotal that makes it free. */
  freeOver?: CommerceMoney;
  etaDays?: [number, number];
  /** Fast rates are marked so the checkout can badge them. */
  express?: boolean;
  active?: boolean;
}

/** A shipping zone as the merchant defines it: where it applies and how each rate is priced. */
export interface CommerceShippingZone {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 codes. "*" is the rest of the world. */
  countries: string[];
  /** When set, only these cities in those countries. A zone with cities beats a country-wide one. */
  cities?: string[];
  rates: CommerceShippingRate[];
}

/**
 * A zone already priced for one cart, as the cart's "estimate shipping" box uses it: the cities it covers and the
 * methods on offer. Build one from a merchant zone with `commerceDeliveryZone`.
 */
export interface CommerceDeliveryZone {
  id: string;
  /** "Greater Cairo", "Delta and Canal". */
  label: string;
  /** City names covered, in any language: "Cairo", "القاهرة". Matching folds case, accents, "ال" and alef/ya/ta-marbuta spelling. */
  cities: readonly string[];
  methods: readonly CommerceShippingMethod[];
}

/** Folds a place name so English and Arabic spellings compare: case, diacritics, alef forms, ى/ي, ة/ه, a leading "ال", digits. */
export function commerceNormalizePlace(value: string): string {
  let s = value
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s.startsWith("ال") && s.length > 3) s = s.slice(2);
  return s;
}

/** Finds the band for a value. Undefined when it falls in a gap or below the first band. */
export function commerceTierFor(tiers: readonly CommerceShippingTier[], value: number): CommerceShippingTier | undefined {
  return [...tiers].sort((a, b) => a.min - b.min).find((t) => value >= t.min && (t.max === undefined || value < t.max));
}

export type CommerceRateResult =
  | { available: true; amount: CommerceMoney; free: boolean }
  | { available: false; reason: "inactive" | "no-tier" | "below-threshold"; /** free-over: how much more to spend. */ remaining?: CommerceMoney };

/** The price of one rate for a cart (`subtotal` in minor units, `weightGrams`), or why it is not offered. */
export function commerceRateFor(rate: CommerceShippingRate, cart: { subtotal: CommerceMoney; weightGrams: number }): CommerceRateResult {
  if (rate.active === false) return { available: false, reason: "inactive" };
  switch (rate.type) {
    case "flat":
      return { available: true, amount: rate.amount ?? 0, free: (rate.amount ?? 0) === 0 };
    case "weight":
    case "price": {
      const tier = commerceTierFor(rate.tiers ?? [], rate.type === "weight" ? cart.weightGrams : cart.subtotal);
      return tier ? { available: true, amount: tier.amount, free: tier.amount === 0 } : { available: false, reason: "no-tier" };
    }
    case "free-over": {
      const threshold = rate.freeOver ?? 0;
      if (cart.subtotal >= threshold) return { available: true, amount: 0, free: true };
      if (rate.amount === undefined) return { available: false, reason: "below-threshold", remaining: threshold - cart.subtotal };
      return { available: true, amount: rate.amount, free: false };
    }
  }
}

/**
 * A merchant zone priced for a cart, in the shape the cart's shipping estimate takes. Rates that are not available
 * for the cart are left out. `cities` overrides the zone's own list (a country-wide zone has none, and the
 * estimate box matches by city, so pass the cities you want it to answer for).
 */
export function commerceDeliveryZone(zone: CommerceShippingZone, cart: { subtotal: CommerceMoney; weightGrams: number }, cities?: readonly string[]): CommerceDeliveryZone {
  const methods: CommerceShippingMethod[] = [];
  for (const rate of zone.rates) {
    const r = commerceRateFor(rate, cart);
    if (!r.available) continue;
    methods.push({ id: rate.id, label: rate.label, price: r.amount, kind: rate.express ? "express" : "delivery", ...(rate.etaDays ? { etaDays: rate.etaDays } : {}) });
  }
  return { id: zone.id, label: zone.name, cities: cities ?? zone.cities ?? [], methods };
}

/** The zone that delivers to `city`, matching Arabic and English spellings alike. Undefined when none does. */
export function commerceMatchDeliveryZone<Z extends CommerceDeliveryZone>(zones: readonly Z[], city: string): Z | undefined {
  const key = commerceNormalizePlace(city);
  if (!key) return undefined;
  return zones.find((z) => z.cities.some((c) => commerceNormalizePlace(c) === key));
}

/* ------------------------------------------------------------------ orders: refunds, returns, abandoned carts, status words */

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

export interface CommerceAbandonedCart {
  id: string;
  /** Null for a guest who never gave an email. */
  customer: { name: string; email?: string } | null;
  lines: CommerceCartLine[];
  /** ISO time of the last cart or checkout activity. */
  lastActivityAt: string;
  /** How far the shopper got. */
  stage: "cart" | "checkout" | "payment";
  emailsSent: number;
  lastEmailAt?: string;
  /** Set when the shopper came back and paid. */
  recoveredOrderId?: string;
  discountCode?: string;
}

export type CommerceChipVariant = "success" | "warning" | "danger" | "info" | "neutral";
export type CommerceFulfilmentState = "unfulfilled" | "partial" | "fulfilled" | "none";

export const COMMERCE_ORDER_STATUS_LABEL: Record<CommerceOrderStatus, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  paid: { en: "Paid", ar: "مدفوع" },
  processing: { en: "Processing", ar: "قيد التجهيز" },
  "partially-fulfilled": { en: "Partly shipped", ar: "شُحن جزئيًا" },
  fulfilled: { en: "Fulfilled", ar: "تم التجهيز" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  "out-for-delivery": { en: "Out for delivery", ar: "في الطريق إليك" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  refunded: { en: "Refunded", ar: "تم الاسترداد" },
  "partially-refunded": { en: "Partly refunded", ar: "استرداد جزئي" },
  returned: { en: "Returned", ar: "مرتجع" },
};

export const COMMERCE_ORDER_STATUS_VARIANT: Record<CommerceOrderStatus, CommerceChipVariant> = {
  pending: "warning",
  paid: "info",
  processing: "info",
  "partially-fulfilled": "info",
  fulfilled: "info",
  shipped: "info",
  "out-for-delivery": "info",
  delivered: "success",
  cancelled: "neutral",
  refunded: "neutral",
  "partially-refunded": "warning",
  returned: "neutral",
};

export const COMMERCE_PAYMENT_LABEL: Record<CommercePaymentStatus, { en: string; ar: string }> = {
  pending: { en: "Unpaid", ar: "غير مدفوع" },
  authorized: { en: "Authorised", ar: "محجوز" },
  paid: { en: "Paid", ar: "مدفوع" },
  "partially-refunded": { en: "Partly refunded", ar: "استرداد جزئي" },
  refunded: { en: "Refunded", ar: "تم الاسترداد" },
  failed: { en: "Failed", ar: "فشل الدفع" },
  cod: { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
};

export const COMMERCE_PAYMENT_VARIANT: Record<CommercePaymentStatus, CommerceChipVariant> = {
  pending: "warning",
  authorized: "info",
  paid: "success",
  "partially-refunded": "warning",
  refunded: "neutral",
  failed: "danger",
  cod: "info",
};

export const COMMERCE_FULFILMENT_LABEL: Record<CommerceFulfilmentState, { en: string; ar: string }> = {
  unfulfilled: { en: "Unfulfilled", ar: "لم يُجهَّز" },
  partial: { en: "Partly fulfilled", ar: "مجهّز جزئيًا" },
  fulfilled: { en: "Fulfilled", ar: "مجهّز" },
  none: { en: "Nothing to ship", ar: "لا شيء للشحن" },
};

export const COMMERCE_FULFILMENT_VARIANT: Record<CommerceFulfilmentState, CommerceChipVariant> = {
  unfulfilled: "warning",
  partial: "info",
  fulfilled: "success",
  none: "neutral",
};

/* ------------------------------------------------------------------ settings: tax, discounts, gift cards */

export interface CommerceTaxRate {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, or "*" for everywhere else. */
  country: string;
  /** A state, governorate or province. Without one the rate covers the whole country. */
  region?: string;
  /** Basis points: 1400 = 14%. */
  bps: number;
  /** Prices already contain this tax. */
  inclusive: boolean;
  /** Tax the shipping charge too. */
  onShipping?: boolean;
  active?: boolean;
}

export type CommerceDiscountKind = "percentage" | "fixed" | "bxgy" | "free-shipping";
/** Discounts that share a class compete for the same money; a class decides who may combine with whom. */
export type CommerceDiscountClass = "product" | "order" | "shipping";
export type CommerceDiscountMethod = "automatic" | "code";

/** Which lines a discount looks at. Both lists empty or missing means every line. */
export interface CommerceDiscountScope {
  productIds?: string[];
  collectionIds?: string[];
}

export interface CommerceBuyXGetY {
  buyQty: number;
  buyScope?: CommerceDiscountScope;
  getQty: number;
  /** Missing = the same items as the buy side ("buy 2 get 1 free" on one product). */
  getScope?: CommerceDiscountScope;
  /** Discount on the free items, basis points. Default 10000 (free). */
  getPercentBps?: number;
  /** Most times the offer can repeat in one order. Missing = as many as the cart allows. */
  maxSets?: number;
}

export interface CommerceDiscountCustomers {
  mode: "all" | "segments" | "specific";
  segments?: string[];
  customerIds?: string[];
}

export interface CommerceDiscount {
  id: string;
  title: string;
  /** Default true. */
  active?: boolean;
  method: CommerceDiscountMethod;
  code?: string;
  kind: CommerceDiscountKind;
  /** percentage: basis points. fixed: minor units. */
  value?: number;
  /** fixed: take `value` off each unit instead of once off the total. */
  perItem?: boolean;
  /** Most this discount may take. For free-shipping: the most shipping it covers. */
  maxDiscount?: CommerceMoney;
  scope?: CommerceDiscountScope;
  /** Leave items that already have a compare-at price out. */
  excludeOnSale?: boolean;
  bxgy?: CommerceBuyXGetY;
  /** Smallest goods total (before discounts) of the lines the discount looks at. */
  minSubtotal?: CommerceMoney;
  minQuantity?: number;
  customers?: CommerceDiscountCustomers;
  firstOrderOnly?: boolean;
  /** ISO date-times. */
  startsAt?: string;
  endsAt?: string;
  limits?: { total?: number; perCustomer?: number };
  /** Which classes of discount this one may stack with. Nothing by default. */
  combinesWith?: Partial<Record<CommerceDiscountClass, boolean>>;
  /** Breaks a tie between discounts worth the same. Higher wins. */
  priority?: number;
}

export type CommerceGiftCardEntryKind = "issue" | "redeem" | "refund" | "adjust" | "expire" | "void";

export interface CommerceGiftCardEntry {
  id: string;
  kind: CommerceGiftCardEntryKind;
  /** Signed: issue and refund add, redeem, expire and void take away, adjust is either. */
  amount: CommerceMoney;
  /** ISO date-time. */
  at: string;
  orderId?: string;
  note?: string;
  by?: string;
}

export interface CommerceGiftCard {
  id: string;
  code: string;
  currency: string;
  /** ISO date-time. Money left after this moment cannot be spent. */
  expiresAt?: string;
  disabled?: boolean;
  recipient?: { name?: string; email?: string };
  /** The balance is never stored, it is the ledger's sum. */
  ledger: CommerceGiftCardEntry[];
}

export type CommerceGiftCardStatus = "active" | "depleted" | "expired" | "disabled";

export type CommerceProductVisibility = "visible" | "hidden";
