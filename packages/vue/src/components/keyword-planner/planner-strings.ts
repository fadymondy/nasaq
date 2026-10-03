import type { RankingUrl, SearchIntent } from "./planner-math";

export const PLANNER_STRINGS = {
  en: {
    title: "Keyword planner",
    description: "Plan which page owns which keyword, group related keywords and catch pages that compete with each other.",
    tabKeywords: "Keywords",
    tabClusters: "Clusters",
    tabCannibalization: "Cannibalization",
    keyword: "Keyword",
    intent: "Intent",
    cluster: "Cluster",
    volume: "Volume",
    difficulty: "Difficulty",
    owner: "Owning page",
    status: "Status",
    filter: "Filter keywords…",
    empty: "No keywords planned yet",
    intents: { informational: "Informational", commercial: "Commercial", transactional: "Transactional", navigational: "Navigational" } as Record<SearchIntent, string>,
    unassigned: "No owner",
    owned: "Owned",
    conflict: "Competing pages",
    ownerEmpty: "Assign a page",
    ownerInvalid: "Use /path or https://…",
    assignOwner: "Make this page the owner",
    setOwner: "Set owning page",
    clearOwner: "Remove owner",
    clusterKeywordsCount: (n: number) => (n === 1 ? "1 keyword" : `${n} keywords`),
    clusterVolume: "Total volume",
    clusterHead: "Main keyword",
    noClusters: "No clusters yet",
    conflictTitle: (n: number) => (n === 0 ? "No pages compete" : n === 1 ? "1 keyword has competing pages" : `${n} keywords have competing pages`),
    conflictBody: "When two of your pages rank for the same keyword they split clicks and links. Keep one and merge or re-aim the others.",
    conflictNone: "No two of your pages rank for the same keyword.",
    keep: "Keep",
    positionShort: (n: number) => `Position ${n}`,
    keepThis: "Keep this page",
    failed: "Could not save this. Try again.",
    tip: "The intent is guessed from the wording. Edit the keyword's intent by passing your own.",
  },
  ar: {
    title: "مخطط الكلمات المفتاحية",
    description: "خطّط أي صفحة تملك أي كلمة، وجمّع الكلمات المتقاربة، واكتشف الصفحات التي تتنافس فيما بينها.",
    tabKeywords: "الكلمات",
    tabClusters: "المجموعات",
    tabCannibalization: "التنافس الداخلي",
    keyword: "الكلمة",
    intent: "القصد",
    cluster: "المجموعة",
    volume: "حجم البحث",
    difficulty: "الصعوبة",
    owner: "الصفحة المالكة",
    status: "الحالة",
    filter: "تصفية الكلمات…",
    empty: "لا كلمات مخططة بعد",
    intents: { informational: "معلوماتي", commercial: "تجاري", transactional: "شرائي", navigational: "تنقّلي" } as Record<SearchIntent, string>,
    unassigned: "بلا مالك",
    owned: "لها مالك",
    conflict: "صفحات متنافسة",
    ownerEmpty: "عيّن صفحة",
    ownerInvalid: "استخدم /مسار أو https://…",
    assignOwner: "اجعل هذه الصفحة المالكة",
    setOwner: "تعيين الصفحة المالكة",
    clearOwner: "إزالة المالك",
    clusterKeywordsCount: (n: number) => (n === 1 ? "كلمة واحدة" : `${n} كلمات`),
    clusterVolume: "إجمالي الحجم",
    clusterHead: "الكلمة الرئيسية",
    noClusters: "لا مجموعات بعد",
    conflictTitle: (n: number) => (n === 0 ? "لا صفحات متنافسة" : n === 1 ? "كلمة واحدة لها صفحات متنافسة" : `${n} كلمات لها صفحات متنافسة`),
    conflictBody: "عندما تُصنَّف صفحتان من موقعك للكلمة نفسها تتقاسمان النقرات والروابط. احتفظ بواحدة وادمج الأخرى أو غيّر وجهتها.",
    conflictNone: "لا صفحتين من موقعك تُصنَّفان للكلمة نفسها.",
    keep: "الإبقاء",
    positionShort: (n: number) => `الترتيب ${n}`,
    keepThis: "أبقِ هذه الصفحة",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    tip: "يُخمَّن القصد من صياغة الكلمة. مرّر قصدك الخاص لتعديله.",
  },
};

export type KeywordPlannerLabels = typeof PLANNER_STRINGS.en;

export interface PlannerKeyword {
  id: string;
  keyword: string;
  volume: number;
  /** 0 (easy) to 100 (hard). */
  difficulty: number;
  /** Your own classification. Default: guessed from the wording. */
  intent?: SearchIntent;
  /** The page that should rank for this keyword. */
  ownerUrl?: string;
  /** Your pages that rank now, with positions. Two or more make the keyword cannibalized. */
  rankingUrls?: readonly RankingUrl[];
}

export type PlannerResult = void | { error?: string };
