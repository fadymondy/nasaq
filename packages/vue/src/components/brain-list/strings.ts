import type { BrainStatus, BrainVisibility } from "./types";

export const BRAIN_STRINGS = {
  en: {
    label: "Brains",
    search: "Search brains…",
    name: "Brain",
    status: "Status",
    visibility: "Access",
    memories: "Memories",
    sources: "Sources",
    chats: "Chats",
    members: "Members",
    tags: "Tags",
    model: "Model",
    lastActive: "Last active",
    statuses: { ready: "Ready", indexing: "Indexing", paused: "Paused", error: "Needs attention" },
    visibilities: { private: "Private", team: "Team", public: "Public" },
    empty: "No brains yet",
    emptyHint: "Create a brain to give your team a shared memory.",
  },
  ar: {
    label: "العقول",
    search: "ابحث في العقول…",
    name: "العقل",
    status: "الحالة",
    visibility: "الوصول",
    memories: "الذكريات",
    sources: "المصادر",
    chats: "المحادثات",
    members: "الأعضاء",
    tags: "الوسوم",
    model: "النموذج",
    lastActive: "آخر نشاط",
    statuses: { ready: "جاهز", indexing: "قيد الفهرسة", paused: "متوقف", error: "يحتاج إلى انتباه" },
    visibilities: { private: "خاص", team: "الفريق", public: "عام" },
    empty: "لا توجد عقول بعد",
    emptyHint: "أنشئ عقلًا ليكون لفريقك ذاكرة مشتركة.",
  },
};

export type BrainListLabels = Omit<typeof BRAIN_STRINGS.en, "statuses" | "visibilities"> & {
  statuses: Record<BrainStatus, string>;
  visibilities: Record<BrainVisibility, string>;
};
export type BrainLabelOverrides = Partial<Omit<BrainListLabels, "statuses" | "visibilities">> & {
  statuses?: Partial<BrainListLabels["statuses"]>;
  visibilities?: Partial<BrainListLabels["visibilities"]>;
};

/** The strings for a locale with the caller's overrides on top. */
export function brainStrings(locale: string, labels?: BrainLabelOverrides): BrainListLabels {
  const base = BRAIN_STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...labels, statuses: { ...base.statuses, ...labels?.statuses }, visibilities: { ...base.visibilities, ...labels?.visibilities } } as BrainListLabels;
}
