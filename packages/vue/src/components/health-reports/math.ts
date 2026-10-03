/*
 * Pure helpers for the health report: averages that skip missing days, a weight change and a CSV export.
 * A day with no reading for a figure is left out of that figure's average. It is never counted as zero.
 */

export interface ReportDay {
  /** Civil date, `YYYY-MM-DD`. */
  date: string;
  waterMl?: number;
  meals?: { total: number; safe: number; unsafe: number };
  caffeine?: { total: number; sugar: number; clean: number };
  pomodorosCompleted?: number;
  shutdownViolations?: number;
  steps?: number;
  sleepMinutes?: number;
  activeEnergyKcal?: number;
  restingHeartRate?: number;
  weightKg?: number;
}

export type ReportMetric = "waterMl" | "steps" | "sleepMinutes" | "weightKg" | "restingHeartRate" | "activeEnergyKcal";

/** Mean of the defined values, or `null` when there are none. */
export function average(values: readonly (number | undefined | null)[]): number | null {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

export interface ReportSummary {
  days: number;
  /** Days with at least one reading. */
  daysWithData: number;
  averages: Record<Exclude<ReportMetric, "weightKg">, number | null>;
  weight: { first: number; last: number; change: number } | null;
  meals: { total: number; safe: number; unsafe: number };
  caffeine: { total: number; sugar: number; clean: number };
  daysWithShutdownViolations: number;
  pomodoros: number;
}

const FIELDS: (keyof ReportDay)[] = ["waterMl", "meals", "caffeine", "pomodorosCompleted", "shutdownViolations", "steps", "sleepMinutes", "activeEnergyKcal", "restingHeartRate", "weightKg"];

export function summariseReport(days: readonly ReportDay[]): ReportSummary {
  const weights = days.filter((d) => d.weightKg !== undefined);
  const first = weights[0]?.weightKg;
  const last = weights[weights.length - 1]?.weightKg;
  const sum = <K extends "meals" | "caffeine">(key: K, fields: string[]) => {
    const out: Record<string, number> = {};
    for (const f of fields) out[f] = days.reduce((n, d) => n + ((d[key] as Record<string, number> | undefined)?.[f] ?? 0), 0);
    return out;
  };
  return {
    days: days.length,
    daysWithData: days.filter((d) => FIELDS.some((f) => d[f] !== undefined)).length,
    averages: {
      waterMl: average(days.map((d) => d.waterMl)),
      steps: average(days.map((d) => d.steps)),
      sleepMinutes: average(days.map((d) => d.sleepMinutes)),
      restingHeartRate: average(days.map((d) => d.restingHeartRate)),
      activeEnergyKcal: average(days.map((d) => d.activeEnergyKcal)),
    },
    weight: first !== undefined && last !== undefined && weights.length > 1 ? { first, last, change: Math.round((last - first) * 10) / 10 } : null,
    meals: sum("meals", ["total", "safe", "unsafe"]) as ReportSummary["meals"],
    caffeine: sum("caffeine", ["total", "sugar", "clean"]) as ReportSummary["caffeine"],
    daysWithShutdownViolations: days.filter((d) => (d.shutdownViolations ?? 0) > 0).length,
    pomodoros: days.reduce((n, d) => n + (d.pomodorosCompleted ?? 0), 0),
  };
}

/** One point per day for a chart. Days without the reading are `null`, so a line breaks instead of dropping to zero. */
export function metricSeries(days: readonly ReportDay[], metric: ReportMetric): { date: string; value: number | null }[] {
  return days.map((d) => ({ date: d.date, value: d[metric] ?? null }));
}

const CSV_COLUMNS: [string, (d: ReportDay) => number | string | undefined][] = [
  ["date", (d) => d.date],
  ["water_ml", (d) => d.waterMl],
  ["meals_total", (d) => d.meals?.total],
  ["meals_safe", (d) => d.meals?.safe],
  ["meals_unsafe", (d) => d.meals?.unsafe],
  ["caffeine_total", (d) => d.caffeine?.total],
  ["caffeine_sugar", (d) => d.caffeine?.sugar],
  ["caffeine_clean", (d) => d.caffeine?.clean],
  ["pomodoros_completed", (d) => d.pomodorosCompleted],
  ["shutdown_violations", (d) => d.shutdownViolations],
  ["steps", (d) => d.steps],
  ["sleep_minutes", (d) => d.sleepMinutes],
  ["active_energy_kcal", (d) => d.activeEnergyKcal],
  ["resting_heart_rate", (d) => d.restingHeartRate],
  ["weight_kg", (d) => d.weightKg],
];

/** The report as CSV with English column names and empty cells for missing figures. */
export function reportToCsv(days: readonly ReportDay[]): string {
  const rows = days.map((d) => CSV_COLUMNS.map(([, get]) => get(d) ?? "").join(","));
  return [CSV_COLUMNS.map(([name]) => name).join(","), ...rows].join("\n");
}
