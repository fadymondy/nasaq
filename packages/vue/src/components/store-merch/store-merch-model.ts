// Pure logic for storefront merchandising: countdown parts, deal progress, related and recently viewed products.
import type { CommerceProduct } from "../store-listing/commerce";

export interface MerchCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Time is up. */
  done: boolean;
  /** Whole milliseconds left, never negative. */
  remaining: number;
}

/** Splits the time until `endsAt` (epoch ms) into days, hours, minutes and seconds. Invalid dates count as done. */
export function merchCountdownParts(endsAt: number, now: number): MerchCountdownParts {
  const remaining = Number.isFinite(endsAt) && Number.isFinite(now) ? Math.max(0, Math.floor(endsAt - now)) : 0;
  const total = Math.ceil(remaining / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: remaining <= 0,
    remaining,
  };
}

/** Milliseconds until the readout needs to change again, so a ticking clock never drifts. */
export function merchNextTick(endsAt: number, now: number): number {
  const remaining = endsAt - now;
  if (!(remaining > 0)) return 0;
  return remaining % 1000 || 1000;
}

export interface MerchDeal {
  id: string;
  /** Epoch ms when the deal ends. */
  endsAt: number;
  /** Epoch ms when the deal starts. Default: already started. */
  startsAt?: number;
  /** Units claimed and units offered, for the progress bar. */
  sold?: number;
  total?: number;
}

/** Deals that have started and not ended at `now`, soonest ending first. */
export function merchActiveDeals<T extends MerchDeal>(deals: readonly T[], now: number): T[] {
  return deals.filter((d) => (d.startsAt === undefined || now >= d.startsAt) && now < d.endsAt).sort((a, b) => a.endsAt - b.endsAt);
}

/** Whole-percent share claimed, clamped to 0..100. 0 when the total is unknown. */
export function merchDealProgress(sold: number | undefined, total: number | undefined): number {
  if (!total || total <= 0 || !sold || sold <= 0) return 0;
  return Math.min(100, Math.floor((sold * 100) / total));
}

/** Puts `id` first in the recently-viewed list, dropping repeats and capping the length. */
export function merchRecordViewed(ids: readonly string[], id: string, max = 12): string[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, max);
}

/** Recently viewed products in view order, skipping ids that no longer exist and an optional current product. */
export function merchViewedProducts(products: readonly CommerceProduct[], ids: readonly string[], exclude?: string, max = 12): CommerceProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .filter((id) => id !== exclude)
    .map((id) => byId.get(id))
    .filter((p): p is CommerceProduct => Boolean(p))
    .slice(0, max);
}

/**
 * Products related to `product`: same category ranks highest, then same brand, then shared tags. Never the product
 * itself, drafts or archived items. Ties keep catalogue order.
 */
export function merchRelatedProducts(products: readonly CommerceProduct[], product: CommerceProduct, max = 8): CommerceProduct[] {
  const tags = new Set(product.tags ?? []);
  return products
    .map((p, order) => {
      if (p.id === product.id || p.status === "draft" || p.status === "archived") return { p, order, score: 0 };
      let score = 0;
      if (product.category && p.category === product.category) score += 4;
      if (product.brand && p.brand === product.brand) score += 2;
      for (const tag of p.tags ?? []) if (tags.has(tag)) score += 1;
      return { p, order, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map((x) => x.p);
}
