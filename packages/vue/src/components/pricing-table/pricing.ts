import { computed } from "vue";
import { useNasaq } from "../../provider";
import type { PlanFeature } from "../plan-card";

export type BillingPeriod = "month" | "year";

/** One plan, as data. `NqPricingTable`, `NqPlanComparison` and `NqPlanPicker` all read this shape. */
export interface PricingPlan {
  id: string;
  name: string;
  /** Who it's for, one line. */
  description?: string;
  /** Price per month, billed monthly. `0` is free. */
  monthly?: number;
  /** Price per month, billed yearly (120/yr is `10`). Leave out when the plan has no yearly price. */
  yearly?: number;
  /** Priced per seat: the period reads "/seat/mo". */
  perSeat?: boolean;
  /** Shown instead of a price, for plans you sell by talking: "Custom". The button becomes "Contact sales". */
  custom?: string;
  features?: (string | PlanFeature)[];
  /** A small heading over the features: "Everything in Solo, plus". */
  featuresTitle?: string;
  /** "Most popular". */
  badge?: string;
  /** The recommended plan. At most one. */
  highlighted?: boolean;
  /** A free trial length. The button reads "Start 14-day free trial". */
  trialDays?: number;
  /** Override the button label. */
  cta?: string;
  /** Fine print under the button. */
  footnote?: string;
}

export interface PricingLabels {
  monthly: string;
  yearly: string;
  save: (percent: number) => string;
  billedYearly: (total: string) => string;
  billedMonthly: string;
  current: string;
  getStarted: string;
  choose: (name: string) => string;
  upgrade: string;
  downgrade: string;
  trial: (days: number) => string;
  contactSales: string;
  included: string;
  notIncluded: string;
  feature: string;
  period: string;
}

export const STRINGS: Record<"en" | "ar", PricingLabels> = {
  en: {
    monthly: "Monthly",
    yearly: "Yearly",
    save: (p) => `Save ${p}%`,
    billedYearly: (total) => `Billed ${total} yearly`,
    billedMonthly: "Billed monthly",
    current: "Current plan",
    getStarted: "Get started",
    choose: (name) => `Choose ${name}`,
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    trial: (d) => `Start ${d}-day free trial`,
    contactSales: "Contact sales",
    included: "Included",
    notIncluded: "Not included",
    feature: "Feature",
    period: "Billing period",
  },
  ar: {
    monthly: "شهري",
    yearly: "سنوي",
    save: (p) => `وفّر ${p}٪`,
    billedYearly: (total) => `تُدفع ${total} سنويًا`,
    billedMonthly: "تُدفع شهريًا",
    current: "خطتك الحالية",
    getStarted: "ابدأ الآن",
    choose: (name) => `اختر ${name}`,
    upgrade: "ترقية",
    downgrade: "تخفيض الخطة",
    trial: (d) => `ابدأ تجربة مجانية لمدة ${d} يومًا`,
    contactSales: "تواصل مع المبيعات",
    included: "مشمول",
    notIncluded: "غير مشمول",
    feature: "الميزة",
    period: "دورة الفوترة",
  },
};

/** The active locale and the built-in strings (Arabic under an Arabic provider) with any overrides on top. */
export function usePricingLabels(labels?: () => Partial<PricingLabels> | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed<PricingLabels>(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { locale, t };
}

/** The price shown for a plan in a period: per month, with the monthly price as `compareAt` when yearly is cheaper. */
export function planPrice(plan: PricingPlan, period: BillingPeriod): { amount: number; compareAt?: number } | null {
  const amount = period === "year" ? (plan.yearly ?? plan.monthly) : (plan.monthly ?? plan.yearly);
  if (amount === undefined) return null;
  const compareAt = period === "year" && plan.yearly !== undefined && plan.monthly !== undefined && plan.monthly > plan.yearly ? plan.monthly : undefined;
  return { amount, compareAt };
}

/** The best yearly saving across plans, as a whole percent. 0 when yearly is never cheaper. */
export function yearlySavings(plans: PricingPlan[]): number {
  let best = 0;
  for (const p of plans) {
    if (p.monthly && p.yearly !== undefined && p.yearly < p.monthly) best = Math.max(best, Math.round((1 - p.yearly / p.monthly) * 100));
  }
  return best;
}

export interface PlanActionState {
  label: string;
  variant: "primary" | "secondary" | "ghost";
  disabled: boolean;
}

/** What a plan's button says and looks like, given where the account is now. */
export function planAction(plan: PricingPlan, plans: PricingPlan[], t: PricingLabels, currentPlanId?: string): PlanActionState {
  const name = typeof plan.name === "string" ? plan.name : "";
  if (plan.id === currentPlanId) return { label: t.current, variant: "secondary", disabled: true };
  const variant = plan.highlighted ? "primary" : "secondary";
  if (plan.cta) return { label: plan.cta, variant, disabled: false };
  if (plan.custom !== undefined) return { label: t.contactSales, variant: "secondary", disabled: false };
  if (currentPlanId) {
    const here = plans.findIndex((p) => p.id === currentPlanId);
    const there = plans.findIndex((p) => p.id === plan.id);
    if (here >= 0 && there >= 0) {
      return there > here
        ? { label: `${t.upgrade}${name ? ` · ${name}` : ""}`, variant: plan.highlighted || there === here + 1 ? "primary" : "secondary", disabled: false }
        : { label: t.downgrade, variant: "ghost", disabled: false };
    }
  }
  if (plan.trialDays) return { label: t.trial(plan.trialDays), variant, disabled: false };
  if ((plan.monthly ?? plan.yearly) === 0) return { label: t.getStarted, variant, disabled: false };
  return { label: name ? t.choose(name) : t.getStarted, variant, disabled: false };
}

/** "Billed $120 yearly" / "Billed monthly" under a price; undefined for custom and free plans. */
export function priceNote(plan: PricingPlan, period: BillingPeriod, t: PricingLabels, currency: string, locale: string): string | undefined {
  if (plan.custom !== undefined) return undefined;
  const price = planPrice(plan, period);
  if (!price || price.amount === 0) return undefined;
  if (period === "year" && plan.yearly !== undefined) {
    const total = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0, numberingSystem: "latn" } as Intl.NumberFormatOptions).format(plan.yearly * 12);
    return t.billedYearly(total);
  }
  return t.billedMonthly;
}
