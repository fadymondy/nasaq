import type { BoardItem } from "../dashboard-board";

/** One row of a sales breakdown (category, channel, city). `value` is sales in minor units. */
export interface StoreBreakdownRow {
  id: string;
  /** Localised name. */
  label: string;
  value: number;
  /** The same figure for the previous period, minor units. Adds the change column. */
  previous?: number;
}

export interface StoreTopProduct {
  id: string;
  name: string;
  /** Image URL. A neutral placeholder shows when it is missing or fails to load. */
  image?: string;
  units: number;
  /** Revenue in minor units. */
  revenue: number;
  previousRevenue?: number;
}

export interface StoreLiveVisitors {
  count: number;
  /** Visitors per minute, oldest first, for the trend line. */
  history?: readonly number[];
}

/** The board a store starts with: the chart across, then funnel and top lists, then stock and orders. */
export const STORE_DASHBOARD_LAYOUT: readonly BoardItem[] = [
  { id: "sales", type: "sales", cols: 4, rows: 3 },
  { id: "funnel", type: "funnel", cols: 2, rows: 4 },
  { id: "top-products", type: "top-products", cols: 2, rows: 2 },
  { id: "categories", type: "categories", cols: 2, rows: 2 },
  { id: "channels", type: "channels", cols: 2, rows: 2 },
  { id: "cities", type: "cities", cols: 2, rows: 2 },
  { id: "low-stock", type: "low-stock", cols: 2, rows: 2 },
  { id: "recent-orders", type: "recent-orders", cols: 2, rows: 2 },
];
