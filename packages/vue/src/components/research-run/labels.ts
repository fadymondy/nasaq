// Strings of ResearchRun, English and Arabic (copied from the React STRINGS table).
import type { ResearchStageState } from "./research-run-logic";

export const researchRunStrings = {
  en: {
    label: "Research run",
    ask: "Ask",
    asking: "Researching",
    placeholder: "What do you want researched?",
    cancel: "Stop research",
    retry: "Try again",
    newQuestion: "New question",
    suggestions: "Try asking",
    queued: "Waiting for a free researcher",
    stages: "Progress",
    checked: (n: string) => `${n} sources checked`,
    read: (n: string) => `${n} read`,
    stageStates: { pending: "Waiting", running: "In progress", done: "Done", failed: "Failed" } as Record<ResearchStageState, string>,
    answer: "Answer",
    evidence: "Evidence",
    evidenceHint: "The passages the answer rests on.",
    citation: (n: string) => `Evidence ${n}`,
    showEvidence: (n: string) => `Show evidence ${n}`,
    openSource: "Open source",
    relevance: (n: string) => `Relevance ${n}`,
    notCited: "Also found",
    sources: "Sources",
    failed: "The research stopped before it had an answer.",
    cancelled: "Research stopped.",
    noAnswer: "No answer was found for this question.",
    finished: "Finished",
  },
  ar: {
    label: "جولة بحث",
    ask: "اسأل",
    asking: "جارٍ البحث",
    placeholder: "ما الذي تريد بحثه؟",
    cancel: "إيقاف البحث",
    retry: "حاول مرة أخرى",
    newQuestion: "سؤال جديد",
    suggestions: "جرّب أن تسأل",
    queued: "بانتظار باحث متاح",
    stages: "التقدم",
    checked: (n: string) => `${n} مصادر تمت مراجعتها`,
    read: (n: string) => `${n} قُرئت`,
    stageStates: { pending: "بالانتظار", running: "قيد التنفيذ", done: "تم", failed: "فشل" } as Record<ResearchStageState, string>,
    answer: "الإجابة",
    evidence: "الأدلة",
    evidenceHint: "المقاطع التي تستند إليها الإجابة.",
    citation: (n: string) => `الدليل ${n}`,
    showEvidence: (n: string) => `إظهار الدليل ${n}`,
    openSource: "فتح المصدر",
    relevance: (n: string) => `الصلة ${n}`,
    notCited: "وُجد أيضًا",
    sources: "المصادر",
    failed: "توقف البحث قبل الوصول إلى إجابة.",
    cancelled: "تم إيقاف البحث.",
    noAnswer: "لم يُعثر على إجابة لهذا السؤال.",
    finished: "اكتمل",
  },
};

export type ResearchRunLabels = Omit<(typeof researchRunStrings)["en"], "stageStates"> & { stageStates: Record<ResearchStageState, string> };
export type ResearchRunLabelOverrides = Partial<Omit<ResearchRunLabels, "stageStates">> & { stageStates?: Partial<ResearchRunLabels["stageStates"]> };

/** The words for a locale with the host's overrides on top. */
export function researchRunWords(locale: string, labels?: ResearchRunLabelOverrides): ResearchRunLabels {
  const base = researchRunStrings[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...labels, stageStates: { ...base.stageStates, ...labels?.stageStates } } as ResearchRunLabels;
}
