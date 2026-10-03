import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

const STRINGS = {
  en: {
    timer: "Timer",
    cycles: "{done} of {total} focus sessions done in this set",
    idleTitle: "You were away",
    idleDescription: "The timer kept running while you were idle for {minutes} min, since {time}. What should happen to that time?",
    idleKeep: "Keep the time",
    idleDiscard: "Discard {minutes} min",
    idleStop: "Discard and stop",
  },
  ar: {
    timer: "المؤقّت",
    cycles: "{done} من {total} جلسات تركيز أُنجزت في هذه الدورة",
    idleTitle: "كنت بعيدًا",
    idleDescription: "استمر المؤقّت أثناء غيابك {minutes} دقيقة منذ {time}. ماذا نفعل بهذا الوقت؟",
    idleKeep: "احتفظ بالوقت",
    idleDiscard: "احذف {minutes} دقيقة",
    idleStop: "احذف وأوقف",
  },
};

export type CountdownLabels = Partial<(typeof STRINGS)["en"]>;

/** The built-in strings for the provider locale, with any `labels` laid over them. */
export function useCountdownStrings(labels?: () => CountdownLabels | undefined): ComputedRef<(typeof STRINGS)["en"]> {
  const nq = useNasaq();
  return computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
}

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
