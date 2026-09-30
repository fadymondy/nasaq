/*
 * Fake data, stateful demos and page frames for the marketing and SEO stories (SEO, keywords, funnels) and feature
 * flags. Everything is deterministic (anchored on 2026-09-29) so screenshots and reloads match, and nothing talks to a
 * server. Search engines and social networks are plain text: no logo is drawn.
 */
import {
  type AddKeywordsInput,
  type Backlink,
  BacklinkMonitor,
  type FeatureFlag,
  FeatureFlagDetail,
  FeatureFlagList,
  type FlagAuditEntry,
  type FlagEnvironmentDef,
  type FunnelDefinition,
  FunnelBuilder,
  FunnelChart,
  type FunnelSegment,
  type FunnelSource,
  type FunnelStep,
  type FunnelSummary,
  FunnelList,
  type KeywordCompetitor,
  type KeywordLocation,
  KeywordPlanner,
  KeywordTracker,
  type PlannerKeyword,
  type RuleDefinition,
  type RuleField,
  type SeoIssue,
  SeoIssueChecklist,
  type SeoMeta,
  type SeoPageRow,
  SeoPageList,
  SeoPreview,
  type SerpFeature,
  type TimeSeriesPoint,
  type TrackedKeyword,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@nasaq/web";
import { type ReactNode, useMemo, useState } from "react";
import { dayRange, rng, useAr, wait } from "./_analytics-demo";

export { useAr, wait };

/** The demo "now": a fixed instant so relative dates never drift. */
export const NOW = Date.parse("2026-09-29T12:00:00Z");
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

/* ------------------------------------------------------------------ page frame */

export function MarketingShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{title}</h1>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </main>
  );
}

/* ------------------------------------------------------------------ SEO */

export function seoMeta(ar: boolean): SeoMeta {
  return ar
    ? {
        title: "دليل تصميم واجهات المستخدم من اليمين إلى اليسار",
        description: "تعلّم كيف تبني واجهات تعمل باتجاه اليمين إلى اليسار دون ورقة أنماط ثانية، مع أمثلة عملية وقائمة فحص قبل الإطلاق.",
        url: "https://nasaq.example/ar/blog/rtl-design-guide",
        siteName: "نسق",
        breadcrumb: ["nasaq.example", "المدونة", "دليل RTL"],
        image: "",
      }
    : {
        title: "A complete guide to right-to-left interface design",
        description: "Learn how to build interfaces that work from right to left without a second stylesheet, with worked examples and a pre-launch checklist.",
        url: "https://nasaq.example/blog/rtl-design-guide",
        siteName: "Nasaq",
        image: "",
      };
}

const issue = (id: string, code: string, severity: SeoIssue["severity"], fixed = false): SeoIssue => ({ id, code, severity, fixed });

export function seoPages(ar: boolean): SeoPageRow[] {
  const p = (path: string) => `https://nasaq.example${ar ? "/ar" : ""}${path}`;
  const t = (en: string, arText: string) => (ar ? arText : en);
  return [
    { id: "p1", url: p("/"), title: t("Nasaq design system", "نظام تصميم نسق"), indexStatus: "indexed", issues: [issue("i1", "schema-missing", "info")], vitals: { LCP: 1900, INP: 140, CLS: 0.04 }, lastCrawled: iso(1) },
    { id: "p2", url: p("/pricing"), title: t("Pricing", "الأسعار"), indexStatus: "indexed", issues: [issue("i2", "description-short", "warning"), issue("i3", "og-image-missing", "warning")], vitals: { LCP: 2300, INP: 180, CLS: 0.08 }, lastCrawled: iso(1) },
    { id: "p3", url: p("/blog/rtl-design-guide"), title: t("A complete guide to right-to-left interface design", "دليل تصميم الواجهات من اليمين إلى اليسار"), indexStatus: "indexed", issues: [issue("i4", "title-long", "warning"), issue("i5", "alt-missing", "warning"), issue("i6", "canonical-missing", "error")], vitals: { LCP: 3400, INP: 260, CLS: 0.14 }, lastCrawled: iso(2) },
    { id: "p4", url: p("/docs/getting-started"), title: t("Getting started", "البدء"), indexStatus: "indexed", issues: [], vitals: { LCP: 1500, INP: 90, CLS: 0.01 }, lastCrawled: iso(1) },
    { id: "p5", url: p("/blog/design-tokens"), title: "", indexStatus: "not-indexed", issues: [issue("i7", "title-missing", "error"), issue("i8", "description-missing", "error"), issue("i9", "h1-missing", "warning"), issue("i10", "og-image-missing", "warning")], vitals: { LCP: 4600, INP: 310, CLS: 0.22 }, lastCrawled: iso(4) },
    { id: "p6", url: p("/changelog"), title: t("Changelog", "سجل التغييرات"), indexStatus: "pending", issues: [issue("i11", "title-duplicate", "warning"), issue("i12", "viewport-missing", "error")], vitals: { LCP: 2700, INP: 210, CLS: 0.06 }, lastCrawled: iso(3) },
    { id: "p7", url: p("/careers"), title: t("Careers", "الوظائف"), indexStatus: "blocked", issues: [issue("i13", "broken-links", "error"), issue("i14", "description-missing", "error")], lastCrawled: iso(6) },
    { id: "p8", url: p("/docs/rtl"), title: t("Right-to-left support", "دعم اليمين إلى اليسار"), indexStatus: "indexed", issues: [issue("i15", "slow-lcp", "warning")], vitals: { LCP: 3900, INP: 150, CLS: 0.03 }, lastCrawled: iso(2) },
    { id: "p9", url: p("/contact"), title: t("Contact", "اتصل بنا"), indexStatus: "indexed", issues: [issue("i16", "schema-missing", "info", true)], vitals: { LCP: 1700, INP: 110, CLS: 0.02 }, lastCrawled: iso(1) },
    { id: "p10", url: p("/blog"), title: t("Blog", "المدونة"), indexStatus: "indexed", issues: [issue("i17", "description-short", "warning"), issue("i18", "canonical-missing", "error")], vitals: { LCP: 2500, INP: 170, CLS: 0.09 }, lastCrawled: iso(1) },
  ];
}

/** Stateful SEO screen: the pages list, and the checklist of the page you open, with the preview editor beside it. */
export function SeoDemo({ preview = true }: { preview?: boolean }) {
  const ar = useAr();
  const [pages, setPages] = useState(() => seoPages(ar));
  const [openId, setOpenId] = useState<string | null>(null);
  const [meta, setMeta] = useState(() => seoMeta(ar));
  const open = pages.find((x) => x.id === openId) ?? null;

  const toggleFixed = async (target: SeoIssue, fixed: boolean) => {
    await wait(350);
    setPages((all) => all.map((pg) => ({ ...pg, issues: pg.issues.map((i) => (i.id === target.id ? { ...i, fixed } : i)) })));
  };

  return (
    <div className="flex flex-col gap-6">
      <SeoPageList
        pages={pages}
        onOpen={(pg) => setOpenId(pg.id)}
        onRecrawl={async (pg) => {
          await wait(600);
          setPages((all) => all.map((x) => (x.id === pg.id ? { ...x, lastCrawled: NOW } : x)));
        }}
        onRequestIndexing={async (pg) => {
          await wait(600);
          setPages((all) => all.map((x) => (x.id === pg.id ? { ...x, indexStatus: "pending" } : x)));
        }}
      />
      {open ? <SeoIssueChecklist key={open.id} url={open.url} issues={open.issues} onToggleFixed={toggleFixed} /> : null}
      {preview ? <SeoPreview value={meta} onValueChange={setMeta} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ keywords */

export const keywordLocations = (ar: boolean): KeywordLocation[] => [
  { value: "sa", label: ar ? "السعودية" : "Saudi Arabia" },
  { value: "ae", label: ar ? "الإمارات" : "United Arab Emirates" },
  { value: "eg", label: ar ? "مصر" : "Egypt" },
  { value: "us", label: ar ? "الولايات المتحدة" : "United States" },
];

function history(seed: number, from: number, to: number, days = 30): number[] {
  const r = rng(seed);
  return Array.from({ length: days }, (_, i) => {
    const base = from + ((to - from) * i) / (days - 1);
    return Math.max(1, Math.round(base + (r() - 0.5) * Math.max(2, from * 0.12)));
  });
}

function kw(id: string, keyword: string, seed: number, from: number, to: number, volume: number, difficulty: number, url: string, features: SerpFeature[] = []): TrackedKeyword {
  const h = history(seed, from, to);
  h[h.length - 1] = to;
  return { id, keyword, position: to, previousPosition: h[h.length - 8], history: h, url, volume, difficulty, features };
}

export function trackedKeywords(ar: boolean): TrackedKeyword[] {
  const p = (path: string) => `https://nasaq.example${ar ? "/ar" : ""}${path}`;
  const rows: TrackedKeyword[] = ar
    ? [
        kw("k1", "نظام تصميم عربي", 11, 14, 3, 5400, 42, p("/"), ["snippet", "sitelinks"]),
        kw("k2", "مكتبة مكونات react", 12, 24, 9, 8100, 61, p("/docs/getting-started"), ["paa"]),
        kw("k3", "تصميم واجهات rtl", 13, 12, 5, 2900, 35, p("/blog/rtl-design-guide"), ["snippet", "paa", "video"]),
        kw("k4", "ألوان واجهة مستخدم", 14, 8, 15, 3600, 48, p("/blog/design-tokens"), ["images"]),
        kw("k5", "أسعار نظام تصميم", 15, 30, 22, 720, 22, p("/pricing"), []),
        kw("k6", "قالب لوحة تحكم", 16, 40, 31, 12000, 72, p("/"), ["ads", "images"]),
        kw("k7", "خطوط عربية للويب", 17, 55, 48, 4400, 55, p("/blog"), []),
        kw("k8", "اختبار الوصول للواجهات", 18, 70, 66, 1300, 38, p("/docs/rtl"), ["paa"]),
      ]
    : [
        kw("k1", "arabic design system", 11, 14, 3, 5400, 42, p("/"), ["snippet", "sitelinks"]),
        kw("k2", "react component library", 12, 24, 9, 8100, 61, p("/docs/getting-started"), ["paa"]),
        kw("k3", "rtl ui design", 13, 12, 5, 2900, 35, p("/blog/rtl-design-guide"), ["snippet", "paa", "video"]),
        kw("k4", "design tokens guide", 14, 8, 15, 3600, 48, p("/blog/design-tokens"), ["images"]),
        kw("k5", "design system pricing", 15, 30, 22, 720, 22, p("/pricing"), []),
        kw("k6", "admin dashboard template", 16, 40, 31, 12000, 72, p("/"), ["ads", "images"]),
        kw("k7", "arabic web fonts", 17, 55, 48, 4400, 55, p("/blog"), []),
        kw("k8", "accessible ui testing", 18, 70, 66, 1300, 38, p("/docs/rtl"), ["paa"]),
      ];
  rows.push({ id: "k9", keyword: ar ? "مولد ألوان للواجهات" : "ui color generator", position: null, previousPosition: 88, history: history(19, 80, 100).map((n) => (n > 99 ? null : n)) as never, volume: 6600, difficulty: 58, url: undefined, features: [] });
  return rows;
}

export function positionSeries(): TimeSeriesPoint[] {
  const days = dayRange(30);
  const avg = history(21, 34, 21);
  const top10 = history(22, 1, 4).map((n) => Math.min(n, 8));
  return days.map((date, i) => ({ date, position: avg[i] ?? 0, top10: top10[i] ?? 0 }));
}

export function competitors(ar: boolean): KeywordCompetitor[] {
  const keys = trackedKeywords(ar).slice(0, 6);
  const mine = Object.fromEntries(keys.map((k) => [k.id, k.position]));
  const rank = (seed: number, lo: number, hi: number) => {
    const r = rng(seed);
    return Object.fromEntries(keys.map((k) => [k.id, Math.round(lo + r() * (hi - lo))]));
  };
  return [
    { id: "me", domain: "nasaq.example", you: true, ranks: mine },
    { id: "c1", domain: "designkit.example", ranks: rank(31, 2, 14) },
    { id: "c2", domain: "componentry.example", ranks: rank(32, 4, 26) },
    { id: "c3", domain: "uistack.example", ranks: rank(33, 8, 40) },
  ];
}

/** Stateful tracker: adding, removing and refreshing keywords all work against local state. */
export function KeywordsDemo() {
  const ar = useAr();
  const [rows, setRows] = useState(() => trackedKeywords(ar));
  const series = useMemo(() => positionSeries(), []);
  const comps = useMemo(() => competitors(ar), [ar]);
  const locations = useMemo(() => keywordLocations(ar), [ar]);

  return (
    <KeywordTracker
      keywords={rows}
      positionHistory={series}
      competitors={comps}
      locations={locations}
      defaultLocation="sa"
      onAddKeywords={async (input: AddKeywordsInput) => {
        await wait(700);
        setRows((all) => [
          ...all,
          ...input.keywords.map((keyword, i) => ({ id: `n${all.length + i}`, keyword, position: null, volume: 900 + i * 150, difficulty: 30 + i * 7, features: [] as SerpFeature[] })),
        ]);
      }}
      onRemoveKeywords={async (ids) => {
        await wait(500);
        setRows((all) => all.filter((k) => !ids.includes(k.id)));
      }}
      onRefresh={async () => {
        await wait(900);
      }}
      onUpdateKeyword={async (id, patch) => {
        await wait(400);
        if (!/^https?:\/\//.test(patch.url)) return { error: ar ? "أدخل رابطًا يبدأ بـ https" : "Enter a URL that starts with https" };
        setRows((all) => all.map((k) => (k.id === id ? { ...k, url: patch.url } : k)));
      }}
    />
  );
}

export function plannerKeywords(ar: boolean): PlannerKeyword[] {
  const p = (path: string) => `https://nasaq.example${ar ? "/ar" : ""}${path}`;
  const rows: PlannerKeyword[] = ar
    ? [
        { id: "a1", keyword: "نظام تصميم عربي", volume: 5400, difficulty: 42, ownerUrl: p("/"), rankingUrls: [{ url: p("/"), position: 3 }] },
        { id: "a2", keyword: "أفضل نظام تصميم عربي", volume: 1900, difficulty: 39, intent: "commercial", rankingUrls: [{ url: p("/pricing"), position: 12 }, { url: p("/blog"), position: 19 }] },
        { id: "a3", keyword: "كيف أبني نظام تصميم", volume: 2600, difficulty: 33, ownerUrl: p("/blog/design-tokens"), rankingUrls: [{ url: p("/blog/design-tokens"), position: 15 }] },
        { id: "a4", keyword: "شراء قالب لوحة تحكم", volume: 900, difficulty: 44, rankingUrls: [] },
        { id: "a5", keyword: "تصميم واجهات rtl", volume: 2900, difficulty: 35, ownerUrl: p("/blog/rtl-design-guide"), rankingUrls: [{ url: p("/blog/rtl-design-guide"), position: 5 }, { url: p("/docs/rtl"), position: 11 }] },
        { id: "a6", keyword: "دليل تصميم rtl", volume: 1100, difficulty: 30, rankingUrls: [{ url: p("/docs/rtl"), position: 7 }] },
        { id: "a7", keyword: "تسجيل الدخول نسق", volume: 320, difficulty: 8, ownerUrl: p("/"), rankingUrls: [] },
      ]
    : [
        { id: "a1", keyword: "arabic design system", volume: 5400, difficulty: 42, ownerUrl: p("/"), rankingUrls: [{ url: p("/"), position: 3 }] },
        { id: "a2", keyword: "best arabic design system", volume: 1900, difficulty: 39, intent: "commercial", rankingUrls: [{ url: p("/pricing"), position: 12 }, { url: p("/blog"), position: 19 }] },
        { id: "a3", keyword: "how to build a design system", volume: 2600, difficulty: 33, ownerUrl: p("/blog/design-tokens"), rankingUrls: [{ url: p("/blog/design-tokens"), position: 15 }] },
        { id: "a4", keyword: "buy admin dashboard template", volume: 900, difficulty: 44, rankingUrls: [] },
        { id: "a5", keyword: "rtl ui design", volume: 2900, difficulty: 35, ownerUrl: p("/blog/rtl-design-guide"), rankingUrls: [{ url: p("/blog/rtl-design-guide"), position: 5 }, { url: p("/docs/rtl"), position: 11 }] },
        { id: "a6", keyword: "rtl design guide", volume: 1100, difficulty: 30, rankingUrls: [{ url: p("/docs/rtl"), position: 7 }] },
        { id: "a7", keyword: "nasaq login", volume: 320, difficulty: 8, ownerUrl: p("/"), rankingUrls: [] },
      ];
  return rows;
}

export function PlannerDemo() {
  const ar = useAr();
  const [rows, setRows] = useState(() => plannerKeywords(ar));
  return (
    <KeywordPlanner
      keywords={rows}
      onAssignOwner={async (id, url) => {
        await wait(450);
        if (url && !/^https?:\/\//.test(url)) return { error: ar ? "أدخل رابطًا كاملًا" : "Enter a full URL" };
        setRows((all) => all.map((k) => (k.id === id ? { ...k, ownerUrl: url || undefined } : k)));
      }}
    />
  );
}

export function backlinks(ar: boolean): Backlink[] {
  const sources = ar
    ? ["مدونة-التقنية.example", "مجلة-المطورين.example", "ويب-عربي.example", "أخبار-البرمجة.example"]
    : ["devweekly.example", "frontend-news.example", "uxcollective.example", "buildinpublic.example"];
  const anchors = ar ? ["نسق", "نظام تصميم عربي", "اضغط هنا", "المصدر", "دليل RTL"] : ["Nasaq", "arabic design system", "click here", "source", "RTL guide"];
  const targets = ["/", "/blog/rtl-design-guide", "/docs/getting-started", "/pricing"];
  const r = rng(77);
  const rows: Backlink[] = Array.from({ length: 22 }, (_, i) => {
    const age = Math.floor(r() * 120);
    const spam = i % 7 === 3 ? 65 + Math.floor(r() * 30) : Math.floor(r() * 30);
    const src = i % 7 === 3 ? `cheap-links-${i}.example` : `${i % 4 === 0 ? "" : "blog."}${sources[i % sources.length]}`;
    return {
      id: `b${i}`,
      sourceUrl: `https://${src}/posts/${100 + i}`,
      targetUrl: `https://nasaq.example${targets[i % targets.length]}`,
      anchor: anchors[i % anchors.length] ?? "",
      domainRating: spam > 60 ? 8 + Math.floor(r() * 10) : 35 + Math.floor(r() * 55),
      spamScore: spam,
      firstSeen: iso(age),
      followed: i % 5 !== 0,
      lostAt: i % 6 === 1 && age > 10 ? iso(Math.floor(age / 3)) : undefined,
    };
  });
  // a few fresh ones so "new this week" is not empty
  rows[0] = { ...rows[0]!, firstSeen: iso(1), lostAt: undefined };
  rows[2] = { ...rows[2]!, firstSeen: iso(3), lostAt: undefined };
  rows[5] = { ...rows[5]!, firstSeen: iso(5), lostAt: undefined };
  return rows;
}

export function BacklinksDemo() {
  const ar = useAr();
  const [rows, setRows] = useState(() => backlinks(ar));
  return (
    <BacklinkMonitor
      links={rows}
      now={NOW}
      onDisavow={async (ids) => {
        await wait(700);
        setRows((all) => all.map((l) => (ids.includes(l.id) ? { ...l, disavowed: true } : l)));
      }}
      onMarkSafe={async (id) => {
        await wait(400);
        setRows((all) => all.map((l) => (l.id === id ? { ...l, spamScore: 10 } : l)));
      }}
    />
  );
}

/** The keyword and backlink tools, one tab each, for the Keywords page. */
export function KeywordsPageDemo() {
  const ar = useAr();
  return (
    <Tabs defaultValue="tracker">
      <TabsList>
        <TabsTab value="tracker">{ar ? "تتبع الترتيب" : "Rank tracking"}</TabsTab>
        <TabsTab value="planner">{ar ? "مخطط الكلمات" : "Planner"}</TabsTab>
        <TabsTab value="backlinks">{ar ? "الروابط الخلفية" : "Backlinks"}</TabsTab>
      </TabsList>
      <TabsPanel value="tracker" className="pt-4">
        <KeywordsDemo />
      </TabsPanel>
      <TabsPanel value="planner" className="pt-4">
        <PlannerDemo />
      </TabsPanel>
      <TabsPanel value="backlinks" className="pt-4">
        <BacklinksDemo />
      </TabsPanel>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ funnels */

export function funnelSteps(ar: boolean): FunnelStep[] {
  return ar
    ? [
        { id: "s1", label: "زيارة الموقع", count: 48200, detail: "/" },
        { id: "s2", label: "عرض منتج", count: 21400, detail: "product_viewed" },
        { id: "s3", label: "إضافة إلى السلة", count: 6900, detail: "add_to_cart" },
        { id: "s4", label: "بدء الدفع", count: 3100, detail: "/checkout" },
        { id: "s5", label: "إتمام الشراء", count: 1850, detail: "purchase_completed" },
      ]
    : [
        { id: "s1", label: "Visit site", count: 48200, detail: "/" },
        { id: "s2", label: "Product viewed", count: 21400, detail: "product_viewed" },
        { id: "s3", label: "Added to cart", count: 6900, detail: "add_to_cart" },
        { id: "s4", label: "Started checkout", count: 3100, detail: "/checkout" },
        { id: "s5", label: "Purchase completed", count: 1850, detail: "purchase_completed" },
      ];
}

export function funnelSegments(ar: boolean): FunnelSegment[] {
  const n = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "g1", label: n("Search", "البحث"), entered: 19800, converted: 780 },
    { id: "g2", label: n("Direct", "مباشر"), entered: 11400, converted: 610 },
    { id: "g3", label: n("Email", "البريد"), entered: 4300, converted: 290 },
    { id: "g4", label: n("Social", "التواصل الاجتماعي"), entered: 9200, converted: 130 },
    { id: "g5", label: n("Paid ads", "الإعلانات المدفوعة"), entered: 3500, converted: 40 },
  ];
}

export function funnelSources(ar: boolean): FunnelSource[] {
  return ar
    ? [
        { id: "e1", kind: "event", label: "عرض منتج", detail: "product_viewed" },
        { id: "e2", kind: "event", label: "إضافة إلى السلة", detail: "add_to_cart" },
        { id: "e3", kind: "event", label: "إتمام الشراء", detail: "purchase_completed" },
        { id: "e4", kind: "event", label: "إنشاء حساب", detail: "signed_up" },
        { id: "p1", kind: "page", label: "الصفحة الرئيسية", detail: "/" },
        { id: "p2", kind: "page", label: "الأسعار", detail: "/pricing" },
        { id: "p3", kind: "page", label: "الدفع", detail: "/checkout" },
      ]
    : [
        { id: "e1", kind: "event", label: "Product viewed", detail: "product_viewed" },
        { id: "e2", kind: "event", label: "Added to cart", detail: "add_to_cart" },
        { id: "e3", kind: "event", label: "Purchase completed", detail: "purchase_completed" },
        { id: "e4", kind: "event", label: "Signed up", detail: "signed_up" },
        { id: "p1", kind: "page", label: "Home page", detail: "/" },
        { id: "p2", kind: "page", label: "Pricing", detail: "/pricing" },
        { id: "p3", kind: "page", label: "Checkout", detail: "/checkout" },
      ];
}

export function funnelSummaries(ar: boolean): FunnelSummary[] {
  const n = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "f1", name: n("Store checkout", "الدفع في المتجر"), steps: 5, entered: 48200, conversion: 0.0384, previousConversion: 0.034, window: n("7 days", "7 أيام"), updatedAt: iso(1) },
    { id: "f2", name: n("Signup to trial", "من التسجيل إلى التجربة"), steps: 4, entered: 12600, conversion: 0.212, previousConversion: 0.236, window: n("14 days", "14 يومًا"), updatedAt: iso(3) },
    { id: "f3", name: n("Newsletter to purchase", "من النشرة إلى الشراء"), steps: 3, entered: 4300, conversion: 0.067, previousConversion: 0.067, window: n("30 days", "30 يومًا"), updatedAt: iso(8) },
    { id: "f4", name: n("Docs to install", "من الوثائق إلى التثبيت"), steps: 3, entered: 22100, conversion: 0.119, previousConversion: 0.104, window: n("1 day", "يوم واحد"), updatedAt: iso(12) },
  ];
}

/** Funnel screen: saved funnels, the result of the chosen one with a window select, and the builder. */
export function FunnelsDemo() {
  const ar = useAr();
  const [list, setList] = useState(() => funnelSummaries(ar));
  const [tab, setTab] = useState("chart");
  const [win, setWin] = useState("7");
  const steps = useMemo(() => {
    const k = win === "30" ? 3.4 : win === "1" ? 0.3 : 1;
    return funnelSteps(ar).map((s) => ({ ...s, count: Math.round(s.count * k) }));
  }, [ar, win]);
  const segments = useMemo(() => {
    const k = win === "30" ? 3.4 : win === "1" ? 0.3 : 1;
    return funnelSegments(ar).map((s) => ({ ...s, entered: Math.round(s.entered * k), converted: Math.round(s.converted * k) }));
  }, [ar, win]);
  const sources = useMemo(() => funnelSources(ar), [ar]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList>
        <TabsTab value="chart">{ar ? "النتائج" : "Results"}</TabsTab>
        <TabsTab value="list">{ar ? "القمعات المحفوظة" : "Saved funnels"}</TabsTab>
        <TabsTab value="builder">{ar ? "قمع جديد" : "New funnel"}</TabsTab>
      </TabsList>
      <TabsPanel value="chart" className="pt-4">
        <FunnelChart
          steps={steps}
          segments={segments}
          segmentLabel={ar ? "المصدر" : "Source"}
          title={ar ? "الدفع في المتجر" : "Store checkout"}
          action={
            <select aria-label={ar ? "الفترة" : "Window"} className="h-8 rounded-control border border-input bg-background ps-2 pe-6 text-body-sm" value={win} onChange={(e) => setWin(e.target.value)}>
              <option value="1">{ar ? "يوم" : "1 day"}</option>
              <option value="7">{ar ? "7 أيام" : "7 days"}</option>
              <option value="30">{ar ? "30 يومًا" : "30 days"}</option>
            </select>
          }
        />
      </TabsPanel>
      <TabsPanel value="list" className="pt-4">
        <FunnelList
          funnels={list}
          onOpen={() => setTab("chart")}
          onCreate={() => setTab("builder")}
          onEdit={() => setTab("builder")}
          onDuplicate={async (id) => {
            await wait(500);
            setList((all) => {
              const src = all.find((f) => f.id === id);
              return src ? [...all, { ...src, id: `${id}-copy-${all.length}`, name: `${src.name} (${ar ? "نسخة" : "copy"})` }] : all;
            });
          }}
          onDelete={async (id) => {
            await wait(500);
            setList((all) => all.filter((f) => f.id !== id));
          }}
        />
      </TabsPanel>
      <TabsPanel value="builder" className="pt-4">
        <FunnelBuilder
          sources={sources}
          onSave={async (value: FunnelDefinition) => {
            await wait(700);
            setList((all) => [
              { id: `new-${all.length}`, name: value.name, steps: value.steps.length, entered: 0, conversion: 0, window: `${value.window.amount} ${value.window.unit}`, updatedAt: new Date(NOW).toISOString() },
              ...all,
            ]);
            setTab("list");
          }}
        />
      </TabsPanel>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ feature flags */

export const flagEnvironments = (ar: boolean): FlagEnvironmentDef[] => [
  { id: "dev", label: ar ? "التطوير" : "Development" },
  { id: "staging", label: ar ? "الاختبار" : "Staging" },
  { id: "prod", label: ar ? "الإنتاج" : "Production" },
];

export const flagFields = (ar: boolean): RuleField[] => [
  { id: "plan", label: ar ? "الباقة" : "Plan", kind: "select", options: [{ value: "free", label: ar ? "مجانية" : "Free" }, { value: "pro", label: ar ? "احترافية" : "Pro" }, { value: "team", label: ar ? "فريق" : "Team" }] },
  { id: "country", label: ar ? "الدولة" : "Country", kind: "select", options: [{ value: "sa", label: ar ? "السعودية" : "Saudi Arabia" }, { value: "ae", label: ar ? "الإمارات" : "UAE" }, { value: "eg", label: ar ? "مصر" : "Egypt" }] },
  { id: "email", label: ar ? "نطاق البريد" : "Email domain", kind: "text" },
  { id: "beta", label: ar ? "مختبر تجريبي" : "Beta tester", kind: "boolean" },
  { id: "appVersion", label: ar ? "إصدار التطبيق" : "App version", kind: "number" },
];

function serve(variant: string, id: string): RuleDefinition["actions"][number] {
  return { id, type: "serve", config: { variant } };
}

export function featureFlags(ar: boolean): FeatureFlag[] {
  const n = (en: string, a: string) => (ar ? a : en);
  const proRule: RuleDefinition = {
    event: "evaluate",
    conditions: { kind: "group", id: "g-pro", join: "and", children: [{ kind: "condition", id: "c-pro", field: "plan", op: "is", value: "pro" }] },
    actions: [serve("new", "a-pro")],
  };
  const betaRule: RuleDefinition = {
    event: "evaluate",
    conditions: { kind: "group", id: "g-beta", join: "or", children: [{ kind: "condition", id: "c-beta", field: "beta", op: "is", value: "true" }, { kind: "condition", id: "c-mail", field: "email", op: "contains", value: "nasaq.example" }] },
    actions: [serve("new", "a-beta")],
  };
  const v = (control: string, next: string, a = 50, b = 50) => [{ key: "control", label: control, weight: a }, { key: "new", label: next, weight: b }];
  const env = (dev: [boolean, number], staging: [boolean, number], prod: [boolean, number]) => ({
    dev: { enabled: dev[0], rollout: dev[1] },
    staging: { enabled: staging[0], rollout: staging[1] },
    prod: { enabled: prod[0], rollout: prod[1] },
  });
  return [
    { key: "checkout.new-flow", name: n("New checkout flow", "مسار الدفع الجديد"), description: n("A shorter, one-page checkout.", "دفع أقصر في صفحة واحدة."), environments: env([true, 100], [true, 100], [true, 35]), variants: v(n("Current", "الحالي"), n("One page", "صفحة واحدة")), rules: [proRule], updatedAt: iso(1), updatedBy: "Layla", tags: ["checkout"] },
    { key: "search.semantic", name: n("Semantic search", "البحث الدلالي"), environments: env([true, 100], [true, 100], [true, 100]), variants: [], rules: [], updatedAt: iso(6), updatedBy: "Omar" },
    { key: "billing.usage-alerts", name: n("Usage alerts", "تنبيهات الاستخدام"), environments: env([true, 100], [true, 50], [false, 0]), variants: [], rules: [], updatedAt: iso(2), updatedBy: "Sara" },
    { key: "ui.dark-sidebar", name: n("Dark sidebar", "الشريط الجانبي الداكن"), environments: env([true, 100], [false, 0], [false, 0]), variants: v(n("Light", "فاتح"), n("Dark", "داكن"), 70, 30), rules: [betaRule], updatedAt: iso(9), updatedBy: "Layla" },
    { key: "ai.assistant", name: n("AI assistant", "المساعد الذكي"), environments: env([true, 100], [true, 100], [true, 10]), variants: [], rules: [betaRule], updatedAt: iso(3), updatedBy: "Omar", tags: ["ai"] },
    { key: "export.pdf-v2", name: n("PDF export v2", "تصدير PDF الإصدار 2"), killed: true, environments: env([true, 100], [true, 100], [true, 100]), variants: [], rules: [], updatedAt: iso(0), updatedBy: "Sara" },
    { key: "onboarding.checklist", name: n("Onboarding checklist", "قائمة البدء"), environments: env([true, 100], [true, 100], [true, 80]), variants: [], rules: [], updatedAt: iso(14), updatedBy: "Layla" },
    { key: "mobile.offline-mode", name: n("Offline mode", "وضع عدم الاتصال"), environments: env([false, 0], [false, 0], [false, 0]), variants: [], rules: [], updatedAt: iso(20), updatedBy: "Omar" },
  ];
}

export function flagAudit(ar: boolean): FlagAuditEntry[] {
  const n = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "h1", action: "rollout", actor: "Layla", at: iso(1), environment: n("Production", "الإنتاج"), from: "20", to: "35" },
    { id: "h2", action: "rules", actor: "Omar", at: iso(2) },
    { id: "h3", action: "toggled", actor: "Sara", at: iso(4), environment: n("Staging", "الاختبار"), from: "off", to: "on" },
    { id: "h4", action: "variants", actor: "Layla", at: iso(6) },
    { id: "h5", action: "killed", actor: "Omar", at: iso(9), reason: n("Payment errors spiked", "ارتفاع أخطاء الدفع") },
    { id: "h6", action: "restored", actor: "Sara", at: iso(9) },
    { id: "h7", action: "created", actor: "Layla", at: iso(21) },
  ];
}

/** Flag list; opening a flag shows its detail with every control working against local state. */
export function FlagsDemo() {
  const ar = useAr();
  const envs = useMemo(() => flagEnvironments(ar), [ar]);
  const fields = useMemo(() => flagFields(ar), [ar]);
  const [flags, setFlags] = useState(() => featureFlags(ar));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [audit, setAudit] = useState<Record<string, FlagAuditEntry[]>>({});
  const open = flags.find((f) => f.key === openKey) ?? null;
  const labelOf = (id: string) => envs.find((e) => e.id === id)?.label ?? id;

  const patch = (key: string, change: (f: FeatureFlag) => FeatureFlag, entry?: Omit<FlagAuditEntry, "id" | "at" | "actor">) => {
    setFlags((all) => all.map((f) => (f.key === key ? { ...change(f), updatedAt: new Date(NOW).toISOString() } : f)));
    if (entry) setAudit((a) => ({ ...a, [key]: [{ ...entry, id: `new-${Date.now()}`, actor: ar ? "أنت" : "You", at: new Date(NOW).toISOString() }, ...(a[key] ?? flagAudit(ar))] }));
  };

  if (open) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" className="w-fit text-body-sm text-primary underline-offset-4 hover:underline" onClick={() => setOpenKey(null)}>
          {ar ? "كل الأعلام" : "All flags"}
        </button>
        <h2 className="text-h3 text-foreground">{open.name}</h2>
        <FeatureFlagDetail
          flag={open}
          environments={envs}
          fields={fields}
          audit={audit[open.key] ?? flagAudit(ar)}
          onToggle={async (envId, enabled) => {
            await wait(400);
            patch(open.key, (f) => ({ ...f, environments: { ...f.environments, [envId]: { ...(f.environments[envId] ?? { rollout: 100 }), enabled } } }), { action: "toggled", environment: labelOf(envId), from: enabled ? "off" : "on", to: enabled ? "on" : "off" });
          }}
          onRolloutChange={async (envId, percent) => {
            await wait(400);
            const from = String(open.environments[envId]?.rollout ?? 0);
            patch(open.key, (f) => ({ ...f, environments: { ...f.environments, [envId]: { ...(f.environments[envId] ?? { enabled: true }), rollout: percent } } }), { action: "rollout", environment: labelOf(envId), from, to: String(percent) });
          }}
          onRulesChange={async (rules) => {
            await wait(500);
            patch(open.key, (f) => ({ ...f, rules }), { action: "rules" });
          }}
          onVariantsChange={async (variants) => {
            await wait(500);
            patch(open.key, (f) => ({ ...f, variants }), { action: "variants" });
          }}
          onKill={async (reason) => {
            await wait(600);
            patch(open.key, (f) => ({ ...f, killed: true }), { action: "killed", reason });
          }}
          onRestore={async () => {
            await wait(600);
            patch(open.key, (f) => ({ ...f, killed: false }), { action: "restored" });
          }}
        />
      </div>
    );
  }

  return (
    <FeatureFlagList
      flags={flags}
      environments={envs}
      onOpen={setOpenKey}
      onCreate={() => {}}
      onToggle={async (key, envId, enabled) => {
        await wait(400);
        if (key === "search.semantic" && envId === "prod" && !enabled) return { error: ar ? "لا يمكن إيقاف هذا العلم في الإنتاج: يعتمد عليه البحث." : "This flag cannot be switched off in production: search depends on it." };
        patch(key, (f) => ({ ...f, environments: { ...f.environments, [envId]: { ...(f.environments[envId] ?? { rollout: 100 }), enabled } } }), { action: "toggled", environment: labelOf(envId), from: enabled ? "off" : "on", to: enabled ? "on" : "off" });
      }}
      onDelete={async (key) => {
        await wait(500);
        setFlags((all) => all.filter((f) => f.key !== key));
      }}
    />
  );
}
