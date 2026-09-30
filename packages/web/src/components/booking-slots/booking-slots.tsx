"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { Ban, CalendarSearch, Lock } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type BookingSlot, countSlots, bookingDayKey, dayPart, firstAvailableDay } from "../booking-flow/booking-math";
import { Button } from "../button";
import { Calendar, useCalendarLocale, type WeekDay } from "../calendar";
import { formatDate } from "../numeric";
import { RadioGroup } from "../radio-group";
import { Skeleton } from "../states";

const STRINGS = {
  en: {
    available: "Available",
    full: "Full",
    held: "Held",
    heldHint: "Someone is booking this time right now. It may free up in a few minutes.",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    timesOn: (day: string) => `Times on ${day}`,
    openCount: (n: number) => `${n} ${n === 1 ? "time" : "times"} available`,
    dayFull: "This day is fully booked.",
    dayClosed: "No times on this day.",
    nextDay: "Go to the next day with a free time",
    legend: "Legend",
    slotLabel: (time: string, state: string) => `${time}, ${state}`,
    noneAhead: "Nothing is free in the coming weeks.",
  },
  ar: {
    available: "متاح",
    full: "محجوز",
    held: "محجوز مؤقتًا",
    heldHint: "شخص آخر يحجز هذا الموعد الآن. قد يتوفر بعد دقائق.",
    morning: "صباحًا",
    afternoon: "بعد الظهر",
    evening: "مساءً",
    timesOn: (day: string) => `المواعيد يوم ${day}`,
    openCount: (n: number) => (n === 1 ? "موعد واحد متاح" : n === 2 ? "موعدان متاحان" : `${n} مواعيد متاحة`),
    dayFull: "هذا اليوم محجوز بالكامل.",
    dayClosed: "لا مواعيد في هذا اليوم.",
    nextDay: "الانتقال إلى أقرب يوم به موعد متاح",
    legend: "دليل الألوان",
    slotLabel: (time: string, state: string) => `${time}، ${state}`,
    noneAhead: "لا يوجد موعد متاح في الأسابيع القادمة.",
  },
};

export type BookingSlotsLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<BookingSlotsLabels>): BookingSlotsLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export interface BookingSlotsProps extends Omit<ComponentProps<"div">, "onChange" | "dir" | "defaultValue"> {
  /** Every time across the days you want to show, with its state. Past times are not listed. */
  slots: readonly BookingSlot[];
  /** The chosen slot's start. Controlled. */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (start: Date) => void;
  /** The day whose times are listed. Controlled. */
  day?: Date;
  defaultDay?: Date;
  onDayChange?: (day: Date) => void;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  /** Show skeleton times while the day loads. */
  loading?: boolean;
  /** Group the times as morning, afternoon and evening when the day has more than 8. Default true. */
  grouped?: boolean;
  weekStartsOn?: WeekDay;
  hour12?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  labels?: Partial<BookingSlotsLabels>;
}

/**
 * The date and time step of a booking: a calendar (days with nothing free are disabled) beside the day's times.
 * Each time is one of available, full or held. A full day offers a jump to the next free day. Arrow keys move
 * and select inside the list; Tab leaves it.
 */
export function BookingSlots({
  slots,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  day: dayProp,
  defaultDay,
  onDayChange,
  now: nowProp,
  loading = false,
  grouped = true,
  weekStartsOn,
  hour12,
  locale: localeProp,
  dir: dirProp,
  labels,
  className,
  ...rest
}: BookingSlotsProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = useLabels(labels);
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  const today = startOfDay(now);
  const [valueInner, setValueInner] = useState<Date | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : valueInner;
  const firstOpen = firstAvailableDay(slots, today);
  const [dayInner, setDayInner] = useState<Date>(startOfDay(defaultDay ?? value ?? firstOpen ?? today));
  const day = dayProp !== undefined ? dayProp : dayInner;
  const setDay = (next: Date) => {
    setDayInner(next);
    onDayChange?.(next);
  };

  const openDays = useMemo(() => new Set(slots.filter((s) => s.state === "available").map((s) => bookingDayKey(s.start))), [slots]);
  const daySlots = useMemo(() => slots.filter((s) => s.state !== "past" && bookingDayKey(s.start) === bookingDayKey(day)).sort((a, b) => a.start.getTime() - b.start.getTime()), [slots, day]);
  const counts = countSlots(daySlots);
  const dayLabel = formatDate(day, locale, { dateStyle: "full" });
  const fmtTime = (d: Date) => formatDate(d, locale, { hour: "numeric", minute: "2-digit", ...(hour12 === undefined ? {} : { hour12 }) });
  const stateLabel = (s: BookingSlot) => (s.state === "full" ? t.full : s.state === "held" ? t.held : t.available);
  const nextFree = firstAvailableDay(slots, new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1));

  const split = grouped && daySlots.length > 8;
  const groups: { key: string; label?: string; items: BookingSlot[] }[] = split
    ? (["morning", "afternoon", "evening"] as const).map((k) => ({ key: k, label: t[k], items: daySlots.filter((s) => dayPart(s.start) === k) })).filter((g) => g.items.length > 0)
    : [{ key: "all", items: daySlots }];

  const tile = (s: BookingSlot): ReactNode => {
    const off = s.state !== "available";
    return (
      <BaseRadio.Root
        key={s.start.getTime()}
        value={s.start.getTime()}
        disabled={off}
        data-slot="booking-slot"
        data-state={s.state}
        aria-label={t.slotLabel(fmtTime(s.start), stateLabel(s))}
        title={s.state === "held" ? t.heldHint : undefined}
        className={cn(
          "inline-flex min-h-control flex-col items-center justify-center gap-0.5 rounded-control border border-border bg-card px-2 py-1.5 text-label tabular-nums outline-none",
          "transition-colors duration-150 ease-nq hover:bg-nq-hover",
          "data-checked:border-primary data-checked:bg-nq-selected",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          "data-disabled:cursor-not-allowed data-disabled:hover:bg-card",
          s.state === "full" && "bg-secondary text-muted-foreground",
          s.state === "held" && "border-dashed text-muted-foreground",
        )}
      >
        <bdi className={cn(s.state === "full" && "line-through")}>{fmtTime(s.start)}</bdi>
        {off ? (
          <span className="inline-flex items-center gap-1 text-caption font-normal">
            {s.state === "full" ? <Ban aria-hidden className="size-3" /> : <Lock aria-hidden className="size-3" />}
            {stateLabel(s)}
          </span>
        ) : null}
      </BaseRadio.Root>
    );
  };

  return (
    <div data-slot="booking-slots" dir={dir} lang={locale} className={cn("flex flex-col gap-4 sm:flex-row", className)} {...rest}>
      <Calendar
        value={day}
        onValueChange={(d) => d && setDay(startOfDay(d))}
        locale={locale}
        dir={dir}
        weekStartsOn={weekStartsOn}
        today={today}
        disabled={(d) => d < today || !openDays.has(bookingDayKey(d))}
        className="self-start"
      />
      <div data-slot="booking-slots-times" className="flex min-w-0 flex-1 flex-col gap-3" aria-busy={loading || undefined}>
        <div className="flex flex-col gap-0.5">
          <h3 aria-live="polite" className="text-label font-semibold">
            <bdi>{dayLabel}</bdi>
          </h3>
          {!loading && daySlots.length > 0 ? (
            <p className="text-caption text-muted-foreground">
              {counts.available > 0 ? t.openCount(counts.available) : t.dayFull}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2" role="status" aria-label="…">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-control" />
            ))}
          </div>
        ) : daySlots.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t.dayClosed}</p>
        ) : (
          <RadioGroup
            aria-label={t.timesOn(dayLabel)}
            className="gap-4"
            value={value && bookingDayKey(value) === bookingDayKey(day) ? value.getTime() : null}
            onValueChange={(v) => {
              const chosen = daySlots.find((s) => s.start.getTime() === v);
              if (!chosen || chosen.state !== "available") return;
              setValueInner(chosen.start);
              onValueChange?.(chosen.start);
            }}
          >
            {groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                {g.label ? <p className="text-caption font-medium text-muted-foreground">{g.label}</p> : null}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">{g.items.map(tile)}</div>
              </div>
            ))}
          </RadioGroup>
        )}

        {!loading && daySlots.length > 0 && counts.available === 0 ? (
          nextFree ? (
            <Button variant="secondary" size="sm" className="self-start" onClick={() => setDay(startOfDay(nextFree))}>
              <CalendarSearch aria-hidden />
              {t.nextDay}
            </Button>
          ) : (
            <p className="text-body-sm text-muted-foreground">{t.noneAhead}</p>
          )
        ) : null}

        <ul aria-label={t.legend} className="m-0 mt-auto flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[3px] border border-border bg-card" />
            {t.available}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[3px] border border-border bg-secondary" />
            {t.full}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[3px] border border-dashed border-border bg-card" />
            {t.held}
          </li>
        </ul>
      </div>
    </div>
  );
}
