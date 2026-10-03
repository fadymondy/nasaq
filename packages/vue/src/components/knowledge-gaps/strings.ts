import type { KnowledgeGapStatus } from "./knowledge-gaps-math";

export const STRINGS = {
  en: {
    label: "Knowledge gaps",
    filter: "Filter by status",
    all: "All",
    statuses: { open: "Open", indexed: "Indexed", dismissed: "Dismissed" },
    count: (n: string) => `${n} unanswered`,
    asked: (n: string, count: number) => (count === 1 ? `Asked ${n} time` : `Asked ${n} times`),
    firstSeen: "First asked",
    lastSeen: "Last asked",
    markIndexed: "Mark as indexed",
    dismiss: "Dismiss",
    reopen: "Reopen",
    resolved: { open: "Reopened.", indexed: "Marked as indexed.", dismissed: "Dismissed." },
    failed: "The change could not be saved. Try again.",
    empty: "No unanswered questions",
    emptyHint: "When the brain cannot answer a question, it shows up here so you can add what is missing.",
    emptyFiltered: "Nothing with this status",
    loading: "Loading gaps",
    retry: "Try again",
  },
  ar: {
    label: "فجوات المعرفة",
    filter: "تصفية حسب الحالة",
    all: "الكل",
    statuses: { open: "مفتوحة", indexed: "مفهرسة", dismissed: "مستبعدة" },
    count: (n: string) => `${n} بلا إجابة`,
    asked: (n: string, count: number) => (count === 1 ? "سُئل مرة واحدة" : count === 2 ? "سُئل مرتين" : `سُئل ${n} مرات`),
    firstSeen: "أول مرة",
    lastSeen: "آخر مرة",
    markIndexed: "تحديد كمفهرس",
    dismiss: "استبعاد",
    reopen: "إعادة فتح",
    resolved: { open: "أُعيد فتحه.", indexed: "تم تحديده كمفهرس.", dismissed: "تم استبعاده." },
    failed: "تعذر حفظ التغيير. حاول مرة أخرى.",
    empty: "لا توجد أسئلة بلا إجابة",
    emptyHint: "عندما يعجز العقل عن الإجابة عن سؤال، يظهر هنا لتضيف ما ينقصه.",
    emptyFiltered: "لا شيء بهذه الحالة",
    loading: "جارٍ تحميل الفجوات",
    retry: "إعادة المحاولة",
  },
};

export type KnowledgeGapsLabels = Omit<typeof STRINGS.en, "statuses" | "resolved"> & {
  statuses: Record<KnowledgeGapStatus, string>;
  resolved: Record<KnowledgeGapStatus, string>;
};
export type KnowledgeGapsLabelOverrides = Partial<Omit<KnowledgeGapsLabels, "statuses" | "resolved">> & {
  statuses?: Partial<KnowledgeGapsLabels["statuses"]>;
  resolved?: Partial<KnowledgeGapsLabels["resolved"]>;
};
