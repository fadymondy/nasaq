// Copy of the product shape from packages/web/src/lib/commerce.ts used by store-products-admin. Not re-exported. Money is integer minor units.
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
export type CommerceProductVisibility = "visible" | "hidden";
