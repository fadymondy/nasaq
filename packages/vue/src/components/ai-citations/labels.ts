// Strings of the AI citation components, English and Arabic (copied from the React STRINGS table).

export const aiCitationsStrings = {
  en: {
    citation: (n: number, title: string) => `Source ${n}: ${title}`,
    sources: "Sources",
    sourcesLabel: "Sources cited",
    evidence: "Evidence",
    showEvidence: "Show evidence",
    hideEvidence: "Hide evidence",
    excerpt: "Excerpt from the source",
    noExcerpt: "No excerpt for this source",
    relevance: "Relevance",
    openSource: "Open source",
    notCited: "Not cited",
    provenance: "How this answer was made",
    grounded: "Grounded in sources",
    groundedIn: (n: number) => (n === 1 ? "Grounded in 1 source" : `Grounded in ${n} sources`),
    ungrounded: "Not grounded, from model knowledge",
    model: "Model",
    latency: "Response time",
    tokens: "Tokens",
    tokensIn: "in",
    tokensOut: "out",
    generatedAt: "Generated",
    retrieved: "Passages retrieved",
    coverage: (cited: number, total: number) => `${cited} of ${total} paragraphs cite a source.`,
    partlyCited: "Some statements have no source. Check them before you rely on them.",
  },
  ar: {
    citation: (n: number, title: string) => `المصدر ${n}: ${title}`,
    sources: "المصادر",
    sourcesLabel: "المصادر المذكورة",
    evidence: "الأدلة",
    showEvidence: "عرض الأدلة",
    hideEvidence: "إخفاء الأدلة",
    excerpt: "مقتطف من المصدر",
    noExcerpt: "لا يوجد مقتطف لهذا المصدر",
    relevance: "الصلة",
    openSource: "فتح المصدر",
    notCited: "غير مذكور",
    provenance: "كيف أُعدّت هذه الإجابة",
    grounded: "مبنية على مصادر",
    groundedIn: (n: number) => (n === 1 ? "مبنية على مصدر واحد" : n === 2 ? "مبنية على مصدرين" : `مبنية على ${n} مصادر`),
    ungrounded: "غير مبنية على مصادر، من معرفة النموذج",
    model: "النموذج",
    latency: "زمن الاستجابة",
    tokens: "الرموز",
    tokensIn: "دخل",
    tokensOut: "خرج",
    generatedAt: "وقت التوليد",
    retrieved: "المقاطع المسترجعة",
    coverage: (cited: number, total: number) => `${cited} من ${total} فقرات تذكر مصدرًا.`,
    partlyCited: "بعض العبارات بلا مصدر. تحقق منها قبل الاعتماد عليها.",
  },
};

export type AiCitationsLabels = (typeof aiCitationsStrings)["en"];

/** The words for a locale with the host's overrides on top. */
export function aiCitationsWords(locale: string, labels?: Partial<AiCitationsLabels>): AiCitationsLabels {
  return { ...aiCitationsStrings[locale.startsWith("ar") ? "ar" : "en"], ...labels } as AiCitationsLabels;
}
