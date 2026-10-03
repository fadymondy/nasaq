import { computed } from "vue";
import { useNasaq } from "../../provider";

export const STRINGS = {
  en: {
    availability: { open: "Available for work", limited: "Limited availability", closed: "Not taking new work" },
    localTime: "Local time",
    inTimezone: "in {city}",
    working: "Working hours",
    offHours: "Outside working hours",
    sameTime: "Same time as you",
    ahead: "{n}h ahead of you",
    behind: "{n}h behind you",
    now: "Now",
    updated: "Updated {date}",
    stats: "By the numbers",
    skills: "Skills",
    level: "Level {n} of 5",
    weather: "Weather",
    highLow: "High {high}, low {low}",
    condition: { clear: "Clear", "partly-cloudy": "Partly cloudy", cloudy: "Cloudy", rain: "Rain", storm: "Thunderstorm", snow: "Snow", fog: "Fog", wind: "Windy" },
    social: "Find me elsewhere",
    email: "Email",
    website: "Website",
  },
  ar: {
    availability: { open: "متاح للعمل", limited: "توفّر محدود", closed: "لا أستقبل أعمالًا جديدة" },
    localTime: "الوقت المحلي",
    inTimezone: "في {city}",
    working: "ضمن ساعات العمل",
    offHours: "خارج ساعات العمل",
    sameTime: "نفس توقيتك",
    ahead: "يسبقك بـ {n} س",
    behind: "يتأخر عنك بـ {n} س",
    now: "الآن",
    updated: "حُدّث {date}",
    stats: "بالأرقام",
    skills: "المهارات",
    level: "المستوى {n} من 5",
    weather: "الطقس",
    highLow: "العظمى {high}، الصغرى {low}",
    condition: { clear: "صافٍ", "partly-cloudy": "غائم جزئيًا", cloudy: "غائم", rain: "مطر", storm: "عاصفة رعدية", snow: "ثلج", fog: "ضباب", wind: "رياح" },
    social: "تجدني أيضًا في",
    email: "البريد الإلكتروني",
    website: "الموقع",
  },
};

export type PersonalWidgetStrings = (typeof STRINGS)["en"];
export type PersonalWidgetLabels = Partial<Omit<PersonalWidgetStrings, "availability" | "condition">> & {
  availability?: Partial<PersonalWidgetStrings["availability"]>;
  condition?: Partial<PersonalWidgetStrings["condition"]>;
};

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale for the personal widgets. `labels` is read lazily so props stay reactive. */
export function usePersonalStrings(labels: () => PersonalWidgetLabels | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed<PersonalWidgetStrings>(() => {
    const base = STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
    const o = labels();
    return { ...base, ...o, availability: { ...base.availability, ...o?.availability }, condition: { ...base.condition, ...o?.condition } } as PersonalWidgetStrings;
  });
  return { locale, t };
}
