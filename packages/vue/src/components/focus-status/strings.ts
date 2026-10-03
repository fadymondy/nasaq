import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

const STRINGS = {
  en: {
    available: "Available",
    focus: "In focus",
    break: "On a break",
    dnd: "Do not disturb",
    left: "{time} left",
    dndLabel: "Do not disturb",
    dndHint: "Silences notifications and shows you as busy to your team.",
    dndUntil: "Until {time}",
  },
  ar: {
    available: "متاح",
    focus: "في تركيز",
    break: "في استراحة",
    dnd: "عدم الإزعاج",
    left: "متبقٍ {time}",
    dndLabel: "عدم الإزعاج",
    dndHint: "يكتم الإشعارات ويُظهرك مشغولًا لفريقك.",
    dndUntil: "حتى {time}",
  },
};

export type FocusStatusLabels = Partial<(typeof STRINGS)["en"]>;

export function useFocusStatusStrings(labels: () => FocusStatusLabels | undefined): ComputedRef<(typeof STRINGS)["en"]> {
  const nasaq = useNasaq();
  return computed(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
}

export const fillFocusStatus = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
