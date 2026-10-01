// Copy of the pure helpers of packages/web/src/lib/commerce.ts that store-listing uses (types, variant lookup, availability,
// discount, quantity clamp) plus the catalogue listing types. Kept inside the component folder (no shared lib/commerce yet).
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
