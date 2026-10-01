// Shared health formatting, ported from the React health-format: vocabulary, measures with units, durations, the clock.
// Merging and label lookup follow the React module; the clock is a composable that re-reads while `live`.
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { formatDate, formatNumber, type FormatDateOptions, type FormatNumberOptions } from "../numeric";
import { splitDuration, type HealthDateInput } from "./health-engines";
import { VOCAB, type HealthVocab } from "./vocab";

export type { HealthVocab } from "./vocab";

/** Units `Intl.NumberFormat` knows. */
export type IntlMeasureUnit = "milliliter" | "liter" | "kilogram" | "gram" | "centimeter" | "meter" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year" | "percent" | "celsius" | "kilometer" | "mile";
/** `level` is a bare count with no unit label. */
export type CustomMeasureUnit = "kcal" | "bpm" | "steps" | "bmi" | "level" | "cups" | "cycles";
export type MeasureUnit = IntlMeasureUnit | CustomMeasureUnit;

const CUSTOM = new Set<string>(["kcal", "bpm", "steps", "bmi", "level", "cups", "cycles"]);

/** Formats a value with its unit in the given locale. Custom units append `customLabel`. */
export function formatMeasure(value: number, unit: MeasureUnit, locale: string, options: FormatNumberOptions = {}, customLabel?: string): string {
  if (CUSTOM.has(unit)) {
    const figure = formatNumber(value, locale, options);
    return customLabel ? `${figure} ${customLabel}` : figure;
  }
  return formatNumber(value, locale, { style: "unit", unit, unitDisplay: "short", ...options });
}

/** A duration such as "1 h 12 min", made of at most two Intl units. */
export function formatDurationSeconds(totalSeconds: number, locale: string): string {
  return splitDuration(totalSeconds)
    .map((part) => formatNumber(part.value, locale, { style: "unit", unit: part.unit, unitDisplay: "short" }))
    .join(" ");
}

/** Wraps a figure in an LTR isolate (LRI..PDI) so it keeps its order inside an Arabic sentence, in plain strings. */
export const isolate = (text: string) => `⁦${text}⁩`;

/** Merges an override into a label set one level deep, so overriding one state does not drop the others. */
export function mergeLabels<T extends object>(base: T, override?: object): T {
  if (!override) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = current && typeof current === "object" && value && typeof value === "object" ? { ...current, ...value } : value;
  }
  return out as T;
}

/** Shared health vocabulary plus a component's own strings, en or ar by the Nasaq locale, with `override` laid on top. */
export function useHealthLabels<S extends { en: object; ar: object }>(own: S, override?: () => object | undefined): { t: ComputedRef<HealthVocab & S["en"]>; locale: ComputedRef<string>; ar: ComputedRef<boolean> } {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const ar = computed(() => locale.value.startsWith("ar"));
  const t = computed(() => {
    const key = ar.value ? "ar" : "en";
    return mergeLabels({ ...VOCAB[key], ...(own[key] as object) } as HealthVocab & S["en"], override?.());
  });
  return { t, locale, ar };
}

/** The label of a custom unit in the active locale. */
export const customUnitLabel = (ar: boolean, unit: MeasureUnit) => VOCAB[ar ? "ar" : "en"].units[unit];

/** Clock and date helpers for the active locale. */
export function formatHealthDate(locale: string) {
  return {
    date: (value: HealthDateInput, options?: FormatDateOptions) => formatDate(value, locale, options),
    time: (value: HealthDateInput) => formatDate(value, locale, { timeStyle: "short" }),
  };
}

/** The current time in milliseconds, re-read every `intervalMs` while `live`. A fixed `now` wins, so stories and tests stay still. */
export function useNow(now: () => HealthDateInput | undefined, live: () => boolean, intervalMs = 1000) {
  const tick = ref(Date.now());
  let id: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (id !== undefined) clearInterval(id);
    id = undefined;
  };
  const start = () => {
    stop();
    if (now() !== undefined || !live()) return;
    tick.value = Date.now();
    id = setInterval(() => (tick.value = Date.now()), intervalMs);
  };
  onMounted(start);
  watch([() => now(), live], start);
  onBeforeUnmount(stop);
  return computed(() => {
    const fixed = now();
    return fixed === undefined ? tick.value : new Date(fixed).getTime();
  });
}

/** What an async host callback returns: nothing on success, or a message to show as-is. */
export type HealthActionResult = void | { error?: string };
