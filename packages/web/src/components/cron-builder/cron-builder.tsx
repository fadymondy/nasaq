"use client";

import { CalendarClock, CircleAlert, Globe } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type CronError,
  type CronFrequency,
  type CronPreset,
  type CronSimple,
  cronToSimple,
  DEFAULT_CRON_PRESETS,
  DEFAULT_SIMPLE,
  describeCron,
  isValidTimeZone,
  nextRuns,
  parseCron,
  simpleToCron,
} from "./cron";

const STRINGS = {
  en: {
    label: "Schedule",
    presets: "Common schedules",
    simple: "Simple",
    cron: "Cron expression",
    frequency: "Repeat",
    frequencies: { minutes: "Every few minutes", hours: "Every few hours", daily: "Every day", weekly: "Every week", monthly: "Every month" } satisfies Record<CronFrequency, string>,
    every: "Every",
    minutesUnit: "minutes",
    hoursUnit: "hours",
    atMinute: "At minute",
    atTime: "At",
    onDays: "On",
    dayOfMonth: "Day of the month",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    daysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    expression: "Cron expression",
    expressionHelp: "Five fields: minute, hour, day of month, month, day of week. Ranges 1-5, lists 1,3 and steps */15 work.",
    notSimple: "This schedule cannot be shown as simple settings. Edit the cron expression, or start over from a simple one.",
    startOver: "Start over",
    summary: "Runs",
    custom: "Custom schedule",
    invalid: "Not a valid schedule",
    timeZone: "Time zone",
    timeZoneHelp: "The schedule is read in this time zone.",
    nextRuns: "Next runs",
    nextNone: "This schedule never runs.",
    fieldNames: ["minute", "hour", "day of month", "month", "day of week"],
    errors: {
      empty: () => "Enter a cron expression.",
      fields: () => "A cron expression has five fields separated by spaces.",
      syntax: (field: string, token: string) => `The ${field} field has a value that cannot be read: ${token}.`,
      range: (field: string, token: string) => `The ${field} field is out of range: ${token}.`,
      step: (field: string, token: string) => `The ${field} field has a step that does not fit: ${token}.`,
    },
    presetLabels: { "every-5-min": "Every 5 minutes", hourly: "Hourly", "daily-9": "Daily at 09:00", "weekdays-9": "Weekdays at 09:00", "weekly-mon": "Mondays at 09:00", "monthly-1st": "Monthly on the 1st" } as Record<string, string>,
  },
  ar: {
    label: "الجدولة",
    presets: "جداول شائعة",
    simple: "مبسّط",
    cron: "تعبير كرون",
    frequency: "التكرار",
    frequencies: { minutes: "كل بضع دقائق", hours: "كل بضع ساعات", daily: "كل يوم", weekly: "كل أسبوع", monthly: "كل شهر" } satisfies Record<CronFrequency, string>,
    every: "كل",
    minutesUnit: "دقيقة",
    hoursUnit: "ساعة",
    atMinute: "عند الدقيقة",
    atTime: "عند",
    onDays: "في",
    dayOfMonth: "يوم الشهر",
    days: ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
    daysLong: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    expression: "تعبير كرون",
    expressionHelp: "خمسة حقول: الدقيقة، الساعة، يوم الشهر، الشهر، يوم الأسبوع. تعمل النطاقات 1-5 والقوائم 1,3 والخطوات */15.",
    notSimple: "لا يمكن عرض هذا الجدول كإعدادات مبسّطة. عدّل تعبير كرون، أو ابدأ من جدول مبسّط.",
    startOver: "ابدأ من جديد",
    summary: "يعمل",
    custom: "جدول مخصص",
    invalid: "جدول غير صالح",
    timeZone: "المنطقة الزمنية",
    timeZoneHelp: "يُقرأ الجدول بهذه المنطقة الزمنية.",
    nextRuns: "التشغيلات القادمة",
    nextNone: "هذا الجدول لن يعمل أبدًا.",
    fieldNames: ["الدقيقة", "الساعة", "يوم الشهر", "الشهر", "يوم الأسبوع"],
    errors: {
      empty: () => "أدخل تعبير كرون.",
      fields: () => "يتكون تعبير كرون من خمسة حقول مفصولة بمسافات.",
      syntax: (field: string, token: string) => `في حقل ${field} قيمة لا يمكن قراءتها: ${token}.`,
      range: (field: string, token: string) => `حقل ${field} خارج النطاق: ${token}.`,
      step: (field: string, token: string) => `في حقل ${field} خطوة غير مناسبة: ${token}.`,
    },
    presetLabels: { "every-5-min": "كل 5 دقائق", hourly: "كل ساعة", "daily-9": "يوميًا عند 09:00", "weekdays-9": "أيام العمل عند 09:00", "weekly-mon": "الاثنين عند 09:00", "monthly-1st": "شهريًا في اليوم الأول" } as Record<string, string>,
  },
};

export type CronBuilderLabels = (typeof STRINGS)["en"];

/** Time zones offered when `timeZones` is not given. The current `timeZone` is always added. */
export const DEFAULT_TIME_ZONES = ["UTC", "Asia/Riyadh", "Asia/Dubai", "Africa/Cairo", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];

export interface CronBuilderProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** The cron expression: five fields (`0 9 * * 1-5`) or a macro such as `@daily`. Controlled. */
  value?: string;
  defaultValue?: string;
  /** Called on every change with the new expression and whether it parses. The value can be invalid while someone types. */
  onValueChange?: (value: string, valid: boolean) => void;
  /** IANA time zone the schedule is read in, such as `Asia/Riyadh`. Controlled. Default `UTC`. */
  timeZone?: string;
  defaultTimeZone?: string;
  onTimeZoneChange?: (timeZone: string) => void;
  /** Zones in the picker. Default a short list of common ones. */
  timeZones?: readonly string[];
  /** Hide the zone picker and read the schedule in `timeZone`. */
  hideTimeZone?: boolean;
  /** Quick picks. `false` hides them. Default: every 5 minutes, hourly, daily, weekdays, weekly, monthly. */
  presets?: readonly CronPreset[] | false;
  /** How many upcoming runs to list. Default 5. */
  previewCount?: number;
  /** The moment the preview counts from. Default: now (read when the value or zone changes). */
  now?: Date | number;
  disabled?: boolean;
  /** Accessible name of the group. Default "Schedule". */
  label?: string;
  labels?: Partial<CronBuilderLabels>;
}

/**
 * A schedule anyone can fill in: pick "every weekday at 09:00" from simple settings, or type the cron expression itself.
 * Either way it shows the schedule in words, checks it (naming the field that is wrong), and lists the next runs in the
 * chosen time zone, so nobody has to trust their own reading of `0 9 * * 1-5`. The value is always the cron string.
 */
export function CronBuilder({
  value: valueProp,
  defaultValue = "0 9 * * 1-5",
  onValueChange,
  timeZone: zoneProp,
  defaultTimeZone = "UTC",
  onTimeZoneChange,
  timeZones = DEFAULT_TIME_ZONES,
  hideTimeZone,
  presets = DEFAULT_CRON_PRESETS,
  previewCount = 5,
  now,
  disabled,
  label,
  labels,
  className,
  ...rest
}: CronBuilderProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const id = useId();
  const [valueState, setValueState] = useState(defaultValue);
  const value = valueProp ?? valueState;
  const [zoneState, setZoneState] = useState(defaultTimeZone);
  const zoneRaw = zoneProp ?? zoneState;
  const zone = isValidTimeZone(zoneRaw) ? zoneRaw : "UTC";
  const parsed = useMemo(() => parseCron(value), [value]);
  const simple = useMemo(() => cronToSimple(value), [value]);
  const [tab, setTab] = useState<"simple" | "cron">(() => (cronToSimple(valueProp ?? defaultValue) ? "simple" : "cron"));
  // Text typed into the expression box, kept as typed (an invalid draft is still shown as typed).
  const setValue = (next: string) => {
    if (valueProp === undefined) setValueState(next);
    onValueChange?.(next, parseCron(next).ok);
  };
  const setZone = (next: string) => {
    if (zoneProp === undefined) setZoneState(next);
    onTimeZoneChange?.(next);
  };

  const summary = parsed.ok ? (describeCron(value, ar ? "ar" : "en") ?? t.custom) : null;
  const runs = useMemo(() => (parsed.ok ? nextRuns(value, { from: now ?? Date.now(), count: previewCount, timeZone: zone }) : []), [value, zone, now, previewCount, parsed.ok]);
  const zoneList = useMemo(() => [...new Set([zone, ...timeZones])].filter(isValidTimeZone), [zone, timeZones]);

  const patch = (change: Partial<CronSimple>) => setValue(simpleToCron({ ...(simple ?? DEFAULT_SIMPLE), ...change }));
  const errorText = (e: CronError) => {
    const field = e.field >= 0 ? (t.fieldNames[e.field] as string) : "";
    const tok = e.token ?? "";
    return e.code === "empty" ? t.errors.empty() : e.code === "fields" ? t.errors.fields() : t.errors[e.code](field, tok);
  };
  const presetList = presets === false ? [] : presets;
  const s = simple ?? DEFAULT_SIMPLE;

  const num = (v: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || lo)));

  return (
    <div data-slot="cron-builder" role="group" aria-label={label ?? t.label} className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-4", className)} {...rest}>
      {presetList.length ? (
        <div role="group" aria-label={t.presets} className="flex flex-wrap gap-2">
          {presetList.map((p) => (
            <Button key={p.id} variant={value.trim() === p.value ? "primary" : "secondary"} size="sm" aria-pressed={value.trim() === p.value} disabled={disabled} onClick={() => setValue(p.value)}>
              {p.label ?? t.presetLabels[p.id] ?? describeCron(p.value, ar ? "ar" : "en") ?? p.value}
            </Button>
          ))}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "simple" | "cron")} className="gap-4">
        <TabsList variant="underline">
          <TabsTab value="simple">{t.simple}</TabsTab>
          <TabsTab value="cron">{t.cron}</TabsTab>
        </TabsList>

        <TabsPanel value="simple" className="flex flex-col gap-4">
          {!simple ? (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-nq-surface-soft p-3 text-body-sm text-muted-foreground">
              <CircleAlert aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{t.notSimple}</span>
              <Button variant="secondary" size="sm" disabled={disabled} onClick={() => setValue(simpleToCron(DEFAULT_SIMPLE))}>
                {t.startOver}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field disabled={disabled}>
                <FieldLabel>{t.frequency}</FieldLabel>
                <Select value={s.frequency} onValueChange={(v) => patch({ frequency: v as CronFrequency })} items={(Object.keys(t.frequencies) as CronFrequency[]).map((k) => ({ value: k, label: t.frequencies[k] }))} disabled={disabled}>
                  <SelectTrigger aria-label={t.frequency}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(t.frequencies) as CronFrequency[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {t.frequencies[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {s.frequency === "minutes" || s.frequency === "hours" ? (
                <Field disabled={disabled}>
                  <FieldLabel>
                    {t.every} ({s.frequency === "minutes" ? t.minutesUnit : t.hoursUnit})
                  </FieldLabel>
                  <Input type="number" inputMode="numeric" ltr min={1} max={s.frequency === "minutes" ? 59 : 23} value={s.every} onChange={(e) => patch({ every: num(e.target.value, 1, s.frequency === "minutes" ? 59 : 23) })} />
                </Field>
              ) : null}
              {s.frequency === "hours" ? (
                <Field disabled={disabled}>
                  <FieldLabel>{t.atMinute}</FieldLabel>
                  <Input type="number" inputMode="numeric" ltr min={0} max={59} value={s.minute} onChange={(e) => patch({ minute: num(e.target.value, 0, 59) })} />
                </Field>
              ) : null}
              {s.frequency === "daily" || s.frequency === "weekly" || s.frequency === "monthly" ? (
                <Field disabled={disabled}>
                  <FieldLabel>{t.atTime}</FieldLabel>
                  <Input type="time" ltr value={s.time} onChange={(e) => e.target.value && patch({ time: e.target.value })} />
                </Field>
              ) : null}
              {s.frequency === "monthly" ? (
                <Field disabled={disabled}>
                  <FieldLabel>{t.dayOfMonth}</FieldLabel>
                  <Input type="number" inputMode="numeric" ltr min={1} max={31} value={s.dayOfMonth} onChange={(e) => patch({ dayOfMonth: num(e.target.value, 1, 31) })} />
                </Field>
              ) : null}
              {s.frequency === "weekly" ? (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span id={`${id}-days`} className="text-label text-foreground">
                    {t.onDays}
                  </span>
                  <ToggleGroup
                    multiple
                    variant="outline"
                    aria-labelledby={`${id}-days`}
                    disabled={disabled}
                    value={s.days.map(String)}
                    onValueChange={(v) => v.length && patch({ days: v.map(Number) })}
                    className="flex-wrap"
                  >
                    {t.days.map((d, i) => (
                      <Toggle key={d} value={String(i)} aria-label={t.daysLong[i]}>
                        {d}
                      </Toggle>
                    ))}
                  </ToggleGroup>
                </div>
              ) : null}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="cron">
          <Field invalid={!parsed.ok} disabled={disabled}>
            <FieldLabel>{t.expression}</FieldLabel>
            <Input ltr spellCheck={false} autoComplete="off" value={value} className="font-mono" aria-invalid={!parsed.ok || undefined} aria-describedby={`${id}-hint`} onChange={(e) => setValue(e.target.value)} placeholder="0 9 * * 1-5" />
            <FieldDescription id={`${id}-hint`}>{t.expressionHelp}</FieldDescription>
            {!parsed.ok ? (
              <p role="alert" className="flex items-start gap-2 text-body-sm text-nq-danger-text">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {errorText(parsed.error)}
              </p>
            ) : null}
          </Field>
        </TabsPanel>
      </Tabs>

      <div data-slot="cron-summary" aria-live="polite" className="flex items-start gap-3 rounded-control bg-nq-surface-soft p-3">
        <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">{t.summary}</p>
          <p className={cn("text-body", parsed.ok ? "text-foreground" : "text-nq-danger-text")}>{parsed.ok ? summary : t.invalid}</p>
          {parsed.ok ? (
            <bdi dir="ltr" className="mt-0.5 block font-mono text-code text-muted-foreground">
              {value.trim()}
            </bdi>
          ) : null}
        </div>
      </div>

      {!hideTimeZone ? (
        <Field disabled={disabled}>
          <FieldLabel>
            <span className="inline-flex items-center gap-1.5">
              <Globe aria-hidden className="size-4" />
              {t.timeZone}
            </span>
          </FieldLabel>
          <Select value={zone} onValueChange={(v) => setZone(v as string)} items={zoneList.map((z) => ({ value: z, label: z }))} disabled={disabled}>
            <SelectTrigger aria-label={t.timeZone} dir="ltr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zoneList.map((z) => (
                <SelectItem key={z} value={z}>
                  <bdi dir="ltr">{z}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t.timeZoneHelp}</FieldDescription>
        </Field>
      ) : null}

      {parsed.ok ? (
        <section data-slot="cron-next-runs" aria-label={t.nextRuns} className="flex flex-col gap-2">
          <h3 className="text-label text-foreground">{t.nextRuns}</h3>
          {runs.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.nextNone}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-border rounded-control border border-border">
              {runs.map((r) => (
                <li key={r.getTime()} className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2 text-body-sm">
                  <DateTime value={r} format={{ weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }} className="text-foreground" />
                  <DateTime value={r} relative className="text-caption text-muted-foreground" />
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
