/*
 * Store dashboard maths. Pure (no React, no sibling runtime modules) so node --test can run it.
 * Money is integer minor units (piasters, cents). Ratios are fractions: 0.124 is 12.4%.
 * Every division goes through storeSafeDivide, so an empty period never yields NaN or Infinity.
 */
import { COMMERCE_LOW_STOCK_DEFAULT, type CommerceLowStockItem, commerceLowStock, commerceMinorFactor, commerceToMajor } from "../../lib/commerce";

/** Numerator over denominator, or `fallback` (default 0) when the denominator is 0 or either side is not finite. */
export function storeSafeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
  return numerator / denominator;
}

/**
 * Change of `current` against `previous` as a fraction (0.124 is +12.4%). Undefined when there is nothing to compare:
 * no previous period, or a previous of 0 with something now (infinite growth). 0 against 0 is 0. A negative previous
 * uses its absolute value so the sign still says up or down.
 */
export function storePeriodChange(current: number, previous: number | undefined): number | undefined {
  if (previous === undefined || !Number.isFinite(previous) || !Number.isFinite(current)) return undefined;
  if (previous === 0) return current === 0 ? 0 : undefined;
  return (current - previous) / Math.abs(previous);
}

/** Average order value in minor units, rounded to a whole unit. 0 with no orders. */
export function storeAverageOrderValue(sales: number, orders: number): number {
  return Math.round(storeSafeDivide(sales, orders));
}

/** Share of sessions that ended in an order, clamped to 0..1 (orders can never exceed what the sessions allow). */
export function storeConversionRate(orders: number, sessions: number): number {
  return Math.min(1, Math.max(0, storeSafeDivide(orders, sessions)));
}

/** Share of customers who had bought before, clamped to 0..1. */
export function storeReturningRate(returning: number, customers: number): number {
  return Math.min(1, Math.max(0, storeSafeDivide(returning, customers)));
}

/** What one period adds up to. Sales are minor units, the rest are counts. */
export interface StorePeriodTotals {
  sales: number;
  orders: number;
  sessions: number;
  /** Distinct customers who ordered. */
  customers: number;
  /** Of those, the ones with an earlier order. */
  returningCustomers: number;
  /** Sessions that added something to the cart. */
  addToCart: number;
  /** Sessions that reached checkout. */
  checkouts: number;
}

export interface StoreKpi {
  value: number;
  previous?: number;
  /** Fraction against the previous period, undefined when it cannot be computed. */
  change?: number;
}

export interface StoreKpis {
  sales: StoreKpi;
  orders: StoreKpi;
  aov: StoreKpi;
  conversion: StoreKpi;
  returning: StoreKpi;
}

const kpi = (value: number, previous?: number): StoreKpi => ({ value, previous, change: storePeriodChange(value, previous) });

/** The five headline KPIs of a period, each compared with the previous period when one is given. */
export function storeKpis(current: StorePeriodTotals, previous?: StorePeriodTotals): StoreKpis {
  return {
    sales: kpi(current.sales, previous?.sales),
    orders: kpi(current.orders, previous?.orders),
    aov: kpi(storeAverageOrderValue(current.sales, current.orders), previous && storeAverageOrderValue(previous.sales, previous.orders)),
    conversion: kpi(storeConversionRate(current.orders, current.sessions), previous && storeConversionRate(previous.orders, previous.sessions)),
    returning: kpi(storeReturningRate(current.returningCustomers, current.customers), previous && storeReturningRate(previous.returningCustomers, previous.customers)),
  };
}

/** One day (or hour) of the sales chart. */
export interface StoreSalesPoint {
  date: string;
  /** Minor units. */
  sales: number;
  orders: number;
  sessions: number;
}

/** Adds up the sales, orders and sessions of a series. */
export function storeSeriesTotals(points: readonly StoreSalesPoint[]): Pick<StorePeriodTotals, "sales" | "orders" | "sessions"> {
  return points.reduce((t, p) => ({ sales: t.sales + p.sales, orders: t.orders + p.orders, sessions: t.sessions + p.sessions }), { sales: 0, orders: 0, sessions: 0 });
}

export interface StoreFunnelCounts {
  sessions: number;
  addToCart: number;
  checkout: number;
  purchase: number;
}

/**
 * Sessions, add to cart, checkout, purchase. Each step is capped by the one before it (a funnel never widens), and
 * negatives and fractions are cleaned, so bad input still draws a valid funnel.
 */
export function storeFunnelCounts(totals: Pick<StorePeriodTotals, "sessions" | "addToCart" | "checkouts" | "orders">): StoreFunnelCounts {
  const clean = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  const sessions = clean(totals.sessions);
  const addToCart = Math.min(sessions, clean(totals.addToCart));
  const checkout = Math.min(addToCart, clean(totals.checkouts));
  const purchase = Math.min(checkout, clean(totals.orders));
  return { sessions, addToCart, checkout, purchase };
}

/** Stock at or under this is "low". Out of stock (0 or less) is its own state. Promoted to the shared model. */
export const STORE_LOW_STOCK_DEFAULT = COMMERCE_LOW_STOCK_DEFAULT;

export type StoreStockLevel = CommerceLowStockItem["level"];

export type StoreLowStockItem = CommerceLowStockItem;

/** Variants that need restocking. Promoted to the shared model as `commerceLowStock`; this is the same function. */
export const storeLowStock = commerceLowStock;

/** The `n` largest rows by `value`, ties kept in input order. Does not mutate. */
export function storeTopN<T extends { value: number }>(rows: readonly T[], n: number): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.value - a.r.value || a.i - b.i)
    .slice(0, Math.max(0, n))
    .map((x) => x.r);
}
/** Minor units per major unit for an ISO currency. Promoted to the shared model as `commerceMinorFactor`. */
export const storeMinorFactor = commerceMinorFactor;

/** Minor units to the major amount Intl expects. Promoted to the shared model as `commerceToMajor`. */
export const storeToMajor = commerceToMajor;
