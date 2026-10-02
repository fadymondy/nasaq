// The English and Arabic words of the extra charts, copied from the React chart-extras.
export const CHART_EXTRAS_STRINGS = {
  en: {
    total: "Total",
    remaining: "Remaining",
    segments: (parts: string) => `Breakdown: ${parts}`,
    ring: (pct: string) => `${pct} complete`,
    funnel: "Funnel steps",
    entered: "Entered",
    overall: "Overall conversion",
    continued: (pct: string) => `${pct} continued`,
    left: (n: string) => `${n} left`,
    biggest: "Biggest drop",
    ofFirst: (pct: string) => `${pct} of the first step`,
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    up: "up",
    down: "down",
    flat: "no change",
  },
  ar: {
    total: "الإجمالي",
    remaining: "المتبقي",
    segments: (parts: string) => `التوزيع: ${parts}`,
    ring: (pct: string) => `اكتمل ${pct}`,
    funnel: "خطوات القمع",
    entered: "دخلوا",
    overall: "التحويل الإجمالي",
    continued: (pct: string) => `تابع ${pct}`,
    left: (n: string) => `غادر ${n}`,
    biggest: "أكبر تسرّب",
    ofFirst: (pct: string) => `${pct} من الخطوة الأولى`,
    stepOf: (i: number, n: number) => `الخطوة ${i} من ${n}`,
    up: "ارتفاع",
    down: "انخفاض",
    flat: "بلا تغيّر",
  },
};

export type ChartExtrasLabels = typeof CHART_EXTRAS_STRINGS.en;
