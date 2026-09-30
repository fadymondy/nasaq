/*
 * Demo data for the business report stories (profitability, employee KPIs, pipeline, support).
 * Deterministic, no network. Names and figures are invented.
 */
import { series, t } from "./_s-demo";

export const SAR = { style: "currency", currency: "SAR", maximumFractionDigits: 0 } as const;

export const profitRows = (ar: boolean) => [
  { id: "p1", name: t(ar, "Website rebuild", "إعادة بناء الموقع"), revenue: 120000, cost: 78000, hours: 410, marginTrend: [0.28, 0.31, 0.33, 0.35] },
  { id: "p2", name: t(ar, "Mobile app", "تطبيق الجوال"), revenue: 90000, cost: 96000, hours: 520, marginTrend: [0.12, 0.05, -0.02, -0.07] },
  { id: "p3", name: t(ar, "Brand identity", "الهوية البصرية"), revenue: 46000, cost: 40500, hours: 190, marginTrend: [0.1, 0.12, 0.11, 0.12] },
  { id: "p4", name: t(ar, "Support retainer", "عقد الدعم"), revenue: 64000, cost: 31000, hours: 260, marginTrend: [0.5, 0.49, 0.52, 0.52] },
  { id: "p5", name: t(ar, "Data migration", "ترحيل البيانات"), revenue: 38000, cost: 39900, hours: 210, marginTrend: [0.2, 0.1, 0.02, -0.05] },
  { id: "p6", name: t(ar, "Training workshops", "ورش التدريب"), revenue: 27500, cost: 12100, hours: 70, marginTrend: [0.4, 0.45, 0.5, 0.56] },
];

const kpiMetrics = (ar: boolean, tasks: number, second: number, secondLabel: [string, string] = ["Reviews", "مراجعات"]) => [
  { id: "t", label: t(ar, "Tasks done", "مهام منجزة"), value: tasks },
  { id: "r", label: t(ar, secondLabel[0], secondLabel[1]), value: second },
];

export const employeeKpis = (ar: boolean) => [
  { id: "e1", name: t(ar, "Sara Alharbi", "سارة الحربي"), role: t(ar, "Senior designer", "مصممة أولى"), target: 140, actual: 152, delta: 0.08, trend: [110, 128, 135, 152], metrics: kpiMetrics(ar, 34, 12) },
  { id: "e2", name: t(ar, "Omar Zahrani", "عمر الزهراني"), role: t(ar, "Engineer", "مهندس"), target: 140, actual: 121, delta: -0.04, trend: [130, 126, 125, 121], metrics: kpiMetrics(ar, 27, 31) },
  { id: "e3", name: t(ar, "Lina Qahtani", "لينا القحطاني"), role: t(ar, "Project manager", "مديرة مشاريع"), target: 120, actual: 78, delta: -0.16, trend: [104, 96, 90, 78], metrics: kpiMetrics(ar, 19, 5) },
  { id: "e4", name: t(ar, "Khaled Otaibi", "خالد العتيبي"), role: t(ar, "Engineer", "مهندس"), target: 140, actual: 143, delta: 0.02, trend: [138, 140, 141, 143], metrics: kpiMetrics(ar, 31, 22) },
  { id: "e5", name: t(ar, "Nora Dossary", "نورة الدوسري"), role: t(ar, "QA analyst", "محللة جودة"), target: 130, actual: 109, delta: 0.05, trend: [90, 98, 104, 109], metrics: kpiMetrics(ar, 41, 63, ["Bugs found", "أخطاء مكتشفة"]) },
];

export const pipelineStages = (ar: boolean) => [
  { id: "lead", label: t(ar, "New leads", "عملاء محتملون جدد"), count: 240, value: 960000 },
  { id: "qualified", label: t(ar, "Qualified", "مؤهَّلون"), count: 132, value: 726000 },
  { id: "proposal", label: t(ar, "Proposal sent", "أُرسل العرض"), count: 71, value: 497000 },
  { id: "negotiation", label: t(ar, "Negotiation", "تفاوض"), count: 38, value: 304000 },
  { id: "won", label: t(ar, "Won", "مكسوبة"), count: 22, value: 198000, won: true },
];

export const supportSummary = {
  open: 86,
  firstResponseMinutes: 38,
  resolutionMinutes: 410,
  csat: 0.92,
  slaRate: 0.87,
  deltas: { open: 0.12, firstResponse: -0.18, resolution: -0.05, csat: 0.02, sla: -0.03 },
};

export const supportVolume = (days = 21, seed = 7) => {
  const created = series(days, 60, 30, seed);
  const resolved = series(days, 55, 26, seed + 1);
  return created.map((c, i) => {
    const d = new Date(Date.UTC(2026, 8, 10 + i));
    return { date: d.toISOString().slice(0, 10), created: c, resolved: resolved[i] ?? 0 };
  });
};

export const supportStatus = (ar: boolean) => [
  { id: "open", label: t(ar, "Open", "مفتوحة"), value: 86, color: "var(--nq-info)" },
  { id: "pending", label: t(ar, "Waiting on customer", "بانتظار العميل"), value: 41, color: "var(--nq-warning)" },
  { id: "solved", label: t(ar, "Solved", "محلولة"), value: 312, color: "var(--nq-success)" },
  { id: "escalated", label: t(ar, "Escalated", "مصعَّدة"), value: 9, color: "var(--nq-danger)" },
];

export const supportAgents = (ar: boolean) => [
  { id: "a1", name: t(ar, "Huda Mansour", "هدى منصور"), assigned: 112, resolved: 104, firstResponseMinutes: 22, csat: 0.96, trend: series(8, 12, 6, 11) },
  { id: "a2", name: t(ar, "Faisal Rashed", "فيصل راشد"), assigned: 98, resolved: 81, firstResponseMinutes: 44, csat: 0.9, trend: series(8, 10, 6, 12) },
  { id: "a3", name: t(ar, "Mona Saleh", "منى صالح"), assigned: 87, resolved: 85, firstResponseMinutes: 31, csat: 0.94, trend: series(8, 11, 5, 13) },
  { id: "a4", name: t(ar, "Tariq Jaber", "طارق جابر"), assigned: 64, resolved: 49, firstResponseMinutes: 152, csat: 0.81, trend: series(8, 7, 5, 14) },
];

/* ------------------------------------------------------------------------------------------- trends feed */

const at = (hoursAgo: number) => new Date(Date.UTC(2026, 8, 30, 9, 30) - hoursAgo * 3600000).toISOString();

export const trendTopics = (ar: boolean) => [
  {
    id: "tp1",
    title: t(ar, "Central bank holds rates steady", "البنك المركزي يثبّت أسعار الفائدة"),
    summary: t(ar, "Analysts expect a cut in the first quarter.", "يتوقع المحللون خفضًا في الربع الأول."),
    score: 92,
    reasons: [t(ar, "Carried by 6 outlets in two hours", "نشرته 6 منافذ خلال ساعتين"), t(ar, "Searches up 340% since yesterday", "ارتفعت عمليات البحث 340% منذ أمس")],
    outlets: [{ id: "o1", name: "Al Ekhbariya" }, { id: "o2", name: "Reuters" }, { id: "o3", name: "Argaam" }],
    items: [
      { id: "i1", title: t(ar, "Rates unchanged as inflation cools", "الفائدة دون تغيير مع تراجع التضخم"), outlet: "Reuters", url: "https://example.com/a", publishedAt: at(2) },
      { id: "i2", title: t(ar, "What the rate hold means for mortgages", "ماذا يعني تثبيت الفائدة للتمويل العقاري"), outlet: "Argaam", url: "https://example.com/b", publishedAt: at(3) },
    ],
    detectedAt: at(2),
    state: "new" as const,
  },
  {
    id: "tp2",
    title: t(ar, "New electric bus line opens in Riyadh", "افتتاح خط حافلات كهربائية جديد في الرياض"),
    score: 74,
    reasons: [t(ar, "Trending on social media", "رائج على وسائل التواصل")],
    outlets: [{ id: "o1", name: "Al Ekhbariya" }, { id: "o4", name: "SPA" }],
    items: [{ id: "i3", title: t(ar, "First riders board the new line", "أول الركاب على متن الخط الجديد"), outlet: "SPA", url: "https://example.com/c", publishedAt: at(5) }],
    detectedAt: at(5),
    state: "new" as const,
  },
  {
    id: "tp3",
    title: t(ar, "Retail sales rise ahead of the holiday season", "ارتفاع مبيعات التجزئة قبل موسم الإجازات"),
    score: 58,
    reasons: [t(ar, "Steady coverage for three days", "تغطية متواصلة منذ ثلاثة أيام")],
    outlets: [{ id: "o3", name: "Argaam" }],
    items: [{ id: "i4", title: t(ar, "Shoppers spend more on electronics", "المتسوقون ينفقون أكثر على الإلكترونيات"), outlet: "Argaam", publishedAt: at(28) }],
    detectedAt: at(28),
    state: "new" as const,
  },
  {
    id: "tp4",
    title: t(ar, "Startup funding hits a five year high", "تمويل الشركات الناشئة يبلغ أعلى مستوى في خمس سنوات"),
    score: 81,
    reasons: [t(ar, "Carried by 4 outlets", "نشرته 4 منافذ")],
    outlets: [{ id: "o2", name: "Reuters" }, { id: "o3", name: "Argaam" }],
    items: [{ id: "i5", title: t(ar, "Funding rounds double year on year", "جولات التمويل تتضاعف سنويًا"), outlet: "Reuters", publishedAt: at(30) }],
    detectedAt: at(30),
    state: "saved" as const,
  },
  {
    id: "tp5",
    title: t(ar, "Weather warning for the eastern region", "تحذير من الطقس في المنطقة الشرقية"),
    score: 33,
    reasons: [],
    outlets: [{ id: "o4", name: "SPA" }],
    items: [],
    detectedAt: at(52),
    state: "dismissed" as const,
  },
];

export const trendSources = (ar: boolean, tier1Down = false) => [
  { id: "s1", name: t(ar, "Saudi Press Agency", "وكالة الأنباء السعودية"), url: "https://example.com", tier: 1 as const, enabled: !tier1Down, health: "ok" as const, lastFetchedAt: at(0.2), perDay: 140 },
  { id: "s2", name: "Reuters", url: "https://example.com", tier: 1 as const, enabled: true, health: (tier1Down ? "down" : "degraded") as "down" | "degraded", lastFetchedAt: at(tier1Down ? 30 : 1), perDay: 320 },
  { id: "s3", name: "Argaam", url: "https://example.com", tier: 2 as const, enabled: true, health: "ok" as const, lastFetchedAt: at(0.5), perDay: 90 },
  { id: "s4", name: t(ar, "Community blogs", "المدونات المجتمعية"), tier: 3 as const, enabled: false, health: "ok" as const, perDay: 25 },
];
