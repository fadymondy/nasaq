"use client";

import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { formatDate, type FormatDateOptions, formatNumber, type FormatNumberOptions } from "../numeric";
import { type EngineId, type HealthDateInput, splitDuration } from "./health-engines";

/* ------------------------------------------------------------------ shared vocabulary */

const VOCAB = {
  en: {
    engines: {
      hydration: { title: "Hydration", subtitle: "One fixed unit at a time, up to a daily cap." },
      caffeine: { title: "Caffeine Block", subtitle: "No caffeine for a set time after waking." },
      gerd: { title: "GERD Window", subtitle: "Only water, chamomile or anise before sleep." },
      medication: { title: "Medication Grace", subtitle: "Was each scheduled dose logged, and on time?" },
      triggers: { title: "Trigger Families", subtitle: "What was logged, by trigger family." },
      cycle: { title: "Cycle", subtitle: "Predictions only when the history supports them." },
      contraceptive: { title: "Contraceptive Schedule", subtitle: "What has been recorded against your own plan." },
    } as Record<EngineId, { title: string; subtitle: string }>,
    states: {
      "hydration.idle": "Ready to log",
      "hydration.cooldown": "Cooling down",
      "hydration.capped": "Daily cap reached",
      "caffeine.awaiting_wake": "Waiting for wake time",
      "caffeine.blocked": "Blocked",
      "caffeine.clear": "Clear",
      "gerd.unanchored": "No sleep time set",
      "gerd.open": "Window closed",
      "gerd.window_active": "Window active",
      "gerd.sleeping": "Sleeping",
      "medication.none": "No doses today",
      "medication.grace_open": "Dose window open",
      "medication.missed": "Dose not logged",
      "medication.scheduled": "Scheduled",
      "medication.late_logged": "Logged late",
      "medication.logged": "All logged",
      "triggers.none": "Nothing logged",
      "triggers.unjudged": "Not judged",
      "triggers.clear": "No trigger logged",
      "triggers.exposed": "Trigger logged",
      "cycle.insufficient": "Building history",
      "cycle.calibrated": "Prediction offered",
      "cycle.suspended": "Prediction withdrawn",
      "contraceptive.unconfigured": "Not set up",
      "contraceptive.on_schedule": "On schedule",
      "contraceptive.due": "Due",
      "contraceptive.overdue": "Overdue",
      "contraceptive.expiring": "Expiring soon",
      "contraceptive.expired": "Expired",
    } as Record<string, string>,
    doseStatus: {
      scheduled: "Scheduled",
      grace_open: "Window open",
      logged: "Logged",
      late_logged: "Logged late",
      missed: "Not logged",
    } as Record<string, string>,
    verdicts: { on_protocol: "On protocol", off_protocol: "Off protocol", unevaluated: "Not judged" } as Record<string, string>,
    families: { gout: "Gout", ibs_gerd: "IBS and reflux", fatty_liver: "Fatty liver" } as Record<string, string>,
    whitelist: { water: "Water", chamomile: "Chamomile", anise: "Anise" } as Record<string, string>,
    methods: { daily_pill: "Daily pill", monthly_injection: "Monthly injection", implant: "Implant" } as Record<string, string>,
    units: { kcal: "kcal", bpm: "bpm", steps: "steps", bmi: "kg/m²", level: "", cups: "cups", cycles: "cycles" } as Record<string, string>,
    consult: "Consult your doctor.",
    unavailable: "Unavailable",
    daysUnit: "days",
  },
  ar: {
    engines: {
      hydration: { title: "شرب الماء", subtitle: "وحدة ثابتة واحدة في كل مرة، حتى سقف يومي." },
      caffeine: { title: "حظر الكافيين", subtitle: "لا كافيين لفترة محددة بعد الاستيقاظ." },
      gerd: { title: "نافذة الارتجاع", subtitle: "الماء أو البابونج أو اليانسون فقط قبل النوم." },
      medication: { title: "مهلة الدواء", subtitle: "هل سُجّلت كل جرعة مجدولة، وفي وقتها؟" },
      triggers: { title: "عائلات المحفّزات", subtitle: "ما سُجّل، بحسب عائلة المحفّز." },
      cycle: { title: "الدورة الشهرية", subtitle: "لا توقعات إلا حين يدعمها السجل." },
      contraceptive: { title: "جدول وسائل منع الحمل", subtitle: "ما سُجّل مقابل خطتك أنت." },
    } as Record<EngineId, { title: string; subtitle: string }>,
    states: {
      "hydration.idle": "جاهز للتسجيل",
      "hydration.cooldown": "فترة انتظار",
      "hydration.capped": "بلغت السقف اليومي",
      "caffeine.awaiting_wake": "بانتظار وقت الاستيقاظ",
      "caffeine.blocked": "محظور",
      "caffeine.clear": "مسموح",
      "gerd.unanchored": "لم يُحدَّد وقت النوم",
      "gerd.open": "النافذة مغلقة",
      "gerd.window_active": "النافذة نشطة",
      "gerd.sleeping": "نائم",
      "medication.none": "لا جرعات اليوم",
      "medication.grace_open": "نافذة الجرعة مفتوحة",
      "medication.missed": "جرعة غير مسجّلة",
      "medication.scheduled": "مجدولة",
      "medication.late_logged": "سُجّلت متأخرة",
      "medication.logged": "سُجّلت كلها",
      "triggers.none": "لا شيء مسجّل",
      "triggers.unjudged": "لم يُقيَّم",
      "triggers.clear": "لا محفّز مسجّل",
      "triggers.exposed": "سُجّل محفّز",
      "cycle.insufficient": "بناء السجل",
      "cycle.calibrated": "التوقع متاح",
      "cycle.suspended": "سُحب التوقع",
      "contraceptive.unconfigured": "لم يُعدّ بعد",
      "contraceptive.on_schedule": "في الموعد",
      "contraceptive.due": "مستحقة",
      "contraceptive.overdue": "متأخرة",
      "contraceptive.expiring": "تنتهي قريبًا",
      "contraceptive.expired": "منتهية",
    } as Record<string, string>,
    doseStatus: {
      scheduled: "مجدولة",
      grace_open: "النافذة مفتوحة",
      logged: "مسجّلة",
      late_logged: "سُجّلت متأخرة",
      missed: "غير مسجّلة",
    } as Record<string, string>,
    verdicts: { on_protocol: "ضمن البروتوكول", off_protocol: "خارج البروتوكول", unevaluated: "لم يُقيَّم" } as Record<string, string>,
    families: { gout: "النقرس", ibs_gerd: "القولون والارتجاع", fatty_liver: "الكبد الدهني" } as Record<string, string>,
    whitelist: { water: "الماء", chamomile: "البابونج", anise: "اليانسون" } as Record<string, string>,
    methods: { daily_pill: "حبوب يومية", monthly_injection: "حقنة شهرية", implant: "غرسة" } as Record<string, string>,
    units: { kcal: "kcal", bpm: "bpm", steps: "خطوة", bmi: "kg/m²", level: "", cups: "أكواب", cycles: "دورات" } as Record<string, string>,
    consult: "استشر طبيبك.",
    unavailable: "غير متاح",
    daysUnit: "أيام",
  },
};

export type HealthVocab = (typeof VOCAB)["en"];

/** Merges an override into a label set one level deep, so overriding one state does not drop the others. */
export function mergeLabels<T extends object>(base: T, override?: { [K in keyof T]?: T[K] extends string | ((...a: never[]) => unknown) ? T[K] : Partial<T[K]> }): T {
  if (!override) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = current && typeof current === "object" && value && typeof value === "object" ? { ...current, ...value } : value;
  }
  return out as T;
}

/** The active Nasaq locale, and whether it is Arabic. Works outside a provider ("en"). */
export function useHealthLocale() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, ar: locale.startsWith("ar") };
}

/** Shared health vocabulary (engine names, states, verdicts) plus a component's own strings, en or ar by the Nasaq locale. */
export function useHealthLabels<S extends { en: object; ar: object }>(own: S, override?: object): HealthVocab & S["en"] {
  const { ar } = useHealthLocale();
  const base = { ...VOCAB[ar ? "ar" : "en"], ...(own[ar ? "ar" : "en"] as object) } as HealthVocab & S["en"];
  return mergeLabels(base, override as never);
}

/* ------------------------------------------------------------------ numbers with units */

/** Units `Intl.NumberFormat` knows. */
export type IntlMeasureUnit = "milliliter" | "liter" | "kilogram" | "gram" | "centimeter" | "meter" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year" | "percent" | "celsius" | "kilometer" | "mile";
/** `level` is a bare count with no unit label. Units the health domain needs that `Intl` does not carry; their label comes from the vocabulary. */
export type CustomMeasureUnit = "kcal" | "bpm" | "steps" | "bmi" | "level" | "cups" | "cycles";
export type MeasureUnit = IntlMeasureUnit | CustomMeasureUnit;

const CUSTOM = new Set<string>(["kcal", "bpm", "steps", "bmi", "level", "cups", "cycles"]);

/** Formats a value with its unit in the given locale. Custom units append `customLabel`. */
export function formatMeasure(value: number, unit: MeasureUnit, locale: string, options: FormatNumberOptions = {}, customLabel?: string): string {
  if (CUSTOM.has(unit)) {
    const figure = formatNumber(value, locale, options);
    return customLabel ? `${figure} ${customLabel}` : figure;
  }
  return formatNumber(value, locale, { style: "unit", unit, unitDisplay: "short", ...options });
}

export interface MeasureProps extends Omit<ComponentProps<"bdi">, "children"> {
  value: number;
  unit: MeasureUnit;
  /** Intl options, e.g. `{ maximumFractionDigits: 1 }`. */
  format?: FormatNumberOptions;
}

/**
 * A health figure with its unit, "3,000 mL" or "72 bpm". Tabular digits, and an LTR isolate: a number and its
 * unit keep their order inside an Arabic sentence instead of being reshuffled by the surrounding text.
 */
export function Measure({ value, unit, format, className, ...props }: MeasureProps) {
  const { locale, ar } = useHealthLocale();
  const custom = VOCAB[ar ? "ar" : "en"].units[unit];
  return (
    <bdi data-slot="measure" data-numeric="" dir="ltr" className={cn("tabular-nums [unicode-bidi:isolate]", className)} {...props}>
      {formatMeasure(value, unit, locale, format, custom)}
    </bdi>
  );
}

/** A duration such as "1 h 12 min", made of at most two Intl units, in an LTR isolate. */
export function formatDurationSeconds(totalSeconds: number, locale: string): string {
  return splitDuration(totalSeconds)
    .map((part) => formatNumber(part.value, locale, { style: "unit", unit: part.unit, unitDisplay: "short" }))
    .join(" ");
}

export function Duration({ seconds, className, ...props }: Omit<ComponentProps<"bdi">, "children"> & { seconds: number }) {
  const { locale } = useHealthLocale();
  return (
    <bdi data-slot="duration" data-numeric="" dir="ltr" className={cn("tabular-nums [unicode-bidi:isolate]", className)} {...props}>
      {formatDurationSeconds(seconds, locale)}
    </bdi>
  );
}

/** A clock time or date in the active locale, isolated. Uses `DateTime`-style formatting without the `<time>` semantics needed here. */
export function useHealthDate() {
  const { locale } = useHealthLocale();
  return {
    locale,
    date: (value: HealthDateInput, options?: FormatDateOptions) => formatDate(value, locale, options),
    time: (value: HealthDateInput) => formatDate(value, locale, { timeStyle: "short" }),
    day: (value: HealthDateInput) => formatDate(value, locale, { weekday: "short", day: "numeric", month: "short" }),
  };
}

/** The current time in milliseconds, re-read every `intervalMs` while `live`. A fixed `now` wins, so stories and tests stay still. */
export function useNow(now?: HealthDateInput, live = true, intervalMs = 1000): number {
  const fixed = now === undefined ? undefined : new Date(now).getTime();
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (fixed !== undefined || !live) return;
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [fixed, live, intervalMs]);
  return fixed ?? tick;
}

/** What an async host callback returns: nothing on success, or a message to show as-is. */
export type HealthActionResult = void | { error?: string };
