import { startOfDay } from "../calendar/calendar-math";
import { formatNumber } from "../numeric";

export interface HeatmapDatum {
  /** A `Date`, or a local day string `"2026-09-29"`. Times are ignored. */
  date: Date | string;
  count: number;
}

export const HEATMAP_STRINGS = {
  en: { less: "Less", more: "More", grid: "Activity by day" },
  ar: { less: "أقل", more: "أكثر", grid: "النشاط حسب اليوم" },
} as const;

export const heatmapStrings = (locale: string) => HEATMAP_STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

/** "5 contributions" / "٥ مساهمات" with the language's plural forms. */
export function defaultCount(count: number, locale: string) {
  const n = formatNumber(count, locale);
  if (locale.split("-")[0] === "ar") {
    switch (new Intl.PluralRules("ar").select(count)) {
      case "zero":
        return "لا مساهمات";
      case "one":
        return "مساهمة واحدة";
      case "two":
        return "مساهمتان";
      case "few":
        return `${n} مساهمات`;
      default:
        return `${n} مساهمة`;
    }
  }
  return count === 0 ? "No contributions" : count === 1 ? "1 contribution" : `${n} contributions`;
}

/** The parsed local day of a `Date` or `"YYYY-MM-DD"` string. Strings are read as local days, never UTC. */
export function parseHeatmapDay(value: Date | string): Date {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return startOfDay(new Date(value));
}

/**
 * Intensity level 0 to 4 for a count. With no `thresholds` the levels are quarters of `max`
 * (`ceil(count / max * 4)`); `thresholds` are the smallest counts of levels 1 to 4, ascending.
 */
export function heatmapLevel(count: number, max: number, thresholds?: readonly [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (!(count > 0) || !(max > 0)) return 0;
  if (thresholds) {
    let level = 0;
    thresholds.forEach((t, i) => {
      if (count >= t) level = i + 1;
    });
    return level as 0 | 1 | 2 | 3 | 4;
  }
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
}

/** Five steps of one token colour, from an empty cell to the full colour. `--heat` is set on the root. */
export const LEVEL_CLASS = [
  "bg-[color-mix(in_oklab,var(--heat)_9%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_35%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_55%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_78%,transparent)]",
  "bg-[var(--heat)]",
] as const;
