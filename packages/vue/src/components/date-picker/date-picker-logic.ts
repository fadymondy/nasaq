// Shared bits of the DatePicker, DateRangePicker and TimePicker.
import { onBeforeUnmount, onMounted, ref } from "vue";

export const DATE_STRINGS = {
  en: { pickDate: "Select a date", pickRange: "Select dates", chooseDate: "Choose date", hour: "Hour", minute: "Minute", period: "AM/PM" },
  ar: { pickDate: "اختر تاريخًا", pickRange: "اختر التواريخ", chooseDate: "اختيار التاريخ", hour: "الساعة", minute: "الدقيقة", period: "ص/م" },
} as const;
export const dateStrings = (locale: string) => DATE_STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

export const pickerTriggerClass = [
  "flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

export const pickerPopupClass = "w-auto max-w-[var(--available-width)] p-3";

export const segmentClass = [
  "h-control min-h-[var(--nq-touch-min,0px)] appearance-none rounded-control border border-input bg-card px-2.5 text-center text-body tabular-nums text-foreground outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

/** A local date as `YYYY-MM-DD`. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Locale's own AM and PM strings ("AM"/"PM", "ص"/"م"). */
export function dayPeriods(locale: string): [string, string] {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true });
  const part = (h: number) => fmt.formatToParts(new Date(2023, 0, 1, h)).find((p) => p.type === "dayPeriod")?.value ?? (h < 12 ? "AM" : "PM");
  return [part(9), part(15)];
}

const WIDE = "(min-width: 640px)";
/** True from 640px wide: the range picker then shows two months. */
export function useWide() {
  const wide = ref(false);
  let mq: MediaQueryList | undefined;
  const update = () => (wide.value = Boolean(mq?.matches));
  onMounted(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    mq = window.matchMedia(WIDE);
    update();
    mq.addEventListener("change", update);
  });
  onBeforeUnmount(() => mq?.removeEventListener("change", update));
  return wide;
}
