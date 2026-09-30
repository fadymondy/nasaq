"use client";

import { Clock, Globe2, MoveRight } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { normalizeForSearch } from "../commands";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../combobox";
import { Input } from "../field";
import {
  detectTimeZone,
  formatTimeSpan,
  formatUtcOffset,
  formatZoneClock,
  formatZoneDate,
  formatZoneDifference,
  isIanaTimeZone,
  isTimeInRange,
  listTimeZones,
  matchTimeZone,
  parseTimeInput,
  stepTimeValue,
  type TimeSpan,
  type TimeValue,
  timeSpanMinutes,
  timeZoneCity,
  timeZoneLongName,
  timeZoneOffsetMinutes,
  timeZoneRegion,
  zoneDayDifference,
} from "./time-fields-model";

const STRINGS = {
  en: {
    time: "Time",
    placeholder: "HH:mm",
    invalid: "Enter a time such as 930 or 09:30.",
    outOfRange: (min: string, max: string) => `Choose a time between ${min} and ${max}.`,
    becomes: "Will be",
    start: "Start",
    end: "End",
    span: "Time span",
    endBeforeStart: "The end must be after the start.",
    overnight: "Next day",
    duration: "Duration",
    zone: "Time zone",
    zonePlaceholder: "Search a city or an offset",
    zoneEmpty: "No time zone matches. Try a city or an offset such as UTC+3.",
    useMine: "Use my time zone",
    yourZone: "Your time zone",
    clear: "Clear",
    open: "Show time zones",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    today: "Today",
    ahead: "from",
    truncated: (shown: number) => `Showing the first ${shown}. Keep typing to narrow the list.`,
    unknownZone: "Unknown time zone",
    now: "Now",
  },
  ar: {
    time: "الوقت",
    placeholder: "س:د",
    invalid: "أدخل وقتًا مثل 930 أو 09:30.",
    outOfRange: (min: string, max: string) => `اختر وقتًا بين ${min} و${max}.`,
    becomes: "سيصبح",
    start: "البداية",
    end: "النهاية",
    span: "المدة الزمنية",
    endBeforeStart: "يجب أن تكون النهاية بعد البداية.",
    overnight: "اليوم التالي",
    duration: "المدة",
    zone: "المنطقة الزمنية",
    zonePlaceholder: "ابحث عن مدينة أو فرق توقيت",
    zoneEmpty: "لا توجد منطقة زمنية مطابقة. جرّب مدينة أو فرقًا مثل UTC+3.",
    useMine: "استخدام منطقتي الزمنية",
    yourZone: "منطقتك الزمنية",
    clear: "مسح",
    open: "عرض المناطق الزمنية",
    tomorrow: "غدًا",
    yesterday: "أمس",
    today: "اليوم",
    ahead: "عن",
    truncated: (shown: number) => `يظهر أول ${shown}. تابع الكتابة لتضييق القائمة.`,
    unknownZone: "منطقة زمنية غير معروفة",
    now: "الآن",
  },
};

export type TimeFieldsLabels = typeof STRINGS.en;

function useTimeFieldsLocale(labels?: Partial<TimeFieldsLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.split("-")[0] === "ar";
  return { locale, ar, t: { ...(ar ? STRINGS.ar : STRINGS.en), ...labels } as TimeFieldsLabels };
}

/** The current time, refreshed every `intervalMs`, unless `fixed` is given (stories and tests). */
function useTimeFieldsNow(fixed?: Date, intervalMs = 1000): Date {
  const [now, setNow] = useState(() => fixed ?? new Date());
  useEffect(() => {
    if (fixed) {
      setNow(fixed);
      return;
    }
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [fixed, intervalMs]);
  return fixed ?? now;
}

/* ------------------------------------------------------------------ TimeField */

export interface TimeFieldProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** The time as "HH:mm" (24 hour), or null / "" when empty. Controlled. */
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  /** Called when a typed time is accepted (on blur or Enter) or an arrow key steps it. `null` when the field is cleared. */
  onValueChange?: (value: TimeValue | null) => void;
  /** Earliest and latest time accepted, "HH:mm". */
  min?: TimeValue;
  max?: TimeValue;
  /** Minutes an arrow key moves the time, snapped to the step. Default 5. PageUp and PageDown move an hour. */
  step?: number;
  /** Accept 24:00 as the end of the day. */
  allowEndOfDay?: boolean;
  /** Hide the "Will be 09:30" preview under the field while typing. */
  hidePreview?: boolean;
  /** An error from outside (for example "The end must be after the start"). Shown under the field in place of the built-in ones. */
  error?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Form field name: a hidden input carries the normalised "HH:mm". */
  name?: string;
  /** Id of the text input, so a `<label htmlFor>` can point at it. */
  inputId?: string;
  placeholder?: string;
  "aria-label"?: string;
  labels?: Partial<TimeFieldsLabels>;
}

/**
 * A 24 hour time field you type into. Type 930 and it becomes 09:30; 9 becomes 09:00, 9.30, 9:30 and 0930 all work, so does
 * 9:30 pm. Arrow keys step by `step` minutes, PageUp and PageDown by an hour, Escape puts back the last accepted time. A time
 * outside `min` and `max` or one that is not a time is refused with a message. Digits typed on an Arabic keyboard are read too.
 * For picking from lists use `TimePicker` in the date picker.
 */
export function TimeField({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 5,
  allowEndOfDay = false,
  hidePreview = false,
  error,
  disabled,
  readOnly,
  required,
  name,
  inputId,
  placeholder,
  labels,
  className,
  "aria-label": ariaLabel,
  ...props
}: TimeFieldProps) {
  const { t } = useTimeFieldsLocale(labels);
  const autoId = useId();
  const id = inputId ?? `${autoId}-input`;
  const messageId = `${autoId}-message`;
  const [inner, setInner] = useState<TimeValue | null>(defaultValue || null);
  const value = valueProp !== undefined ? valueProp || null : inner;
  const [text, setText] = useState(value ?? "");
  const [problem, setProblem] = useState<"invalid" | "range" | null>(null);
  const typing = useRef(false);

  // Follow the value when it changes from outside, but never overwrite what a person is typing.
  useEffect(() => {
    if (!typing.current) {
      setText(value ?? "");
      setProblem(null);
    }
  }, [value]);

  const commit = (next: TimeValue | null) => {
    setInner(next);
    setText(next ?? "");
    setProblem(null);
    if (next !== value) onValueChange?.(next);
  };

  const accept = (raw: string) => {
    typing.current = false;
    if (!raw.trim()) return commit(null);
    const parsed = parseTimeInput(raw, { allowEndOfDay });
    if (!parsed) return setProblem("invalid");
    if (!isTimeInRange(parsed, min, max)) return setProblem("range");
    commit(parsed);
  };

  const parsedNow = text.trim() ? parseTimeInput(text, { allowEndOfDay }) : null;
  const preview = !hidePreview && parsedNow && parsedNow !== text.trim() && !problem ? parsedNow : null;
  const message = error ?? (problem === "invalid" ? t.invalid : problem === "range" ? t.outOfRange(min ?? "00:00", max ?? "23:59") : null);
  const invalid = Boolean(message);

  const stepBy = (delta: number) => {
    typing.current = false;
    const current = parseTimeInput(text, { allowEndOfDay }) ?? value;
    commit(stepTimeValue(current, delta, { min, max }));
  };

  return (
    <div data-slot="time-field" className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>
      <div className="relative">
        <Clock aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input
          id={id}
          ltr
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder ?? t.placeholder}
          aria-label={ariaLabel ?? (inputId ? undefined : t.time)}
          aria-invalid={invalid || undefined}
          aria-describedby={message || preview ? messageId : undefined}
          className="ps-9 tabular-nums"
          onChange={(event) => {
            typing.current = true;
            setText(event.target.value);
            if (problem) setProblem(null);
          }}
          onBlur={(event) => accept(event.target.value)}
          onKeyDown={(event) => {
            if (readOnly || disabled) return;
            if (event.key === "Enter") {
              accept((event.target as HTMLInputElement).value);
            } else if (event.key === "Escape") {
              typing.current = false;
              setText(value ?? "");
              setProblem(null);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              stepBy(step);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              stepBy(-step);
            } else if (event.key === "PageUp") {
              event.preventDefault();
              stepBy(60);
            } else if (event.key === "PageDown") {
              event.preventDefault();
              stepBy(-60);
            }
          }}
        />
        {name && <input type="hidden" name={name} value={value ?? ""} />}
      </div>
      <p id={messageId} aria-live="polite" className={cn("min-h-4 text-caption empty:hidden", invalid ? "text-nq-danger-text" : "text-muted-foreground")}>
        {message ??
          (preview ? (
            <>
              {t.becomes} <bdi dir="ltr" className="font-mono text-foreground">{preview}</bdi>
            </>
          ) : null)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ TimeSpanField */

export interface TimeSpanFieldProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** Start and end as "HH:mm". Controlled. */
  value?: TimeSpan;
  defaultValue?: TimeSpan;
  onValueChange?: (value: TimeSpan) => void;
  /** An end before the start means the next day (a night shift), shown with a badge. Default false: it is an error. */
  allowOvernight?: boolean;
  /** Show the length ("8h 30m") after the two fields. Default true. */
  showDuration?: boolean;
  step?: number;
  min?: TimeValue;
  max?: TimeValue;
  disabled?: boolean;
  labels?: Partial<TimeFieldsLabels>;
}

/**
 * A start and an end time side by side, for opening hours, shifts and quiet hours. Each side is a `TimeField`, so 800 and 1730
 * are enough. It shows how long the span is, and an end before the start is an error unless `allowOvernight` makes it the next day.
 */
export function TimeSpanField({
  value: valueProp,
  defaultValue = { start: "09:00", end: "17:00" },
  onValueChange,
  allowOvernight = false,
  showDuration = true,
  step,
  min,
  max,
  disabled,
  labels,
  className,
  ...props
}: TimeSpanFieldProps) {
  const { t, locale } = useTimeFieldsLocale(labels);
  const [inner, setInner] = useState<TimeSpan>(defaultValue);
  const span = valueProp ?? inner;
  const update = (patch: Partial<TimeSpan>) => {
    const next = { ...span, ...patch };
    setInner(next);
    onValueChange?.(next);
  };
  const minutes = timeSpanMinutes(span, allowOvernight);
  const overnight = allowOvernight && span.end < span.start;
  const backwards = !allowOvernight && span.start && span.end && span.end < span.start;

  return (
    <div data-slot="time-span-field" role="group" aria-label={t.span} className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <TimeField
          value={span.start || null}
          onValueChange={(v) => update({ start: v ?? "" })}
          aria-label={t.start}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          labels={labels}
          className="w-32"
        />
        <MoveRight aria-hidden="true" className="mt-2.5 size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        <TimeField
          value={span.end || null}
          onValueChange={(v) => update({ end: v ?? "" })}
          aria-label={t.end}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          labels={labels}
          error={backwards ? t.endBeforeStart : undefined}
          className="w-32"
        />
        {overnight && (
          <Badge variant="info" className="mt-1.5">
            {t.overnight}
          </Badge>
        )}
      </div>
      {showDuration && minutes !== null && (
        <p className="text-caption text-muted-foreground">
          {t.duration}: <bdi dir="ltr" className="font-medium text-foreground tabular-nums">{formatTimeSpan(minutes, locale)}</bdi>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ TimeZoneClock */

export interface TimeZoneClockProps extends Omit<ComponentProps<"div">, "children"> {
  /** IANA zone name, "Asia/Riyadh". */
  timeZone: string;
  /** Overrides the city shown ("Head office"). */
  label?: ReactNode;
  /** Show seconds and tick every second. Default false (the minute still updates on time). */
  seconds?: boolean;
  /** 12 or 24 hour clock. Default: what the language uses. */
  hourCycle?: 12 | 24;
  /** Another zone to compare with: shows "+2h from Cairo" and "Tomorrow" when the day differs. */
  reference?: string;
  /** Show the date under the clock. Default true. */
  showDate?: boolean;
  /** Show the UTC offset. Default true. */
  showOffset?: boolean;
  /** Freeze the clock at a moment, for tests and stories. */
  now?: Date;
  size?: "sm" | "md" | "lg";
  labels?: Partial<TimeFieldsLabels>;
}

const clockSize = { sm: "text-h3", md: "text-h2", lg: "text-display" } as const;

/**
 * A live clock for one time zone: the city, the time ticking, the date and the UTC offset, optionally compared with a reference
 * zone. It uses `Intl` only, so daylight saving is right without a table. The digits are Latin in Arabic too.
 */
export function TimeZoneClock({ timeZone, label, seconds = false, hourCycle, reference, showDate = true, showOffset = true, now: fixed, size = "md", labels, className, ...props }: TimeZoneClockProps) {
  const { t, locale, ar } = useTimeFieldsLocale(labels);
  const now = useTimeFieldsNow(fixed, 1000);
  if (!isIanaTimeZone(timeZone)) {
    return (
      <div data-slot="time-zone-clock" className={cn("text-body-sm text-muted-foreground", className)} {...props}>
        {t.unknownZone}: <bdi dir="ltr">{timeZone}</bdi>
      </div>
    );
  }
  const offset = timeZoneOffsetMinutes(now, timeZone);
  const diff = reference && isIanaTimeZone(reference) ? offset - timeZoneOffsetMinutes(now, reference) : null;
  const dayShift = reference && isIanaTimeZone(reference) ? zoneDayDifference(now, timeZone, reference) : 0;
  const clock = formatZoneClock(now, timeZone, { locale, seconds, hourCycle });
  return (
    <div data-slot="time-zone-clock" className={cn("flex min-w-0 flex-col gap-0.5", className)} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-label text-foreground">{label ?? timeZoneCity(timeZone)}</span>
        {showOffset && (
          <bdi dir="ltr" className="shrink-0 font-mono text-caption text-muted-foreground">
            {formatUtcOffset(offset)}
          </bdi>
        )}
      </div>
      <time dateTime={now.toISOString()} dir="ltr" className={cn("font-semibold tabular-nums text-foreground", clockSize[size], ar && "text-start")}>
        {clock}
      </time>
      {(showDate || diff !== null) && (
        <div className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          {showDate && <span>{formatZoneDate(now, timeZone, locale)}</span>}
          {dayShift !== 0 && <Badge variant="neutral">{dayShift > 0 ? t.tomorrow : t.yesterday}</Badge>}
          {diff !== null && diff !== 0 && (
            <span>
              <bdi dir="ltr">{formatZoneDifference(diff, locale)}</bdi> {t.ahead} {timeZoneCity(reference as string)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ TimeZoneField */

export interface TimeZoneFieldProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** IANA zone name. Controlled. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (timeZone: string) => void;
  /** The zones to choose from. Default: every zone the browser knows, from `Intl.supportedValuesOf`. */
  zones?: readonly string[];
  /** Compare every zone with this one: "+3h from Cairo". Default none. */
  reference?: string;
  /** Show the live clock of the chosen zone under the field. Default true. */
  showClock?: boolean;
  /** Offer a "Use my time zone" button. Default true. */
  showDetect?: boolean;
  seconds?: boolean;
  hourCycle?: 12 | 24;
  /** Most zones listed at once. Default 60; the list says when it is cut. */
  limit?: number;
  /** Freeze the clocks at a moment, for tests and stories. */
  now?: Date;
  placeholder?: string;
  disabled?: boolean;
  /** Form field name: a hidden input carries the zone. */
  name?: string;
  /** Id of the search input. */
  inputId?: string;
  "aria-label"?: string;
  labels?: Partial<TimeFieldsLabels>;
}

function ZoneRow({ zone, now, reference, locale, hourCycle, ar }: { zone: string; now: Date; reference?: string; locale: string; hourCycle?: 12 | 24; ar: boolean }) {
  const offset = timeZoneOffsetMinutes(now, zone);
  const region = timeZoneRegion(zone);
  const long = timeZoneLongName(now, zone, locale);
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm text-foreground">{timeZoneCity(zone)}</span>
        <span className="truncate text-caption text-muted-foreground">{[region, long].filter(Boolean).join(" · ") || (ar ? "التوقيت العالمي" : "Universal time")}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <bdi dir="ltr" className="text-body-sm font-medium tabular-nums text-foreground">
          {formatZoneClock(now, zone, { locale, hourCycle })}
        </bdi>
        <bdi dir="ltr" className="font-mono text-caption text-muted-foreground">
          {reference ? formatZoneDifference(offset - timeZoneOffsetMinutes(now, reference), locale) : formatUtcOffset(offset)}
        </bdi>
      </span>
    </span>
  );
}

/**
 * A time zone picker with a live clock. Type a city ("riyadh"), a region ("asia"), the zone's own name or an offset ("utc+3",
 * "+05:30") and the list narrows; every row shows the time there right now and its offset, or how far it is from `reference`.
 * Below the field the chosen zone keeps ticking, and a button picks the reader's own zone. Daylight saving comes from `Intl`,
 * so no table goes stale and nothing extra is shipped.
 */
export function TimeZoneField({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  zones,
  reference,
  showClock = true,
  showDetect = true,
  seconds = false,
  hourCycle,
  limit = 60,
  now: fixed,
  placeholder,
  disabled,
  name,
  inputId,
  labels,
  className,
  "aria-label": ariaLabel,
  ...props
}: TimeZoneFieldProps) {
  const { t, locale, ar } = useTimeFieldsLocale(labels);
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const list = useMemo(() => (zones ? [...zones] : listTimeZones()), [zones]);
  const now = useTimeFieldsNow(fixed, 1000);
  const [open, setOpen] = useState(false);
  const mine = useMemo(() => (typeof Intl === "undefined" ? "UTC" : detectTimeZone()), []);

  const pick = (zone: string | null) => {
    if (!zone) return;
    setInner(zone);
    onValueChange?.(zone);
  };
  const shownLimit = Math.max(1, limit);
  const [query, setQuery] = useState("");
  const matchCount = useMemo(() => (query ? list.filter((zone) => matchTimeZone(zone, query, now, locale, normalizeForSearch)).length : list.length), [list, query, now, locale]);
  const truncated = matchCount > shownLimit;

  return (
    <div data-slot="time-zone-field" className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <Combobox<string>
            items={list}
            value={value}
            onValueChange={(next) => pick(next)}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setQuery("");
            }}
            onInputValueChange={(text) => setQuery(text)}
            itemToStringLabel={(zone) => (zone ? `${timeZoneCity(zone)}${timeZoneRegion(zone) ? `, ${timeZoneRegion(zone)}` : ""}` : "")}
            filter={(zone, query) => matchTimeZone(zone, query, now, locale, normalizeForSearch)}
            limit={shownLimit}
            disabled={disabled}
          >
            <ComboboxInput
              id={inputId}
              clearable={false}
              onFocus={(e) => e.currentTarget.select()}
              placeholder={placeholder ?? t.zonePlaceholder}
              aria-label={ariaLabel ?? t.zone}
              triggerLabel={t.open}
              clearLabel={t.clear}
            />
            <ComboboxContent className="min-w-[min(24rem,90vw)]">
              <ComboboxEmpty>{t.zoneEmpty}</ComboboxEmpty>
              <ComboboxList>
                {(zone: string) => (
                  <ComboboxItem key={zone} value={zone} className="h-auto min-h-9 py-1.5">
                    <ZoneRow zone={zone} now={now} reference={reference} locale={locale} hourCycle={hourCycle} ar={ar} />
                  </ComboboxItem>
                )}
              </ComboboxList>
              {truncated && <p className="border-t border-border px-2.5 pt-2 pb-1 text-caption text-muted-foreground">{t.truncated(shownLimit)}</p>}
            </ComboboxContent>
          </Combobox>
        </div>
        {showDetect && (
          <Button type="button" variant="secondary" size="md" disabled={disabled || value === mine} onClick={() => pick(mine)} className="shrink-0">
            <Globe2 aria-hidden="true" />
            <span className="max-sm:sr-only">{t.useMine}</span>
          </Button>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      {showClock && value && (
        <TimeZoneClock timeZone={value} now={fixed} seconds={seconds} hourCycle={hourCycle} reference={reference} size="sm" labels={labels} className="rounded-control bg-nq-surface-soft px-3 py-2" />
      )}
      {value && value === mine && <p className="text-caption text-muted-foreground">{t.yourZone}</p>}
    </div>
  );
}
