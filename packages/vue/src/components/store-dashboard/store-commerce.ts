// The slice of packages/web/src/lib/commerce.ts the store dashboard needs (order and product shapes, minor-unit factor,
// low-stock scan). Kept inside the component folder and not re-exported by name, so it cannot clash with other components.
// Money is always integer minor units.
export type CommerceOrderStatus =
  | "pending" | "paid" | "processing" | "partially-fulfilled" | "fulfilled"
  | "shipped" | "out-for-delivery" | "delivered" | "cancelled" | "refunded" | "partially-refunded" | "returned";

export type StoreOrderStatus = CommerceOrderStatus;

export interface CommerceOrder {
  id: string;
  /** Display number, e.g. "#1042". */
  number: string;
  /** ISO timestamp. */
  placedAt: string;
  status: CommerceOrderStatus;
  customer: { name: string };
  totals: { total: number };
}

export interface CommerceProduct {
  id: string;
  name: string;
  /** Anything but "active" is skipped by the low-stock scan. */
  status?: string;
  images: { src: string }[];
  options: { id: string; values: { id: string; label: string }[] }[];
  variants: { id: string; sku?: string; options: Record<string, string>; stock?: number; image?: string }[];
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

/** Minor units to the major amount Intl expects (12550 becomes 125.5 for USD). Display only. */
export function commerceToMajor(minor: number, currency: string): number {
  return minor / commerceMinorFactor(currency);
}

/** Stock at or under this is "low" in the restock list. Out of stock (0 or less) is its own state. */
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

/** Variants at or under the threshold, out of stock first, then the lowest. Untracked variants and non-active products are skipped. */
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
