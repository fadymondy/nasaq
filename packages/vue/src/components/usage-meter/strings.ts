import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { defaultCurrency } from "../../lib/money";
import { formatNumber } from "../numeric";

export const STRINGS = {
  en: {
    unlimited: "Unlimited",
    of: "of",
    left: (n: string) => `${n} left`,
    warning: "Approaching the limit",
    danger: "Almost at the limit",
    over: (n: string) => `Over the limit by ${n}`,
    hoursUnit: "h",
    hours: "Hours",
    budget: "Budget",
    projectedOver: (projected: string, over: string) => `On pace for ${projected}, ${over} over budget`,
    projectedWithin: (projected: string) => `On pace for ${projected}`,
    periodElapsed: (pct: string) => `${pct} of the period has passed`,
    planUsage: "Plan usage",
    plan: (name: string) => `${name} plan`,
    period: "Current period",
    overageTitle: "Estimated overage",
    overageNone: "No overage so far",
    overageNoneBody: "Everything is within your plan limits.",
    overageBody: "Charged with your next invoice if usage stays this high.",
    overageLine: (label: string, over: string, amount: string) => `${label}: ${over} over, ${amount}`,
    upgrade: "Upgrade plan",
    loading: "Loading usage",
  },
  ar: {
    unlimited: "غير محدود",
    of: "من",
    left: (n: string) => `متبقٍ ${n}`,
    warning: "اقتربت من الحد",
    danger: "أوشكت على بلوغ الحد",
    over: (n: string) => `تجاوزت الحد بمقدار ${n}`,
    hoursUnit: "س",
    hours: "الساعات",
    budget: "الميزانية",
    projectedOver: (projected: string, over: string) => `الوتيرة الحالية تصل إلى ${projected}، أي ${over} فوق الميزانية`,
    projectedWithin: (projected: string) => `الوتيرة الحالية تصل إلى ${projected}`,
    periodElapsed: (pct: string) => `مضى ${pct} من الفترة`,
    planUsage: "استخدام الباقة",
    plan: (name: string) => `باقة ${name}`,
    period: "الفترة الحالية",
    overageTitle: "التجاوز التقديري",
    overageNone: "لا تجاوز حتى الآن",
    overageNoneBody: "كل شيء ضمن حدود باقتك.",
    overageBody: "يُحاسَب مع فاتورتك القادمة إذا بقي الاستخدام بهذا المستوى.",
    overageLine: (label: string, over: string, amount: string) => `${label}: تجاوز ${over}، ${amount}`,
    upgrade: "ترقية الباقة",
    loading: "جارٍ تحميل الاستخدام",
  },
};

export type UsageMeterLabels = Partial<typeof STRINGS.en>;
export type UsageKind = "count" | "money" | "hours";

/** The built-in strings by the active locale, with the host's `labels` on top. */
export function useUsageLabels(override?: () => UsageMeterLabels | undefined): { locale: ComputedRef<string>; t: ComputedRef<typeof STRINGS.en> } {
  const nq = useNasaq();
  return {
    locale: computed(() => nq.locale.value),
    t: computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() })),
  };
}

/** Formats an amount of a usage kind: "1,200 seats", "$45", "12.5 h". The result is a plain string; the markup wraps it in `<bdi>`. */
export function formatAmount(value: number, kind: UsageKind, locale: string, t: { hoursUnit: string }, unit?: string, currency = defaultCurrency(locale)) {
  if (kind === "money") {
    const whole = Number.isInteger(value);
    return formatNumber(value, locale, { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  }
  const n = formatNumber(value, locale, { maximumFractionDigits: kind === "hours" ? 1 : 2 });
  const suffix = kind === "hours" ? t.hoursUnit : unit;
  return suffix ? `${n} ${suffix}` : n;
}
