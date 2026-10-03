// Copy of the pure helpers of packages/web/src/lib/commerce.ts that product-detail uses (types, variant lookup,
// availability, stock state, option selection, display price, quantity clamp, delivery window).
// Kept inside the component folder (no shared lib/commerce yet); not re-exported from the index.
// Money is always integer minor units.

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

export type CommerceProductVisibility = "visible" | "hidden";

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


/** Clamp a quantity to 1..max (stock or line max). */
export function commerceClampQuantity(quantity: number, max?: number): number {
  const q = Math.max(1, Math.floor(quantity) || 1);
  return max !== undefined ? Math.min(q, Math.max(max, 1)) : q;
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

