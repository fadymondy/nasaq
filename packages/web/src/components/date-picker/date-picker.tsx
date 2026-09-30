"use client";

import { Field as BaseField } from "@base-ui/react/field";
import { CalendarDays, Clock } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { Calendar, type DateRange, useCalendarLocale, type WeekDay } from "../calendar";
import { type FormatDateOptions, formatDate, formatDateRange, formatNumber } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

const triggerClass = [
  "flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

const STRINGS = {
  en: { pickDate: "Select a date", pickRange: "Select dates", chooseDate: "Choose date", hour: "Hour", minute: "Minute", period: "AM/PM" },
  ar: { pickDate: "اختر تاريخًا", pickRange: "اختر التواريخ", chooseDate: "اختيار التاريخ", hour: "الساعة", minute: "الدقيقة", period: "ص/م" },
} as const;
const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

const WIDE = "(min-width: 640px)";
function useWide() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

interface PickerCommon {
  /** Text shown when nothing is picked. Localised for English and Arabic by default. */
  placeholder?: string;
  disabled?: boolean;
  /** Earliest / latest pickable day. */
  min?: Date;
  max?: Date;
  /** Days that cannot be picked. */
  disabledDates?: Date[] | ((date: Date) => boolean);
  weekStartsOn?: WeekDay;
  locale?: string;
  dir?: "ltr" | "rtl";
  /** Intl calendar for the labels, e.g. "islamic-umalqura". */
  calendar?: string;
  /** Intl options for the trigger text. Default `{ dateStyle: "medium" }`. */
  format?: FormatDateOptions;
  /** Form field name: a hidden input carries the ISO date(s) (YYYY-MM-DD). */
  name?: string;
  id?: string;
  className?: string;
  /** Accessible name of the popup. */
  popupLabel?: string;
  "aria-label"?: string;
}

export interface DatePickerProps extends PickerCommon {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | null) => void;
}

export interface DateRangePickerProps extends PickerCommon {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
  /** Force one or two months. Default: two from 640px wide, else one. */
  numberOfMonths?: 1 | 2;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface TriggerProps {
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  label: string | null;
  placeholder: string;
  icon: typeof CalendarDays;
}

/** Input-looking button. Field.Control renders as the button, so Field label, description and invalid state apply. */
function PickerTrigger({ id, disabled, ariaLabel, className, label, placeholder, icon: Icon }: TriggerProps) {
  return (
    <PopoverTrigger
      disabled={disabled}
      render={<BaseField.Control render={<button type="button" />} />}
      id={id}
      aria-label={ariaLabel}
      data-slot="date-picker-trigger"
      className={cn(triggerClass, className)}
    >
      <span className={cn("min-w-0 flex-1 truncate text-start tabular-nums", !label && "text-muted-foreground")} data-placeholder={label ? undefined : ""}>
        {label ?? placeholder}
      </span>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </PopoverTrigger>
  );
}

const popupClass = "w-auto max-w-[var(--available-width)] p-3";

export function DatePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  placeholder,
  disabled,
  min,
  max,
  disabledDates,
  weekStartsOn,
  locale: localeProp,
  dir: dirProp,
  calendar,
  format,
  name,
  id,
  className,
  popupLabel,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const [inner, setInner] = useState<Date | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const [open, setOpen] = useState(false);
  const label = value ? formatDate(value, locale, { dateStyle: "medium", ...(calendar ? { calendar } : {}), ...format }) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PickerTrigger id={id} disabled={disabled} ariaLabel={ariaLabel} className={className} label={label} placeholder={placeholder ?? t.pickDate} icon={CalendarDays} />
      {name ? <input type="hidden" name={name} value={value ? iso(value) : ""} /> : null}
      <PopoverContent align="start" dir={dir} lang={locale} aria-label={popupLabel ?? t.chooseDate} className={popupClass}>
        <Calendar
          autoFocus
          value={value}
          onValueChange={(next) => {
            setInner(next);
            onValueChange?.(next);
            setOpen(false);
          }}
          min={min}
          max={max}
          disabled={disabledDates}
          weekStartsOn={weekStartsOn}
          locale={locale}
          dir={dir}
          calendar={calendar}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  numberOfMonths,
  placeholder,
  disabled,
  min,
  max,
  disabledDates,
  weekStartsOn,
  locale: localeProp,
  dir: dirProp,
  calendar,
  format,
  name,
  id,
  className,
  popupLabel,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const wide = useWide();
  const [inner, setInner] = useState<DateRange>(defaultValue ?? { from: null, to: null });
  const value = valueProp ?? inner;
  const [open, setOpen] = useState(false);
  const options: FormatDateOptions = { dateStyle: "medium", ...(calendar ? { calendar } : {}), ...format };
  const label = value.from ? (value.to ? formatDateRange(value.from, value.to, locale, options) : `${formatDate(value.from, locale, options)} –`) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PickerTrigger id={id} disabled={disabled} ariaLabel={ariaLabel} className={className} label={label} placeholder={placeholder ?? t.pickRange} icon={CalendarDays} />
      {name ? (
        <>
          <input type="hidden" name={`${name}-from`} value={value.from ? iso(value.from) : ""} />
          <input type="hidden" name={`${name}-to`} value={value.to ? iso(value.to) : ""} />
        </>
      ) : null}
      <PopoverContent align="start" dir={dir} lang={locale} aria-label={popupLabel ?? t.chooseDate} className={popupClass}>
        <Calendar
          mode="range"
          autoFocus
          numberOfMonths={numberOfMonths ?? (wide ? 2 : 1)}
          value={value}
          onValueChange={(next) => {
            setInner(next);
            onValueChange?.(next);
            if (next.from && next.to) setOpen(false);
          }}
          min={min}
          max={max}
          disabled={disabledDates}
          weekStartsOn={weekStartsOn}
          locale={locale}
          dir={dir}
          calendar={calendar}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface TimePickerProps {
  /** "HH:mm" in 24-hour form, or null/"" for empty. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** 12 or 24 hour display. Default: what the locale uses. */
  hourCycle?: 12 | 24;
  /** Minutes between options. Default 1. */
  minuteStep?: number;
  disabled?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

const segmentClass = [
  "h-control min-h-[var(--nq-touch-min,0px)] appearance-none rounded-control border border-input bg-card px-2.5 text-center text-body tabular-nums text-foreground outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

/** Locale's own AM and PM strings ("AM"/"PM", "ص"/"م"). */
function dayPeriods(locale: string): [string, string] {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true });
  const part = (h: number) => fmt.formatToParts(new Date(2023, 0, 1, h)).find((p) => p.type === "dayPeriod")?.value ?? (h < 12 ? "AM" : "PM");
  return [part(9), part(15)];
}

export function TimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  hourCycle,
  minuteStep = 1,
  disabled,
  locale: localeProp,
  dir: dirProp,
  name,
  id,
  className,
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const localeCycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  const cycle = hourCycle ?? (localeCycle === "h23" || localeCycle === "h24" ? 24 : 12);
  const [hh, mm] = value ? value.split(":").map(Number) : [null, null];
  const hour24 = hh ?? null;
  const minute = mm ?? null;
  const isPm = hour24 !== null && hour24 >= 12;
  const [am, pm] = dayPeriods(locale);
  const two = (n: number) => formatNumber(n, locale, { minimumIntegerDigits: 2 });

  const emit = (h: number | null, m: number | null, pmFlag: boolean) => {
    // A half-filled time is kept as 00 for the missing segment, so the value is always valid.
    let hour = h ?? 0;
    if (cycle === 12) hour = (hour % 12) + (pmFlag ? 12 : 0);
    const next = `${String(hour).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    setInner(next);
    onValueChange?.(next);
  };

  const hours = cycle === 12 ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)) : Array.from({ length: 24 }, (_, i) => i);
  const shownHour = hour24 === null ? "" : String(cycle === 12 ? hour24 % 12 || 12 : hour24);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
  const hourNumber = (n: number) => (cycle === 12 ? formatNumber(n, locale) : two(n));

  return (
    <div role="group" aria-label={ariaLabel} dir={dir} lang={locale} data-slot="time-picker" className={cn("inline-flex items-center gap-1.5", className)}>
      <BaseField.Control
        render={<select />}
        id={id}
        disabled={disabled}
        aria-label={t.hour}
        data-slot="time-picker-hour"
        className={cn(segmentClass)}
        value={shownHour}
        onChange={(event: { target: { value: string } }) => {
          const n = Number(event.target.value);
          emit(n, minute, isPm);
        }}
      >
        <option value="" disabled hidden>
          --
        </option>
        {hours.map((n) => (
          <option key={n} value={n}>
            {hourNumber(n)}
          </option>
        ))}
      </BaseField.Control>
      <span aria-hidden="true" className="text-muted-foreground">
        :
      </span>
      <select
        aria-label={t.minute}
        disabled={disabled}
        data-slot="time-picker-minute"
        className={cn(segmentClass)}
        value={minute === null ? "" : String(minute)}
        onChange={(event) => emit(hour24, Number(event.target.value), isPm)}
      >
        <option value="" disabled hidden>
          --
        </option>
        {minutes.map((n) => (
          <option key={n} value={n}>
            {two(n)}
          </option>
        ))}
      </select>
      {cycle === 12 ? (
        <select
          aria-label={t.period}
          disabled={disabled}
          data-slot="time-picker-period"
          className={cn(segmentClass)}
          value={isPm ? "pm" : "am"}
          onChange={(event) => emit(hour24, minute, event.target.value === "pm")}
        >
          <option value="am">{am}</option>
          <option value="pm">{pm}</option>
        </select>
      ) : null}
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <Clock aria-hidden="true" className="ms-1 size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
