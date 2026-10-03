// Pure logic of the storefront merchandising blocks: copy of packages/web/src/components/store-merch/store-merch-model.ts
// (the countdown and deal parts; the product-list helpers have no use in the browser runtime).

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

export const merchFill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
