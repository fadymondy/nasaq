import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const TIME_FIELDS_STRINGS = {
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

export type TimeFieldsLabels = typeof TIME_FIELDS_STRINGS.en;

/** The provider locale and the English or Arabic strings, with `labels` laid over them. */
export function useTimeFieldsLocale(labels?: () => Partial<TimeFieldsLabels> | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const ar = computed(() => locale.value.split("-")[0] === "ar");
  const t: ComputedRef<TimeFieldsLabels> = computed(() => ({ ...(ar.value ? TIME_FIELDS_STRINGS.ar : TIME_FIELDS_STRINGS.en), ...labels?.() }) as TimeFieldsLabels);
  return { locale, ar, t };
}

/** The current time, refreshed every `intervalMs`, unless a fixed moment is given (stories and tests). */
export function useTimeFieldsNow(fixed: () => Date | undefined, intervalMs = 1000) {
  const now = ref<Date>(fixed() ?? new Date());
  let id: number | undefined;
  const stop = () => {
    if (id !== undefined) window.clearInterval(id);
    id = undefined;
  };
  const start = () => {
    stop();
    const pinned = fixed();
    if (pinned) {
      now.value = pinned;
      return;
    }
    now.value = new Date();
    id = window.setInterval(() => (now.value = new Date()), intervalMs);
  };
  onMounted(start);
  watch(fixed, start);
  onBeforeUnmount(stop);
  return computed(() => fixed() ?? now.value);
}
