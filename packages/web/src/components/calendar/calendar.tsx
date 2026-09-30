"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { type FormatDateOptions, formatDate } from "../numeric";
import {
  addDays,
  addMonths,
  clampDay,
  compareDays,
  dayKey,
  endOfWeek,
  getWeekStartsOn,
  isSameDay,
  isSameMonth,
  monthMatrix,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type WeekDay,
  weekOrder,
} from "./calendar-math";

export type { WeekDay } from "./calendar-math";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface CalendarBaseProps extends Omit<ComponentProps<"div">, "value" | "defaultValue" | "onChange" | "dir"> {
  /** The first visible month (any day in it). Controlled. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Months shown side by side. Outside days are hidden when more than one month is shown. */
  numberOfMonths?: 1 | 2;
  /** Earliest / latest selectable day. */
  min?: Date;
  max?: Date;
  /** Days that cannot be picked: a list of dates or a predicate. */
  disabled?: Date[] | ((date: Date) => boolean);
  /** Render the days of the neighbouring months that pad the first and last week. Default true. */
  showOutsideDays?: boolean;
  /** Always render six weeks so the grid keeps its height while the month changes. */
  fixedWeeks?: boolean;
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's first day of the week. */
  weekStartsOn?: WeekDay;
  /** BCP 47 locale. Defaults to the active NasaqProvider locale ("en" outside one). */
  locale?: string;
  /** Force a direction. Defaults to the direction of the locale. */
  dir?: "ltr" | "rtl";
  /** Intl calendar for the labels, e.g. "islamic-umalqura". Only the labels change; the grid stays Gregorian. */
  calendar?: string;
  /** Overrides "today" (for tests and stories). */
  today?: Date;
  /** Focus the selected (or today's) day on mount. */
  autoFocus?: boolean;
  /** Accessible names of the month buttons. Localised for English and Arabic by default. */
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single";
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | null) => void;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range";
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const lang = (locale: string) => locale.split("-")[0] ?? "en";

/** Locale and direction for date components: explicit props win, then the NasaqProvider, then "en"/ltr. */
export function useCalendarLocale({ locale, dir }: { locale?: string; dir?: "ltr" | "rtl" } = {}) {
  const nq = useOptionalNasaq();
  const resolved = locale ?? nq?.locale ?? "en";
  const rtl = dir ? dir === "rtl" : locale || !nq ? RTL_LANGS.has(lang(resolved)) : nq.isRtl;
  return { locale: resolved, rtl, dir: (rtl ? "rtl" : "ltr") as "rtl" | "ltr" };
}

const STRINGS = {
  en: { previous: "Previous month", next: "Next month" },
  ar: { previous: "الشهر السابق", next: "الشهر التالي" },
} as const;

function useControllable<T>(controlled: T | undefined, initial: T): [T, (next: T) => void] {
  const [inner, setInner] = useState(initial);
  return [controlled !== undefined ? controlled : inner, setInner];
}

/**
 * A month grid for picking a day or a range. Native `Date` and `Intl` only: labels, week start and
 * digits follow the active locale. Implements the ARIA grid keyboard pattern.
 */
export function Calendar(props: CalendarProps) {
  const {
    month: monthProp,
    defaultMonth,
    onMonthChange,
    numberOfMonths = 1,
    min,
    max,
    disabled,
    showOutsideDays = true,
    fixedWeeks = false,
    weekStartsOn: weekStartsOnProp,
    locale: localeProp,
    dir: dirProp,
    calendar,
    today: todayProp,
    autoFocus = false,
    previousMonthLabel,
    nextMonthLabel,
    className,
    onKeyDown,
    onMouseLeave,
    mode: _mode,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    ...rest
  } = props;
  const isRange = props.mode === "range";
  const { locale, rtl, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const strings = STRINGS[lang(locale) === "ar" ? "ar" : "en"];
  const weekStartsOn = weekStartsOnProp ?? getWeekStartsOn(locale);
  const today = startOfDay(todayProp ?? new Date());
  const showOutside = showOutsideDays && numberOfMonths === 1;

  const [selection, setSelection] = useControllable<Date | null | DateRange>(props.value, props.defaultValue ?? (isRange ? { from: null, to: null } : null));
  const range = isRange ? ((selection as DateRange | null) ?? { from: null, to: null }) : null;
  const single = isRange ? null : (selection as Date | null);

  const anchor = single ?? range?.from ?? today;
  const [month, setMonthState] = useControllable<Date>(monthProp ? startOfMonth(monthProp) : undefined, startOfMonth(defaultMonth ?? clampDay(anchor, min, max)));
  const setMonth = (next: Date) => {
    const m = startOfMonth(next);
    setMonthState(m);
    if (!isSameMonth(m, month)) onMonthChange?.(m);
  };

  const [focusDate, setFocusDate] = useState<Date>(() => clampDay(anchor, min, max));
  const [hover, setHover] = useState<Date | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(autoFocus);

  const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(month, i));
  const lastMonth = months[months.length - 1] as Date;
  const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
  const inView = (d: Date) => compareDays(d, month) >= 0 && compareDays(d, lastDay) <= 0;
  // The one tabbable day: the focused day while it is on screen, else the first of the first month.
  const tabDate = inView(focusDate) ? focusDate : clampDay(month, min, max);

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    root.current?.querySelector<HTMLElement>(`[data-date="${dayKey(tabDate)}"]`)?.focus();
  });

  const isDisabled = useCallback(
    (d: Date) => {
      if ((min && compareDays(d, min) < 0) || (max && compareDays(d, max) > 0)) return true;
      if (Array.isArray(disabled)) return disabled.some((x) => isSameDay(x, d));
      return disabled ? disabled(d) : false;
    },
    [min, max, disabled],
  );

  const commit = (next: Date | null | DateRange) => {
    setSelection(next);
    (props.onValueChange as ((v: Date | null | DateRange) => void) | undefined)?.(next);
  };

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    setFocusDate(d);
    if (!inView(d)) setMonth(d);
    if (range) {
      const { from, to } = range;
      if (!from || to) commit({ from: d, to: null });
      else commit(compareDays(d, from) < 0 ? { from: d, to: from } : { from, to: d });
    } else {
      commit(single && isSameDay(single, d) ? null : d);
    }
  };

  const moveFocus = (target: Date) => {
    const next = clampDay(target, min, max);
    shouldFocus.current = true;
    setFocusDate(next);
    if (compareDays(next, month) < 0) setMonth(next);
    else if (!inView(next)) setMonth(addMonths(startOfMonth(next), -(numberOfMonths - 1)));
    else root.current?.querySelector<HTMLElement>(`[data-date="${dayKey(next)}"]`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.target as HTMLElement).closest("[data-date]")) return;
    // Arrow keys are physical: in RTL, ArrowLeft is the next day.
    const step = rtl ? -1 : 1;
    const from = tabDate;
    const moves: Record<string, Date> = {
      ArrowRight: addDays(from, step),
      ArrowLeft: addDays(from, -step),
      ArrowDown: addDays(from, 7),
      ArrowUp: addDays(from, -7),
      Home: startOfWeek(from, weekStartsOn),
      End: endOfWeek(from, weekStartsOn),
      PageDown: addMonths(from, event.shiftKey ? 12 : 1),
      PageUp: addMonths(from, event.shiftKey ? -12 : -1),
    };
    const target = moves[event.key];
    if (!target) return;
    event.preventDefault();
    moveFocus(target);
  };

  // Range visuals: the committed range, or a preview to the hovered day while the end is still open.
  const previewEnd = range?.from && !range.to ? hover : range?.to;
  const forward = range?.from && previewEnd ? compareDays(range.from, previewEnd) <= 0 : true;
  const lo = range?.from ? (previewEnd && !forward ? previewEnd : range.from) : null;
  const hi = range?.from ? (previewEnd && forward ? previewEnd : range.from) : null;

  const prevBlocked = min ? compareDays(addMonths(month, -1), new Date(min.getFullYear(), min.getMonth(), 1)) < 0 : false;
  const nextBlocked = max ? compareDays(addMonths(month, numberOfMonths), max) > 0 : false;
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const fmt = (d: Date, options: FormatDateOptions) => formatDate(d, locale, { ...options, ...(calendar ? { calendar } : {}) });
  // Any date with the wanted weekday: 2023-01-01 was a Sunday.
  const weekdayDate = (wd: number) => new Date(2023, 0, 1 + wd);

  return (
    <div
      ref={root}
      data-slot="calendar"
      data-mode={isRange ? "range" : "single"}
      dir={dir}
      lang={locale}
      className={cn("inline-flex w-fit flex-col gap-2 text-body-sm text-foreground", className)}
      onKeyDown={handleKeyDown}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setHover(null);
      }}
      {...rest}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-4">
        {months.map((m, index) => {
          const title = fmt(new Date(m.getFullYear(), m.getMonth(), 15), { month: "long", year: "numeric" });
          return (
            <div key={dayKey(m)} data-slot="calendar-month" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                {index === 0 ? (
                  <Button variant="ghost" size="icon-sm" aria-label={previousMonthLabel ?? strings.previous} disabled={prevBlocked} onClick={() => setMonth(addMonths(month, -1))}>
                    <PrevIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <span className="size-control-sm" />
                )}
                <div aria-live="polite" data-slot="calendar-title" className="text-label font-semibold">
                  {title}
                </div>
                {index === months.length - 1 ? (
                  <Button variant="ghost" size="icon-sm" aria-label={nextMonthLabel ?? strings.next} disabled={nextBlocked} onClick={() => setMonth(addMonths(month, 1))}>
                    <NextIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <span className="size-control-sm" />
                )}
              </div>
              <table role="grid" aria-label={title} data-slot="calendar-grid" className="border-separate border-spacing-0">
                <thead>
                  <tr>
                    {weekOrder(weekStartsOn).map((wd) => (
                      <th key={wd} scope="col" className="size-9 p-0 text-caption font-medium text-muted-foreground">
                        <span aria-hidden="true">{fmt(weekdayDate(wd), { weekday: "narrow" })}</span>
                        <span className="sr-only">{fmt(weekdayDate(wd), { weekday: "long" })}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthMatrix(m, weekStartsOn, fixedWeeks).map((week) => (
                    <tr key={dayKey(week[0] as Date)}>
                      {week.map((d) => {
                        const outside = !isSameMonth(d, m);
                        if (outside && !showOutside) return <td key={dayKey(d)} role="gridcell" />;
                        const off = isDisabled(d);
                        const selected = range ? Boolean((range.from && isSameDay(range.from, d)) || (range.to && isSameDay(range.to, d))) : Boolean(single && isSameDay(single, d));
                        const inRange = Boolean(lo && hi && compareDays(d, lo) >= 0 && compareDays(d, hi) <= 0);
                        const isStart = Boolean(lo && isSameDay(d, lo));
                        const isEnd = Boolean(hi && isSameDay(d, hi));
                        const band = inRange && !(isStart && isEnd);
                        return (
                          <td
                            key={dayKey(d)}
                            role="gridcell"
                            aria-selected={selected || undefined}
                            data-in-range={band ? "" : undefined}
                            className={cn("p-0 text-center", band && "bg-nq-selected", band && isStart && "rounded-s-control", band && isEnd && "rounded-e-control")}
                          >
                            <button
                              type="button"
                              tabIndex={isSameDay(d, tabDate) ? 0 : -1}
                              data-date={dayKey(d)}
                              data-selected={selected ? "" : undefined}
                              data-today={isSameDay(d, today) ? "" : undefined}
                              data-outside={outside ? "" : undefined}
                              data-disabled={off ? "" : undefined}
                              aria-disabled={off || undefined}
                              aria-current={isSameDay(d, today) ? "date" : undefined}
                              aria-label={fmt(d, { dateStyle: "full" })}
                              onClick={() => pick(d)}
                              onFocus={() => {
                                if (!off && range?.from && !range.to) setHover(d);
                              }}
                              onMouseEnter={() => {
                                if (range?.from && !range.to) setHover(d);
                              }}
                              className={cn(
                                "inline-flex size-9 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control border border-transparent text-body-sm tabular-nums outline-none transition-colors duration-150 ease-nq",
                                "hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                                "data-today:border-nq-focus data-outside:text-muted-foreground",
                                "data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:opacity-40 data-disabled:hover:bg-transparent",
                                "data-selected:border-transparent data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary",
                              )}
                            >
                              {fmt(d, { day: "numeric" })}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
