"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Calendar, type DateRange, type WeekDay } from "../calendar";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDateRange, type FormatDateOptions } from "../numeric";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  TIME_RANGE_PRESETS,
  type RelativePreset,
  type ResolvedTimeRange,
  type TimeComparison,
  type TimeRangeContext,
  type TimeRangeValue,
  type TimeRangeWeekday,
  addDays,
  comparisonRange,
  currentWeek,
  dayInZone,
  isFutureWeek,
  orderDays,
  parsePreset,
  resolveTimeRange,
  sameTimeRange,
  shiftWeek,
  zoneOffsetLabel,
} from "./time-range-math";

const STRINGS = {
  en: {
    label: "Time range",
    week: "Week",
    custom: "Custom",
    customTitle: "Custom range",
    apply: "Apply",
    cancel: "Cancel",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    thisWeek: "This week",
    compare: "Compare with",
    none: "No comparison",
    previous: "Previous period",
    year: "Same period last year",
    versus: "Compared with",
    pickDays: "Pick the first and last day",
    shortPreset: (n: number, unit: "m" | "h" | "d") => `${n}${unit}`,
    longPreset: (n: number, unit: "m" | "h" | "d") => {
      const word = { m: ["minute", "minutes"], h: ["hour", "hours"], d: ["day", "days"] }[unit];
      return n === 1 ? `Last ${word[0]}` : `Last ${n} ${word[1]}`;
    },
  },
  ar: {
    label: "النطاق الزمني",
    week: "أسبوع",
    custom: "مخصص",
    customTitle: "نطاق مخصص",
    apply: "تطبيق",
    cancel: "إلغاء",
    previousWeek: "الأسبوع السابق",
    nextWeek: "الأسبوع التالي",
    thisWeek: "هذا الأسبوع",
    compare: "المقارنة مع",
    none: "بلا مقارنة",
    previous: "الفترة السابقة",
    year: "الفترة نفسها من العام الماضي",
    versus: "مقارنة مع",
    pickDays: "اختر أول يوم وآخر يوم",
    shortPreset: (n: number, unit: "m" | "h" | "d") => `${n} ${{ m: "د", h: "س", d: "ي" }[unit]}`,
    longPreset: (n: number, unit: "m" | "h" | "d") => {
      const forms = { m: ["دقيقة", "دقيقتين", "دقائق", "دقيقة"], h: ["ساعة", "ساعتين", "ساعات", "ساعة"], d: ["يوم", "يومين", "أيام", "يومًا"] }[unit];
      if (n === 1) return `آخر ${forms[0]}`;
      if (n === 2) return `آخر ${forms[1]}`;
      const cat = new Intl.PluralRules("ar").select(n);
      return `آخر ${n} ${cat === "few" ? forms[2] : forms[3]}`;
    },
  },
};

export type TimeRangePickerLabels = typeof STRINGS.en;

export interface TimeRangePickerProps {
  /** The selected range (controlled). */
  value?: TimeRangeValue;
  /** Initial range when uncontrolled. Default: the last 24 hours. */
  defaultValue?: TimeRangeValue;
  /** Called with the new value and the instants it covers right now (`to` is exclusive). */
  onValueChange?: (value: TimeRangeValue, range: ResolvedTimeRange) => void;
  /** Relative presets to offer, such as `["1h", "6h", "24h", "7d", "30d"]` (the default). */
  presets?: readonly RelativePreset[];
  /** Offer the week navigator. Default true. */
  allowWeek?: boolean;
  /** Offer a custom day range. Default true. */
  allowCustom?: boolean;
  /** Let weeks and custom days reach into the future. Default false. */
  allowFuture?: boolean;
  /** IANA zone the days are read in. Default: the browser's zone. Pass it on the server, and show it to users in shared reports. */
  timeZone?: string;
  /** First day of the week, 0 = Sunday. Default: the locale's. */
  weekStartsOn?: TimeRangeWeekday;
  /** Comparison period (controlled). Passing this or `onComparisonChange` shows the "Compare with" select. */
  comparison?: TimeComparison;
  defaultComparison?: TimeComparison;
  onComparisonChange?: (mode: TimeComparison, range: ResolvedTimeRange | null) => void;
  /** Show the resolved dates under the controls. Default true. */
  showSummary?: boolean;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  className?: string;
  labels?: Partial<TimeRangePickerLabels>;
}

const dayToDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const dateToDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function localeWeekStart(locale: string): TimeRangeWeekday {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const first = l.getWeekInfo?.().firstDay ?? l.weekInfo?.firstDay;
    if (first) return (first % 7) as TimeRangeWeekday;
  } catch {
    /* fall through */
  }
  return 1;
}

/**
 * Picks the window a dashboard or report covers: relative presets (1h, 6h, 24h, 7d, 30d), a week navigator, or custom days,
 * with an optional comparison period. The value is plain data (`{ kind: "relative", preset: "24h" }`, a week start day, or
 * inclusive days) that reads and writes to a URL; days are read in a named time zone so a range means the same thing everywhere.
 */
export function TimeRangePicker({
  value: valueProp,
  defaultValue = { kind: "relative", preset: "24h" },
  onValueChange,
  presets = TIME_RANGE_PRESETS,
  allowWeek = true,
  allowCustom = true,
  allowFuture = false,
  timeZone: timeZoneProp,
  weekStartsOn: weekStartsOnProp,
  comparison: comparisonProp,
  defaultComparison = "none",
  onComparisonChange,
  showSummary = true,
  now: nowProp,
  className,
  labels,
}: TimeRangePickerProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? "en";
  const isRtl = nq?.isRtl ?? false;
  const timeZone = useMemo(() => timeZoneProp ?? browserZone(), [timeZoneProp]);
  const weekStartsOn = weekStartsOnProp ?? localeWeekStart(locale);
  const [inner, setInner] = useState<TimeRangeValue>(defaultValue);
  const value = valueProp ?? inner;
  const [innerCompare, setInnerCompare] = useState<TimeComparison>(defaultComparison);
  const compare = comparisonProp ?? innerCompare;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({ from: null, to: null });

  const ctxFor = (): TimeRangeContext => ({ now: nowProp ?? new Date(), timeZone, weekStartsOn });
  const ctx = ctxFor();
  const range = resolveTimeRange(value, ctx);
  const compared = comparisonRange(value, compare, ctx);

  const commit = (next: TimeRangeValue) => {
    if (sameTimeRange(next, value)) return;
    setInner(next);
    onValueChange?.(next, resolveTimeRange(next, ctxFor()));
  };

  const today = dayInZone(ctx.now!, timeZone);
  const showCompare = comparisonProp !== undefined || onComparisonChange !== undefined;
  const pressed = value.kind === "relative" ? value.preset : value.kind === "week" ? "week" : "";

  const dayOptions: FormatDateOptions = { timeZone, dateStyle: "medium" };
  const summary = (r: ResolvedTimeRange, days: boolean) =>
    days
      ? formatDateRange(r.from, new Date(r.to.getTime() - 1), locale, dayOptions)
      : formatDateRange(r.from, r.to, locale, { timeZone, dateStyle: "medium", timeStyle: "short" });
  const dayBased = value.kind !== "relative";

  const presetLabel = (p: RelativePreset) => {
    const parsed = parsePreset(p)!;
    return { short: t.shortPreset(parsed.amount, parsed.unit), long: t.longPreset(parsed.amount, parsed.unit) };
  };

  const weekLabel = value.kind === "week" ? formatDateRange(dayToDate(value.start), dayToDate(addDays(value.start, 6)), locale, { dateStyle: "medium" }) : "";
  const canNextWeek = value.kind === "week" && (allowFuture || !isFutureWeek(shiftWeek(value, 1), ctx));
  const isThisWeek = value.kind === "week" && value.start === (currentWeek(ctx) as { start: string }).start;

  const customLabel =
    value.kind === "custom"
      ? formatDateRange(dayToDate(orderDays(value.from, value.to).from), dayToDate(orderDays(value.from, value.to).to), locale, { dateStyle: "medium" })
      : t.custom;

  const compareItems: { value: TimeComparison; label: string }[] = [
    { value: "none", label: t.none },
    { value: "previous", label: t.previous },
    { value: "year", label: t.year },
  ];

  const Chevron = isRtl ? ChevronRight : ChevronLeft;
  const ChevronNext = isRtl ? ChevronLeft : ChevronRight;
  const todayDate = dayToDate(today);

  return (
    <div data-slot="time-range-picker" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label={t.label}
          className="max-w-full overflow-x-auto"
          value={pressed ? [pressed] : []}
          onValueChange={(v) => {
            const next = v[0];
            if (!next) return;
            if (next === "week") commit(currentWeek(ctxFor()));
            else commit({ kind: "relative", preset: next as RelativePreset });
          }}
        >
          {presets.map((p) => {
            const l = presetLabel(p);
            return (
              <Toggle key={p} value={p} aria-label={l.long} title={l.long}>
                <span dir="auto">{l.short}</span>
              </Toggle>
            );
          })}
          {allowWeek ? <Toggle value="week">{t.week}</Toggle> : null}
        </ToggleGroup>

        {allowCustom ? (
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) {
                if (value.kind === "custom") {
                  const o = orderDays(value.from, value.to);
                  setDraft({ from: dayToDate(o.from), to: dayToDate(o.to) });
                } else {
                  setDraft({ from: null, to: null });
                }
              }
            }}
          >
            <PopoverTrigger
              render={<Button variant="secondary" size="sm" />}
              data-active={value.kind === "custom" ? "" : undefined}
              className={cn("tabular-nums", value.kind === "custom" && "border-primary bg-nq-selected")}
            >
              <CalendarDays aria-hidden />
              {customLabel}
            </PopoverTrigger>
            <PopoverContent align="start" aria-label={t.customTitle} className="w-auto max-w-[var(--available-width)] p-3" dir={isRtl ? "rtl" : "ltr"} lang={locale}>
              <Calendar
                mode="range"
                autoFocus
                numberOfMonths={1}
                value={draft}
                onValueChange={setDraft}
                today={todayDate}
                max={allowFuture ? undefined : todayDate}
                weekStartsOn={weekStartsOn as WeekDay}
                locale={locale}
                dir={isRtl ? "rtl" : "ltr"}
              />
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <p className="min-w-0 text-caption text-muted-foreground" aria-live="polite">
                  {draft.from && draft.to ? formatDateRange(draft.from, draft.to, locale, { dateStyle: "medium" }) : t.pickDays}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <PopoverClose render={<Button variant="ghost" size="sm" />}>{t.cancel}</PopoverClose>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft.from || !draft.to}
                    onClick={() => {
                      if (!draft.from || !draft.to) return;
                      commit({ kind: "custom", ...orderDays(dateToDay(draft.from), dateToDay(draft.to)) });
                      setOpen(false);
                    }}
                  >
                    {t.apply}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {showCompare ? (
          <Select
            items={compareItems}
            value={compare}
            onValueChange={(v) => {
              if (!v) return;
              const mode = v as TimeComparison;
              setInnerCompare(mode);
              onComparisonChange?.(mode, comparisonRange(value, mode, ctxFor()));
            }}
          >
            <SelectTrigger aria-label={t.compare} className="h-control-sm w-auto min-w-40 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {compareItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {value.kind === "week" ? (
        <div data-slot="time-range-week" className="flex flex-wrap items-center gap-1.5">
          <Button variant="secondary" size="icon-sm" aria-label={t.previousWeek} onClick={() => commit(shiftWeek(value, -1))}>
            <Chevron aria-hidden />
          </Button>
          <span className="min-w-40 text-center text-label tabular-nums" aria-live="polite">
            {weekLabel}
          </span>
          <Button variant="secondary" size="icon-sm" aria-label={t.nextWeek} disabled={!canNextWeek} onClick={() => commit(shiftWeek(value, 1))}>
            <ChevronNext aria-hidden />
          </Button>
          <Button variant="ghost" size="sm" disabled={isThisWeek} onClick={() => commit(currentWeek(ctxFor()))}>
            {t.thisWeek}
          </Button>
        </div>
      ) : null}

      {showSummary ? (
        <p data-slot="time-range-summary" className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <bdi className="tabular-nums text-foreground">{summary(range, dayBased)}</bdi>
          <bdi dir="ltr" title={timeZone}>
            {zoneOffsetLabel(ctx.now!, timeZone)}
          </bdi>
          {compared ? (
            <span>
              {t.versus} <bdi className="tabular-nums">{summary(compared, dayBased)}</bdi>
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
