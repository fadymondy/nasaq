import type { CommerceProduct } from "../store-listing/commerce";
import type { MerchDeal } from "./store-merch-model";

export interface StoreCategoryTile {
  id: string;
  label: string;
  href?: string;
  image?: string;
  /** Number of products, shown under the name. */
  count?: number;
}

export interface StoreBanner {
  id: string;
  title: string;
  description?: string;
  /** Call to action text. Default "Shop now". */
  cta?: string;
  href?: string;
  image?: string;
  /** Alt text for the image. Default empty, because the title says it. */
  imageAlt?: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Colour of the text panel. Default "brand". */
  tone?: "brand" | "soft" | "dark";
}

export interface StoreFlashDeal extends MerchDeal {
  /** The product on offer (carries prices, images and options). */
  product: CommerceProduct;
}

export interface StoreBrand {
  id: string;
  /** Brand name. Shown as text unless `logo` is given. */
  name: string;
  href?: string;
  /** Official logo image URL. Leave out to show the name as text. */
  logo?: string;
}

export const MERCH_TONES = {
  brand: "bg-primary text-primary-foreground",
  soft: "bg-secondary text-secondary-foreground",
  dark: "bg-foreground text-background",
} as const;
