"use client";

import { type CSSProperties, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { addDays, dayKey, endOfWeek, getWeekStartsOn, startOfDay, startOfWeek, type WeekDay } from "../calendar/calendar-math";
import { useCalendarLocale } from "../calendar";
import { DateTime, formatDate, formatNumber } from "../numeric";
import { Tooltip } from "../tooltip";

export interface HeatmapDatum {
  /** A `Date`, or a local day string `"2026-09-29"`. Times are ignored. */
  date: Date | string;
  count: number;
}

const STRINGS = {
  en: { less: "Less", more: "More", grid: "Activity by day" },
  ar: { less: "أقل", more: "أكثر", grid: "النشاط حسب اليوم" },
} as const;

const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

/** "5 contributions" / "٥ مساهمات" with the language's plural forms. */
function defaultCount(count: number, locale: string) {
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
const LEVEL_CLASS = [
  "bg-[color-mix(in_oklab,var(--heat)_9%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_35%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_55%,transparent)]",
  "bg-[color-mix(in_oklab,var(--heat)_78%,transparent)]",
  "bg-[var(--heat)]",
] as const;

export interface HeatmapProps {
  data: readonly HeatmapDatum[];
  /** First day of the range. Default: 52 weeks before `to`. */
  from?: Date | string;
  /** Last day of the range. Default: today. */
  to?: Date | string;
  /** Any CSS colour, normally a token: `var(--nq-tag-teal)`. Default `var(--primary)`. */
  color?: string;
  /** Smallest counts of levels 1 to 4, ascending. Default: quarters of the largest count. */
  thresholds?: readonly [number, number, number, number];
  /** Cell size in px. Default 12. */
  cellSize?: number;
  /** Gap in px. Default 3. */
  gap?: number;
  weekStartsOn?: WeekDay;
  /** Show the "Less ... More" legend. Default true. */
  legend?: boolean;
  /** Text for a count in the tooltip and accessible name. Default is English or Arabic. */
  formatCount?: (count: number) => string;
  locale?: string;
  dir?: "ltr" | "rtl";
  /** Accessible name of the grid. Localise it. */
  label?: string;
  className?: string;
}

/**
 * A contribution grid: one cell per day, one column per week, five intensity levels of one colour. The time axis
 * follows the reading direction, so it runs right to left in Arabic. Cells are tooltip triggers and the grid is a
 * single tab stop with arrow-key navigation.
 */
export function Heatmap({
  data,
  from: fromProp,
  to: toProp,
  color = "var(--primary)",
  thresholds,
  cellSize = 12,
  gap = 3,
  weekStartsOn: weekStartsOnProp,
  legend = true,
  formatCount,
  locale: localeProp,
  dir: dirProp,
  label,
  className,
}: HeatmapProps) {
  const { locale, dir, rtl } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const weekStartsOn = weekStartsOnProp ?? getWeekStartsOn(locale);
  const to = toProp ? parseHeatmapDay(toProp) : startOfDay(new Date());
  const from = fromProp ? parseHeatmapDay(fromProp) : addDays(to, -52 * 7 + 1);
  const count = formatCount ?? ((n: number) => defaultCount(n, locale));

  const { weeks, counts, max } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of data) {
      const key = dayKey(parseHeatmapDay(d.date));
      counts.set(key, (counts.get(key) ?? 0) + d.count);
    }
    const weeks: Date[][] = [];
    let cursor = startOfWeek(from, weekStartsOn);
    const last = endOfWeek(to, weekStartsOn);
    while (cursor <= last) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
      cursor = addDays(cursor, 7);
    }
    let max = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) max = Math.max(max, counts.get(dayKey(d)) ?? 0);
    return { weeks, counts, max };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, from.getTime(), to.getTime(), weekStartsOn]);

  const inRange = (d: Date) => d >= from && d <= to;
  const monthName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);
  const weekdayName = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);

  // Month labels sit on the first week that contains the 1st of a month, skipping one that would touch the previous label.
  const monthLabels = useMemo(() => {
    const labels = new Map<number, string>();
    let lastIndex = -10;
    weeks.forEach((week, i) => {
      const first = week.find((d) => d.getDate() === 1 && inRange(d)) ?? (i === 0 ? week.find(inRange) : undefined);
      if (!first || i - lastIndex < 3) return;
      labels.set(i, monthName.format(first));
      lastIndex = i;
    });
    return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, monthName]);

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const defaultFocus = dayKey(to);
  const activeKey = focusKey ?? defaultFocus;

  const move = (key: string, days: number) => {
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    let next = addDays(new Date(y, m - 1, d), days);
    if (next < from) next = from;
    if (next > to) next = to;
    const nextKey = dayKey(next);
    setFocusKey(nextKey);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-date="${nextKey}"]`)?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = (e.target as HTMLElement).getAttribute("data-date");
    if (!key) return;
    // Time runs against the inline-start edge in RTL, so "toward the end of time" is Left there.
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const step: Record<string, number> = { [forward]: 7, [back]: -7, ArrowDown: 1, ArrowUp: -1 };
    const days = step[e.key];
    if (days === undefined) return;
    e.preventDefault();
    move(key, days);
  };

  const style = { "--heat": color, "--cell": `${cellSize}px`, "--gap": `${gap}px` } as CSSProperties;
  const cell = "size-[var(--cell)] shrink-0 rounded-[3px]";

  return (
    <div ref={root} dir={dir} lang={locale} data-slot="heatmap" style={style} className={cn("inline-flex max-w-full flex-col gap-2 text-caption text-muted-foreground", className)}>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[var(--gap)]">
          <div aria-hidden="true" className="flex flex-col gap-[var(--gap)] pe-1">
            <span className="h-4" />
            {weeks[0]?.map((d, i) => (
              <span key={i} className="flex h-[var(--cell)] items-center whitespace-nowrap leading-none">
                {i % 2 === 1 ? weekdayName.format(d) : ""}
              </span>
            ))}
          </div>
          <div role="grid" aria-label={label ?? t.grid} onKeyDown={onKeyDown} className="flex gap-[var(--gap)]">
            {weeks.map((week, w) => (
              <div key={dayKey(week[0]!)} className="flex flex-col gap-[var(--gap)]">
                <span aria-hidden="true" className="h-4 w-[var(--cell)] overflow-visible whitespace-nowrap leading-4">
                  {monthLabels.get(w)}
                </span>
                <div role="row" className="flex flex-col gap-[var(--gap)]">
                  {week.map((day) => {
                    const key = dayKey(day);
                    if (!inRange(day)) return <span key={key} role="presentation" className={cell} />;
                    const n = counts.get(key) ?? 0;
                    const level = heatmapLevel(n, max, thresholds);
                    const text = `${formatDate(day, locale, { dateStyle: "medium" })}: ${count(n)}`;
                    return (
                      <Tooltip
                        key={key}
                        content={
                          <>
                            <strong className="font-semibold">{count(n)}</strong>
                            <span className="block opacity-80">
                              <DateTime value={day} format={{ dateStyle: "medium" }} />
                            </span>
                          </>
                        }
                      >
                        <div
                          role="gridcell"
                          tabIndex={key === activeKey ? 0 : -1}
                          aria-label={text}
                          data-date={key}
                          data-level={level}
                          onFocus={() => setFocusKey(key)}
                          className={cn(
                            cell,
                            LEVEL_CLASS[level],
                            "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus",
                            "hover:outline hover:outline-1 hover:outline-nq-line-strong",
                          )}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {legend ? (
        <div data-slot="heatmap-legend" className="flex items-center gap-1.5 self-end">
          <span>{t.less}</span>
          <span aria-hidden="true" className="flex gap-[var(--gap)]">
            {LEVEL_CLASS.map((cls, i) => (
              <span key={i} data-level={i} className={cn(cell, cls)} />
            ))}
          </span>
          <span>{t.more}</span>
        </div>
      ) : null}
    </div>
  );
}
