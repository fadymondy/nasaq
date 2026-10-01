/*
 * Tax rates by region, inclusive or exclusive. Pure: no React, no runtime imports.
 * Rates are basis points (1400 = 14%). Tax rounds half up once on the amount it is computed for.
 */
import type { CommerceMoney, CommerceTaxRate } from "../../lib/commerce";

/** A tax rate. Lives in the shared model as `CommerceTaxRate`. */
export type TaxRate = CommerceTaxRate;

const norm = (s: string) => s.trim().toLowerCase();

/** The most specific active rate: region, then country, then "*". */
export function taxRateFor(rates: readonly TaxRate[], to: { country: string; region?: string }): TaxRate | undefined {
  const country = to.country.trim().toUpperCase();
  const region = to.region ? norm(to.region) : "";
  const live = rates.filter((r) => r.active !== false);
  return (
    live.find((r) => r.country.toUpperCase() === country && r.region && norm(r.region) === region) ??
    live.find((r) => r.country.toUpperCase() === country && !r.region) ??
    live.find((r) => r.country === "*")
  );
}

export interface TaxSplit {
  /** Amount without tax. */
  net: CommerceMoney;
  tax: CommerceMoney;
  /** What the customer pays for this amount. */
  gross: CommerceMoney;
}

/** Splits an amount into net, tax and gross for one rate. Net + tax always equals gross. */
export function splitTax(amount: CommerceMoney, bps: number, inclusive: boolean): TaxSplit {
  if (bps <= 0 || amount <= 0) return { net: amount, tax: 0, gross: amount };
  if (inclusive) {
    const net = Math.floor((amount * 10000 + Math.floor((10000 + bps) / 2)) / (10000 + bps));
    return { net, tax: amount - net, gross: amount };
  }
  const tax = Math.floor((amount * bps + 5000) / 10000);
  return { net: amount, tax, gross: amount + tax };
}

export interface OrderTaxInput {
  /** Goods after discounts. */
  goods: CommerceMoney;
  shipping?: CommerceMoney;
  rate: TaxRate | undefined;
}

export interface OrderTax {
  tax: CommerceMoney;
  /** What is added on top of goods and shipping: 0 when prices include tax. */
  added: CommerceMoney;
  /** Total the customer pays. */
  total: CommerceMoney;
  /** "Includes $12.00 tax" vs "Tax $12.00". */
  inclusive: boolean;
  bps: number;
}

/** Tax for an order: computed once on goods (and shipping when the rate says so), never per line. */
export function orderTax({ goods, shipping = 0, rate }: OrderTaxInput): OrderTax {
  if (!rate || rate.bps <= 0) return { tax: 0, added: 0, total: goods + shipping, inclusive: false, bps: 0 };
  const base = goods + (rate.onShipping ? shipping : 0);
  const { tax } = splitTax(base, rate.bps, rate.inclusive);
  const added = rate.inclusive ? 0 : tax;
  return { tax, added, total: goods + shipping + added, inclusive: rate.inclusive, bps: rate.bps };
}

/** Rates that cover the same place, so the merchant can see which one wins. */
export function duplicateTaxRegions(rates: readonly TaxRate[]): string[] {
  const seen = new Map<string, number>();
  for (const r of rates) {
    if (r.active === false) continue;
    const key = `${r.country.toUpperCase()}/${r.region ? norm(r.region) : ""}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([k]) => k);
}
