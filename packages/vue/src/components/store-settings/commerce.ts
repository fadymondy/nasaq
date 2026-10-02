// Copy of the parts of packages/web/src/lib/commerce.ts that store-settings uses (money, product shape, shipping zones and rates, tax, discounts, gift cards).
// Kept inside the component folder; not re-exported from the index. Money is always integer minor units.

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
  seoTitle?: string;
  seoDescription?: string;
}
export type CommerceProductVisibility = "visible" | "hidden";

export interface CommerceShippingMethod {
  id: string;
  label: string;
  price: CommerceMoney;
  /** Free when the subtotal reaches this. */
  freeOver?: CommerceMoney;
  etaDays?: [number, number];
  kind?: "delivery" | "pickup" | "express";
}

/** Minor units per major unit for an ISO currency (100 for USD and SAR, 1 for JPY, 1000 for KWD). Unknown codes use 100. */
const minorFactorCache = new Map<string, number>();

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

