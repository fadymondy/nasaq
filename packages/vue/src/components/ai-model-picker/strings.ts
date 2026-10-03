import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

// Same strings as the React component (packages/web/src/components/ai-model-picker).
export const STRINGS = {
  en: {
    model: "Model",
    effort: "Reasoning effort",
    effortHint: "Higher effort thinks longer and costs more.",
    agent: "Agent",
    agentRequired: "Required",
    agentPlaceholder: "Choose an agent",
    agentMissing: "Choose the agent that will run this.",
    low: "Low",
    medium: "Medium",
    high: "High",
    max: "Max",
    flagship: "Most capable",
    balanced: "Balanced",
    fast: "Fastest",
    context: (n: string) => `${n} context`,
    price: (input: string, output: string) => `${input} in, ${output} out per 1M tokens`,
    persona: "Persona",
    personas: "Personas",
    starters: "Try asking",
    models: "Models",
  },
  ar: {
    model: "النموذج",
    effort: "جهد التفكير",
    effortHint: "الجهد الأعلى يفكّر أطول ويكلّف أكثر.",
    agent: "الوكيل",
    agentRequired: "مطلوب",
    agentPlaceholder: "اختر وكيلًا",
    agentMissing: "اختر الوكيل الذي سينفّذ هذا.",
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع",
    max: "أقصى",
    flagship: "الأقوى",
    balanced: "متوازن",
    fast: "الأسرع",
    context: (n: string) => `سياق ${n}`,
    price: (input: string, output: string) => `${input} للإدخال، ${output} للإخراج لكل مليون رمز`,
    persona: "الشخصية",
    personas: "الشخصيات",
    starters: "جرّب أن تسأل",
    models: "النماذج",
  },
};

export type AiModelPickerLabels = Partial<typeof STRINGS.en>;

/** The built-in strings for the active locale, with `labels` laid over them. */
export function useLabels(labels: () => AiModelPickerLabels | undefined): { locale: ComputedRef<string>; t: ComputedRef<typeof STRINGS.en> } {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
  return { locale: nq.locale, t };
}
