import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const AI_USAGE_COST_STRINGS = {
  en: {
    total: "Total cost",
    tokens: "Tokens",
    billed: "Billed",
    unbilled: "Unbilled",
    clientPrice: (pct: string) => `Client price (+${pct})`,
    daily: "Cost per day",
    dailyHint: "Billed and unbilled spend, by day",
    model: "Model",
    product: "Product",
    run: "Run",
    byModel: "By model",
    byProduct: "By product",
    byRun: "By run",
    tokensIn: "In",
    tokensOut: "Out",
    cost: "Cost",
    vsPrevious: "vs previous period",
    breakdownBy: "Cost breakdown",
    chartLabel: (n: number) => `Daily cost, ${n} days`,
    input: "Input",
    output: "Output",
    cached: "Cached",
    budget: "Run budget",
    tokenSplit: "Token split",
    tokenTotal: (n: string) => `${n} tokens`,
  },
  ar: {
    total: "إجمالي التكلفة",
    tokens: "الرموز",
    billed: "مفوتر",
    unbilled: "غير مفوتر",
    clientPrice: (pct: string) => `سعر العميل (+${pct})`,
    daily: "التكلفة اليومية",
    dailyHint: "الإنفاق المفوتر وغير المفوتر حسب اليوم",
    model: "النموذج",
    product: "المنتج",
    run: "التشغيل",
    byModel: "حسب النموذج",
    byProduct: "حسب المنتج",
    byRun: "حسب التشغيل",
    tokensIn: "دخل",
    tokensOut: "خرج",
    cost: "التكلفة",
    vsPrevious: "مقارنة بالفترة السابقة",
    breakdownBy: "تفصيل التكلفة",
    chartLabel: (n: number) => `التكلفة اليومية، ${n} يومًا`,
    input: "الإدخال",
    output: "الإخراج",
    cached: "مخزّن مؤقتًا",
    budget: "ميزانية التشغيل",
    tokenSplit: "توزيع الرموز",
    tokenTotal: (n: string) => `${n} رمز`,
  },
};

export type AiUsageCostLabels = Partial<typeof AI_USAGE_COST_STRINGS.en>;

/** The merged strings for the active locale plus the locale itself. */
export function useAiUsageCostLabels(labels: () => AiUsageCostLabels | undefined): { locale: ComputedRef<string>; t: ComputedRef<typeof AI_USAGE_COST_STRINGS.en> } {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => ({ ...AI_USAGE_COST_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as typeof AI_USAGE_COST_STRINGS.en);
  return { locale, t };
}
