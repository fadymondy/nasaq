// Built-in English and Arabic strings of rates and subscriptions.
export const RATES_STRINGS = {
  en: {
    rates: "Rates",
    billRate: "Bill rate",
    costRate: "Cost rate",
    perHour: "per hour",
    current: "Current",
    from: "From",
    until: "Until",
    ongoing: "Ongoing",
    changeFrom: (pct: string) => `${pct} from the rate before`,
    addRate: "Add a rate",
    newRateTitle: "Add a rate",
    newRateDescription: "The new rate applies from its start date. Work before that date keeps the old rate.",
    amount: "Amount",
    effectiveFrom: "Effective from",
    save: "Save rate",
    cancel: "Cancel",
    removeRate: "Remove rate",
    removeTitle: "Remove this rate?",
    removeDescription: "Work in that period is priced at the rate before it.",
    noRates: "No rates yet",
    noRatesHint: "Add the first rate to start pricing time.",
    futureRate: (d: string) => `Next change ${d}`,
    margin: "Margin",
    marginNow: (pct: string) => `${pct} margin today`,
    problems: { amount: "Enter an amount above zero.", date: "Pick a start date.", duplicate: "A rate already starts on that day." },
    failed: "That did not go through. Try again.",
    subscriptions: "Recurring subscriptions",
    newSubscription: "New subscription",
    editSubscription: "Edit subscription",
    name: "Name",
    project: "Project",
    noProject: "Whole organisation",
    price: "Price",
    quantity: "Quantity",
    repeats: "Repeats",
    every: "Every",
    units: { week: "week", month: "month", year: "year" },
    unitsPlural: { week: "weeks", month: "months", year: "years" },
    customSchedule: "Custom schedule",
    cron: "Cron expression",
    cronHint: "Five fields: minute hour day month weekday.",
    cronBad: "That is not a valid cron expression.",
    firstCharge: "First charge",
    nextCharges: "Next charges",
    perMonth: "per month",
    nextCharge: "Next charge",
    cycleText: (n: number, unit: string) => (n === 1 ? `Every ${unit}` : `Every ${n} ${unit}`),
    statuses: { active: "Active", paused: "Paused", cancelled: "Cancelled" },
    pause: "Pause",
    resume: "Resume",
    cancelSub: "Cancel subscription",
    edit: "Edit",
    cancelTitle: "Cancel this subscription?",
    cancelDescription: (name: string) => `${name} stops renewing. Charges already made stay.`,
    keep: "Keep it",
    noSubs: "No subscriptions",
    noSubsHint: "Add one to see what renews and when.",
    listLabel: "Subscriptions",
    overview: "Billing overview",
    mrr: "Monthly recurring",
    activeCount: "Active subscriptions",
    dueSoon: "Due in the next 30 days",
    byProject: "By project",
    upcoming: "Upcoming charges",
    noUpcoming: "Nothing due in the next 30 days.",
    orgLevel: "Whole organisation",
    quantityShort: (n: string) => `× ${n}`,
    actions: "Actions",
  },
  ar: {
    rates: "الأسعار",
    billRate: "سعر الفوترة",
    costRate: "سعر التكلفة",
    perHour: "في الساعة",
    current: "الحالي",
    from: "من",
    until: "حتى",
    ongoing: "مستمر",
    changeFrom: (pct: string) => `${pct} عن السعر السابق`,
    addRate: "إضافة سعر",
    newRateTitle: "إضافة سعر",
    newRateDescription: "يسري السعر الجديد من تاريخ بدايته. العمل قبل هذا التاريخ يبقى بالسعر القديم.",
    amount: "المبلغ",
    effectiveFrom: "يسري من",
    save: "حفظ السعر",
    cancel: "إلغاء",
    removeRate: "إزالة السعر",
    removeTitle: "إزالة هذا السعر؟",
    removeDescription: "يُسعَّر العمل في تلك الفترة بالسعر الذي قبله.",
    noRates: "لا توجد أسعار بعد",
    noRatesHint: "أضف أول سعر لبدء تسعير الوقت.",
    futureRate: (d: string) => `التغيير القادم ${d}`,
    margin: "الهامش",
    marginNow: (pct: string) => `هامش ${pct} اليوم`,
    problems: { amount: "أدخل مبلغًا أكبر من صفر.", date: "اختر تاريخ البداية.", duplicate: "يوجد سعر يبدأ في هذا اليوم بالفعل." },
    failed: "لم تتم العملية. حاول مرة أخرى.",
    subscriptions: "الاشتراكات المتكررة",
    newSubscription: "اشتراك جديد",
    editSubscription: "تعديل الاشتراك",
    name: "الاسم",
    project: "المشروع",
    noProject: "المؤسسة كلها",
    price: "السعر",
    quantity: "الكمية",
    repeats: "التكرار",
    every: "كل",
    units: { week: "أسبوع", month: "شهر", year: "سنة" },
    unitsPlural: { week: "أسابيع", month: "أشهر", year: "سنوات" },
    customSchedule: "جدول مخصص",
    cron: "تعبير cron",
    cronHint: "خمسة حقول: دقيقة ساعة يوم شهر يوم الأسبوع.",
    cronBad: "هذا ليس تعبير cron صحيحًا.",
    firstCharge: "أول دفعة",
    nextCharges: "الدفعات القادمة",
    perMonth: "في الشهر",
    nextCharge: "الدفعة القادمة",
    cycleText: (n: number, unit: string) => (n === 1 ? `كل ${unit}` : `كل ${n} ${unit}`),
    statuses: { active: "نشط", paused: "متوقف مؤقتًا", cancelled: "ملغى" },
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    cancelSub: "إلغاء الاشتراك",
    edit: "تعديل",
    cancelTitle: "إلغاء هذا الاشتراك؟",
    cancelDescription: (name: string) => `سيتوقف ${name} عن التجديد. الدفعات التي تمت تبقى.`,
    keep: "إبقاؤه",
    noSubs: "لا توجد اشتراكات",
    noSubsHint: "أضف اشتراكًا لترى ما يتجدد ومتى.",
    listLabel: "الاشتراكات",
    overview: "نظرة عامة على الفوترة",
    mrr: "الإيراد الشهري المتكرر",
    activeCount: "الاشتراكات النشطة",
    dueSoon: "مستحق خلال 30 يومًا",
    byProject: "حسب المشروع",
    upcoming: "الدفعات القادمة",
    noUpcoming: "لا شيء مستحق خلال 30 يومًا.",
    orgLevel: "المؤسسة كلها",
    quantityShort: (n: string) => `× ${n}`,
    actions: "الإجراءات",
  },
};

export type RatesStrings = typeof RATES_STRINGS.en;
export type RatesSubscriptionsLabels = Partial<Omit<RatesStrings, "problems" | "units" | "unitsPlural" | "statuses">> & {
  problems?: Partial<RatesStrings["problems"]>;
  units?: Partial<RatesStrings["units"]>;
  unitsPlural?: Partial<RatesStrings["unitsPlural"]>;
  statuses?: Partial<RatesStrings["statuses"]>;
};

import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { formatNumber } from "../numeric";

/** Merged strings for the active locale plus `labels`, the cron locale and a number formatter. */
export function useRatesStrings(labels?: () => RatesSubscriptionsLabels | undefined): { t: ComputedRef<RatesStrings>; locale: ComputedRef<string>; cron: ComputedRef<"ar" | "en">; n: (v: number) => string } {
  const nq = useNasaq();
  const ar = () => nq.locale.value.startsWith("ar");
  return {
    t: computed(() => {
      const base = RATES_STRINGS[ar() ? "ar" : "en"];
      const l = labels?.();
      return {
        ...base,
        ...l,
        problems: { ...base.problems, ...l?.problems },
        units: { ...base.units, ...l?.units },
        unitsPlural: { ...base.unitsPlural, ...l?.unitsPlural },
        statuses: { ...base.statuses, ...l?.statuses },
      } as RatesStrings;
    }),
    locale: computed(() => nq.locale.value),
    cron: computed(() => (ar() ? "ar" : "en")),
    n: (v: number) => formatNumber(v, nq.locale.value),
  };
}

/** Day-key helpers: noon local time so a time zone never moves the day. */
export const dayOf = (key: string): Date => new Date(`${key}T12:00:00`);
export const keyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayKey = (): string => keyOf(new Date());
export type RatesResult = void | { error?: string };
export const failMessage = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback);
