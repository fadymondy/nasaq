import type { FormatNumberOptions } from "../numeric";

export interface TimeSeriesMetric {
  id: string;
  /** Localised name. */
  label: string;
  /** Intl options for tooltip and total. Default: plain number. */
  format?: FormatNumberOptions;
  /** Token colour such as `var(--nq-tag-teal)`. Default: the brand colour. */
  color?: string;
  /** "sum" (default) for counts, "avg" for rates and positions. */
  aggregate?: "sum" | "avg";
  /** Lower is better, so the axis runs top-down (average position) and a fall reads as an improvement. */
  lowerIsBetter?: boolean;
}

/** One row per day (or hour): `date` plus a number for each metric id. */
export interface TimeSeriesPoint {
  date: string;
  [metric: string]: number | string;
}

export interface TimeSeriesReferenceLine {
  value: number;
  label: string;
  tone?: "success" | "warning" | "danger";
}
