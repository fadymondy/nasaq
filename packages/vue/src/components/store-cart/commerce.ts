// Copy of the pure helpers of packages/web/src/lib/commerce.ts that the cart uses (types, quantity clamp, price range,
// totals, free-shipping progress, delivery-zone matching). Kept inside the component folder; not re-exported from the index.
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

/** The zone that delivers to `city`, matching Arabic and English spellings alike. Undefined when none does. */
export function commerceMatchDeliveryZone<Z extends CommerceDeliveryZone>(zones: readonly Z[], city: string): Z | undefined {
  const key = commerceNormalizePlace(city);
  if (!key) return undefined;
  return zones.find((z) => z.cities.some((c) => commerceNormalizePlace(c) === key));
}

export function commercePriceRange(product: CommerceProduct): { min: CommerceMoney; max: CommerceMoney } {
  const prices = product.variants.map((v) => v.price);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
}

