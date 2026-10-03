import type { Component } from "vue";
import { resolveBrand } from "../product-mark/brands";

/**
 * One installed product or app. Nasaq never fetches these: pass them from wherever the host knows
 * them (a static list, an installed-apps API, a feature flag service).
 */
export interface Product {
  id: string;
  /** Already localised by the host. */
  name: string;
  /** A Nasaq brand key: draws the official mark and uses its manifest accent. */
  brand?: string;
  /** Or the product's own official logo (a component that renders an img of the supplied file). Never a generic icon. */
  logo?: Component;
  /** Brand accent when `brand` is not a Nasaq brand. Used only as a small marker, never on the logo. */
  accent?: string;
  description?: string;
  href?: string;
  /** Shown in the sidebar products group. */
  pinned?: boolean;
  /** E.g. an unread count. */
  badge?: string | number;
  keywords?: string[];
}

export const accentOf = (p: Product): string | undefined => p.accent ?? (p.brand ? resolveBrand(p.brand)?.color.accent : undefined);
