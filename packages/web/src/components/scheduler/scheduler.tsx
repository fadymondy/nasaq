"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Calendar, useCalendarLocale } from "../calendar";
import { addDays, compareDays, dayKey, getWeekStartsOn, isSameDay, isSameMonth, monthMatrix, startOfDay, startOfWeek, type WeekDay } from "../calendar/calendar-math";
import { Icon } from "../icon";
import { type FormatDateOptions, formatDate, formatDateRange, formatNumber } from "../numeric";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "../popover";
import { RadioGroup } from "../radio-group";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  eventBox,
  eventsForDay,
  layoutDayEvents,
  normalizeHours,
  type SchedulerEvent,
  type SchedulerTone,
  type SchedulerView,
  splitChips,
  stepDate,
  timeSlots,
  type WorkingHours,
} from "./scheduler-math";

export type { WeekDay } from "../calendar/calendar-math";
export type { PositionedEvent, SchedulerEvent, SchedulerTone, SchedulerView, WorkingHours } from "./scheduler-math";
export { eventBox, layoutDayEvents, timeSlots } from "./scheduler-math";

const STRINGS = {
  en: {
    day: "Day",
    week: "Week",
    month: "Month",
    views: "View",
    today: "Today",
    previous: { day: "Previous day", week: "Previous week", month: "Previous month" },
    next: { day: "Next day", week: "Next week", month: "Next month" },
    more: (n: string) => `+${n} more`,
    eventsOn: (date: string) => `Events on ${date}`,
    slotsOn: (date: string) => `Available times on ${date}`,
    noSlots: "No times available on this day.",
  },
  ar: {
    day: "يوم",
    week: "أسبوع",
    month: "شهر",
    views: "العرض",
    today: "اليوم",
    previous: { day: "اليوم السابق", week: "الأسبوع السابق", month: "الشهر السابق" },
    next: { day: "اليوم التالي", week: "الأسبوع التالي", month: "الشهر التالي" },
    more: (n: string) => `+${n} أخرى`,
    eventsOn: (date: string) => `الأحداث في ${date}`,
    slotsOn: (date: string) => `الأوقات المتاحة في ${date}`,
    noSlots: "لا توجد أوقات متاحة في هذا اليوم.",
  },
} as const;

/** The days a time view shows: one for "day", seven for "week" (from the week start). */
function viewDays(view: "day" | "week", date: Date, weekStartsOn: WeekDay) {
  const first = view === "day" ? startOfDay(date) : startOfWeek(date, weekStartsOn);
  return Array.from({ length: view === "day" ? 1 : 7 }, (_, i) => addDays(first, i));
}

const useStrings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

function useControllable<T>(controlled: T | undefined, initial: T): [T, (next: T) => void] {
  const [inner, setInner] = useState(initial);
  return [controlled !== undefined ? controlled : inner, setInner];
}

const TONES: Record<SchedulerTone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  brand: "border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground",
  success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
  info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
};

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus";

type TimeOptions = (minutes: boolean) => FormatDateOptions;

export interface SchedulerProps extends Omit<ComponentProps<"div">, "onChange" | "dir" | "defaultValue"> {
  events: SchedulerEvent[];
  /** "day", "week" or "month". Controlled. */
  view?: SchedulerView;
  defaultView?: SchedulerView;
  onViewChange?: (view: SchedulerView) => void;
  /** Any date inside the visible day, week or month. Controlled. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** Visible hours of the day in the day and week views. Default 8 to 18. */
  workingHours?: WorkingHours;
  /** Length of one clickable slot in minutes. Default 30. */
  slotMinutes?: number;
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's first day of the week. */
  weekStartsOn?: WeekDay;
  /** Force 12 or 24 hour time. Defaults to the locale's format. */
  hour12?: boolean;
  /** Chips shown per day in the month view, the last one replaced by "+N more" when there are more events. Default 3. */
  maxChips?: number;
  /** A click on an empty slot (day and week: one slot; month: the whole day). */
  onSlotSelect?: (start: Date, end: Date) => void;
  onEventClick?: (event: SchedulerEvent) => void;
  /** BCP 47 locale. Defaults to the NasaqProvider locale ("en" outside one). */
  locale?: string;
  /** Force a direction. Defaults to the direction of the locale. */
  dir?: "ltr" | "rtl";
  /** Overrides "today" (for tests and stories). */
  today?: Date;
}

/**
 * A day, week or month schedule. Events render as blocks placed by time (overlaps split the column) or as
 * month chips with a "+N more" popover. Read only: clicking an empty slot or an event reports it, nothing is
 * dragged or resized.
 */
export function Scheduler({
  events,
  view: viewProp,
  defaultView = "week",
  onViewChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  workingHours = { start: 8, end: 18 },
  slotMinutes = 30,
  weekStartsOn: weekStartsOnProp,
  hour12,
  maxChips = 3,
  onSlotSelect,
  onEventClick,
  locale: localeProp,
  dir: dirProp,
  today: todayProp,
  className,
  ...rest
}: SchedulerProps) {
  const { locale, rtl, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = useStrings(locale);
  const weekStartsOn = weekStartsOnProp ?? getWeekStartsOn(locale);
  const today = startOfDay(todayProp ?? new Date());
  const [view, setViewState] = useControllable<SchedulerView>(viewProp, defaultView);
  const [date, setDateState] = useControllable<Date>(dateProp, startOfDay(defaultDate ?? today));
  const setView = (next: SchedulerView) => {
    setViewState(next);
    onViewChange?.(next);
  };
  const setDate = (next: Date) => {
    setDateState(next);
    onDateChange?.(next);
  };

  const timeOptions: TimeOptions = (minutes) => ({
    hour: "numeric",
    ...(minutes ? { minute: "2-digit" as const } : {}),
    ...(hour12 === undefined ? {} : { hour12 }),
  });

  const days = view === "month" ? [] : viewDays(view, date, weekStartsOn);
  const title =
    view === "day"
      ? formatDate(date, locale, { dateStyle: "full" })
      : view === "week"
        ? formatDateRange(days[0] as Date, days[6] as Date, locale, { dateStyle: "medium" })
        : formatDate(date, locale, { month: "long", year: "numeric" });

  const shared = { events, locale, today, rtl, timeOptions, onSlotSelect, onEventClick };
  return (
    <div
      data-slot="scheduler"
      data-view={view}
      dir={dir}
      lang={locale}
      className={cn("flex w-full flex-col gap-3 text-body-sm text-foreground", className)}
      {...rest}
    >
      <div data-slot="scheduler-toolbar" className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t.previous[view]} onClick={() => setDate(stepDate(view, date, -1))}>
            <Icon icon={ChevronLeft} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t.next[view]} onClick={() => setDate(stepDate(view, date, 1))}>
            <Icon icon={ChevronRight} />
          </Button>
          <Button size="sm" onClick={() => setDate(view === "month" ? new Date(today.getFullYear(), today.getMonth(), 1) : today)}>
            {t.today}
          </Button>
        </div>
        <h2 aria-live="polite" className="me-auto text-body font-semibold">
          <bdi>{title}</bdi>
        </h2>
        <ToggleGroup aria-label={t.views} value={[view]} onValueChange={(v) => v[0] && setView(v[0] as SchedulerView)}>
          <Toggle value="day">{t.day}</Toggle>
          <Toggle value="week">{t.week}</Toggle>
          <Toggle value="month">{t.month}</Toggle>
        </ToggleGroup>
      </div>
      {view === "month" ? (
        <MonthGrid {...shared} date={date} weekStartsOn={weekStartsOn} maxChips={maxChips} />
      ) : (
        <TimeGrid {...shared} days={days} workingHours={workingHours} slotMinutes={slotMinutes} />
      )}
    </div>
  );
}

interface GridShared {
  events: SchedulerEvent[];
  locale: string;
  today: Date;
  rtl: boolean;
  timeOptions: TimeOptions;
  onSlotSelect?: (start: Date, end: Date) => void;
  onEventClick?: (event: SchedulerEvent) => void;
}

const eventRange = (e: SchedulerEvent, locale: string, opts: FormatDateOptions) => formatDateRange(e.start, e.end, locale, opts);

function TimeGrid({
  days,
  workingHours,
  slotMinutes,
  events,
  locale,
  today,
  rtl,
  timeOptions,
  onSlotSelect,
  onEventClick,
}: GridShared & { days: Date[]; workingHours: WorkingHours; slotMinutes: number }) {
  const hours = normalizeHours(workingHours);
  const slots = timeSlots(hours, slotMinutes);
  const step = Math.max(Math.floor(slotMinutes), 5);
  const rangeStart = hours.start * 60;
  const rangeEnd = hours.end * 60;
  const total = rangeEnd - rangeStart;
  const body = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState({ col: 0, row: 0 });
  const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };
  const at = (day: Date, minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
  const slotLabel = (d: Date) => formatDate(d, locale, { weekday: "long", month: "long", day: "numeric", ...timeOptions(true) });

  const move = (col: number, row: number) => {
    const c = Math.min(Math.max(col, 0), days.length - 1);
    const r = Math.min(Math.max(row, 0), slots.length - 1);
    setFocus({ col: c, row: r });
    body.current?.querySelector<HTMLElement>(`[data-col="${c}"][data-row="${r}"]`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (!cell) return;
    const col = Number(cell.dataset.col);
    const row = Number(cell.dataset.row);
    // Arrow keys are physical: in RTL the columns run right to left.
    const side = rtl ? -1 : 1;
    const target: Record<string, [number, number]> = {
      ArrowDown: [col, row + 1],
      ArrowUp: [col, row - 1],
      ArrowRight: [col + side, row],
      ArrowLeft: [col - side, row],
      Home: [col, 0],
      End: [col, slots.length - 1],
    };
    const next = target[event.key];
    if (!next) return;
    event.preventDefault();
    move(next[0], next[1]);
  };

  return (
    <div data-slot="scheduler-grid" className="overflow-auto rounded-card border border-border bg-card">
      <div className="sticky top-0 z-20 grid border-b border-border bg-card" style={columns}>
        <div />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={dayKey(day)} data-today={isToday || undefined} className="flex flex-col items-center gap-0.5 border-s border-border py-1.5">
              <span className="text-caption text-muted-foreground">{formatDate(day, locale, { weekday: "short" })}</span>
              <span className={cn("flex size-6 items-center justify-center rounded-full text-label tabular-nums", isToday && "bg-primary text-primary-foreground")}>
                {formatNumber(day.getDate(), locale)}
              </span>
            </div>
          );
        })}
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys are delegated to the slot buttons inside */}
      <div ref={body} className="grid" style={columns} onKeyDown={onKeyDown}>
        <div aria-hidden="true">
          {slots.map((m) => (
            <div key={m} className="h-8 pe-2 text-end text-caption text-muted-foreground tabular-nums">
              {m % 60 === 0 ? <span className={cn("relative bg-card", m !== rangeStart && "-top-2")}>{formatDate(at(days[0] as Date, m), locale, timeOptions(false))}</span> : null}
            </div>
          ))}
        </div>
        {days.map((day, col) => (
          <div key={dayKey(day)} data-date={dayKey(day)} className="relative border-s border-border">
            {slots.map((m, row) => {
              const slotStart = at(day, m);
              return (
                <button
                  key={m}
                  type="button"
                  data-slot="scheduler-slot"
                  data-col={col}
                  data-row={row}
                  tabIndex={focus.col === col && focus.row === row ? 0 : -1}
                  aria-label={slotLabel(slotStart)}
                  className={cn("block h-8 w-full border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover", FOCUS, m % 60 !== 0 && "border-dashed")}
                  onFocus={() => setFocus({ col, row })}
                  onClick={() => onSlotSelect?.(slotStart, at(day, m + step))}
                />
              );
            })}
            {layoutDayEvents(events, day, rangeStart, rangeEnd).map((p) => {
              const box = eventBox(p, total);
              const e = p.event;
              const when = eventRange(e, locale, timeOptions(true));
              return (
                <button
                  key={e.id}
                  type="button"
                  data-slot="scheduler-event"
                  data-tone={e.tone ?? "neutral"}
                  aria-label={`${e.title}, ${when}`}
                  className={cn("absolute z-10 flex min-h-0 flex-col items-start overflow-hidden rounded-[4px] border px-1.5 py-0.5 text-start text-caption", TONES[e.tone ?? "neutral"], FOCUS)}
                  style={{
                    top: `${box.top}%`,
                    height: `${box.height}%`,
                    insetInlineStart: `calc(${box.insetInlineStart}% + 1px)`,
                    width: `calc(${box.width}% - 2px)`,
                  }}
                  onClick={() => onEventClick?.(e)}
                >
                  <span className="w-full truncate font-medium">{e.title}</span>
                  {p.height >= 45 ? (
                    <span className="w-full truncate tabular-nums opacity-80">
                      <bdi>{when}</bdi>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  date,
  weekStartsOn,
  maxChips,
  events,
  locale,
  today,
  timeOptions,
  onSlotSelect,
  onEventClick,
}: GridShared & { date: Date; weekStartsOn: WeekDay; maxChips: number }) {
  const t = useStrings(locale);
  const rows = monthMatrix(date, weekStartsOn);
  return (
    <div data-slot="scheduler-grid" className="overflow-hidden rounded-card border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {(rows[0] ?? []).map((d) => (
          <div key={d.getDay()} className="px-2 py-1.5 text-caption text-muted-foreground">
            {formatDate(d, locale, { weekday: "short" })}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={dayKey(row[0] as Date)} className="grid grid-cols-7">
          {row.map((day) => {
            const list = eventsForDay(events, day);
            const { visible, hidden } = splitChips(list, maxChips);
            const outside = !isSameMonth(day, date);
            const isToday = isSameDay(day, today);
            const label = formatDate(day, locale, { dateStyle: "full" });
            return (
              <div
                key={dayKey(day)}
                data-slot="scheduler-day"
                data-date={dayKey(day)}
                data-outside={outside || undefined}
                data-today={isToday || undefined}
                className={cn("flex min-h-24 min-w-0 flex-col gap-0.5 border-b border-s border-border p-1", outside && "bg-secondary/40")}
              >
                <button
                  type="button"
                  aria-label={label}
                  className={cn(
                    "flex size-6 items-center justify-center self-start rounded-full text-label tabular-nums hover:bg-nq-hover",
                    FOCUS,
                    outside && "text-muted-foreground",
                    isToday && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() => onSlotSelect?.(day, addDays(day, 1))}
                >
                  {formatNumber(day.getDate(), locale)}
                </button>
                {visible.map((e) => (
                  <Chip key={e.id} event={e} locale={locale} timeOptions={timeOptions} onEventClick={onEventClick} />
                ))}
                {hidden > 0 ? (
                  <Popover>
                    <PopoverTrigger
                      className={cn("rounded-[4px] px-1.5 py-0.5 text-start text-caption font-medium text-muted-foreground hover:bg-nq-hover hover:text-foreground", FOCUS)}
                    >
                      <bdi>{t.more(formatNumber(hidden, locale))}</bdi>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="flex w-64 flex-col gap-1">
                      <PopoverTitle>{t.eventsOn(label)}</PopoverTitle>
                      {list.map((e) => (
                        <Chip key={e.id} event={e} locale={locale} timeOptions={timeOptions} onEventClick={onEventClick} />
                      ))}
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Chip({
  event,
  locale,
  timeOptions,
  onEventClick,
}: {
  event: SchedulerEvent;
  locale: string;
  timeOptions: TimeOptions;
  onEventClick?: (event: SchedulerEvent) => void;
}) {
  return (
    <button
      type="button"
      data-slot="scheduler-chip"
      data-tone={event.tone ?? "neutral"}
      aria-label={`${event.title}, ${eventRange(event, locale, timeOptions(true))}`}
      className={cn("flex w-full min-w-0 items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-start text-caption", TONES[event.tone ?? "neutral"], FOCUS)}
      onClick={() => onEventClick?.(event)}
    >
      <span className="shrink-0 tabular-nums opacity-80">
        <bdi>{formatDate(event.start, locale, timeOptions(true))}</bdi>
      </span>
      <span className="truncate font-medium">{event.title}</span>
    </button>
  );
}

export interface SchedulerSlot {
  start: Date;
  end?: Date;
  disabled?: boolean;
}

export interface SlotPickerProps extends Omit<ComponentProps<"div">, "onChange" | "dir" | "defaultValue"> {
  /** The bookable times, across any number of days. */
  slots: SchedulerSlot[];
  /** The selected slot's start. Controlled. */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (start: Date) => void;
  /** The day whose slots are listed. Controlled. */
  day?: Date;
  defaultDay?: Date;
  onDayChange?: (day: Date) => void;
  weekStartsOn?: WeekDay;
  /** Force 12 or 24 hour time. Defaults to the locale's format. */
  hour12?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  today?: Date;
  /** Text when the chosen day has no slots. Default "No times available on this day." / Arabic. */
  emptyLabel?: ReactNode;
}

/**
 * A booking picker: a Calendar (days with no free slot are disabled) beside a radio group of the chosen
 * day's times. Arrow keys move and select inside the list; Tab leaves it.
 */
export function SlotPicker({
  slots,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  day: dayProp,
  defaultDay,
  onDayChange,
  weekStartsOn,
  hour12,
  locale: localeProp,
  dir: dirProp,
  today: todayProp,
  emptyLabel,
  className,
  ...rest
}: SlotPickerProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = useStrings(locale);
  const today = startOfDay(todayProp ?? new Date());
  const open = slots.filter((s) => !s.disabled);
  const firstOpen = open.map((s) => startOfDay(s.start)).sort((a, b) => a.getTime() - b.getTime())[0];
  const [value, setValue] = useControllable<Date | null>(valueProp, defaultValue);
  const [day, setDayState] = useControllable<Date>(dayProp, startOfDay(defaultDay ?? value ?? firstOpen ?? today));
  const setDay = (next: Date) => {
    setDayState(next);
    onDayChange?.(next);
  };
  const daySlots = slots.filter((s) => isSameDay(s.start, day)).sort((a, b) => a.start.getTime() - b.start.getTime());
  const dayLabel = formatDate(day, locale, { dateStyle: "full" });
  const fmtTime = (d: Date) => formatDate(d, locale, { hour: "numeric", minute: "2-digit", ...(hour12 === undefined ? {} : { hour12 }) });

  return (
    <div data-slot="slot-picker" dir={dir} lang={locale} className={cn("flex flex-col gap-4 sm:flex-row", className)} {...rest}>
      <Calendar
        value={day}
        onValueChange={(d) => d && setDay(startOfDay(d))}
        locale={locale}
        dir={dir}
        weekStartsOn={weekStartsOn}
        today={today}
        disabled={(d) => compareDays(d, today) < 0 || !open.some((s) => isSameDay(s.start, d))}
      />
      <div data-slot="slot-picker-times" className="flex min-w-48 flex-1 flex-col gap-2">
        <h3 aria-live="polite" className="text-label font-semibold">
          <bdi>{dayLabel}</bdi>
        </h3>
        {daySlots.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{emptyLabel ?? t.noSlots}</p>
        ) : (
          <RadioGroup
            aria-label={t.slotsOn(dayLabel)}
            className="grid grid-cols-2 gap-2"
            value={value && isSameDay(value, day) ? value.getTime() : null}
            onValueChange={(v) => {
              const chosen = daySlots.find((s) => s.start.getTime() === v);
              if (!chosen) return;
              setValue(chosen.start);
              onValueChange?.(chosen.start);
            }}
          >
            {daySlots.map((s) => (
              <BaseRadio.Root
                key={s.start.getTime()}
                value={s.start.getTime()}
                disabled={s.disabled}
                data-slot="slot-picker-slot"
                aria-label={fmtTime(s.start)}
                className={cn(
                  "inline-flex h-control cursor-pointer items-center justify-center rounded-control border border-border bg-card px-3 text-label tabular-nums",
                  "transition-colors duration-150 ease-nq hover:bg-nq-hover",
                  "data-checked:border-primary data-checked:bg-nq-selected",
                  "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:line-through",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                )}
              >
                <bdi>{fmtTime(s.start)}</bdi>
              </BaseRadio.Root>
            ))}
          </RadioGroup>
        )}
      </div>
    </div>
  );
}
