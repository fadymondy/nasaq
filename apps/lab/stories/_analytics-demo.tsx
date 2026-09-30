/*
 * Fake data and async helpers shared by the analytics stories. Everything is deterministic (seeded, anchored on
 * 2026-09-29) so screenshots and reloads match, and nothing talks to a server. Brand names are plain text: no
 * Google Analytics, Search Console or YouTube logo is drawn, because only the official assets may be used.
 */
import {
  type ApmData,
  type BreakdownRow,
  type EndpointRow,
  type ErrorRatePoint,
  type GoogleAnalyticsData,
  type IntegrationService,
  type IntegrationStatus,
  type LatencyPoint,
  type SearchConsoleData,
  type SearchPerformanceRow,
  type TimeSeriesPoint,
  type TraceSpan,
  type TraceSummary,
  type WebVitalsData,
  type WebVitalsDevice,
  type YouTubeChannelData,
  useNasaq,
} from "@nasaq/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const useAr = () => useNasaq().locale.startsWith("ar");

/* ---------- deterministic numbers and dates ---------- */

/** Small seeded generator, so the same demo renders the same every time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const END = "2026-09-29";

/** "YYYY-MM-DD" for `end` minus `back` days, computed in UTC so the day never shifts. */
export function dayBefore(back: number, end = END): string {
  const [y, m, d] = end.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d - back));
  return t.toISOString().slice(0, 10);
}

/** `n` day strings ending `offset` days before END, oldest first. */
export function dayRange(n: number, offset = 0): string[] {
  return Array.from({ length: n }, (_, i) => dayBefore(offset + n - 1 - i));
}

/** A wavy daily series with a weekly rhythm, a slow trend and some noise. */
export function wave(n: number, base: number, { trend = 0, weekly = 0.14, noise = 0.06, seed = 1 }: { trend?: number; weekly?: number; noise?: number; seed?: number } = {}): number[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const day = (i + 3) % 7; // the anchor date falls late in the week, so weekends dip
    const rhythm = day === 5 || day === 6 ? -weekly : day === 0 ? weekly / 3 : weekly / 6;
    return Math.max(0, base * (1 + trend * (i / Math.max(1, n - 1)) + rhythm + (r() - 0.5) * 2 * noise));
  });
}

const round = (v: number) => Math.round(v);
const sum = (v: readonly number[]) => v.reduce((a, b) => a + b, 0);
const mean = (v: readonly number[]) => (v.length ? sum(v) / v.length : 0);
const spark = (v: readonly number[], points = 14) => {
  const step = Math.max(1, Math.floor(v.length / points));
  return v.filter((_, i) => i % step === 0).map((x) => Math.round(x * 100) / 100);
};
const scaleRows = (rows: readonly [string, number][], prefix: string, prevSeed: number): BreakdownRow[] => {
  const r = rng(prevSeed);
  return rows.map(([label, value], i) => ({ id: `${prefix}${i}`, label, value, previous: Math.max(1, round(value * (0.82 + r() * 0.4))) }));
};

/* ---------- connection and report hooks ---------- */

export type DemoKind = "ga" | "gsc" | "youtube" | "apm" | "vitals";

const NAMES: Record<DemoKind, string> = { ga: "Google Analytics", gsc: "Search Console", youtube: "YouTube", apm: "Nasaq APM", vitals: "Chrome UX Report" };

const ACCOUNTS: Record<DemoKind, { en: [string, string][]; ar: [string, string][] }> = {
  ga: {
    en: [["p1", "Nasaq blog (nasaq.dev)"], ["p2", "Nasaq docs (docs.nasaq.dev)"]],
    ar: [["p1", "مدونة نسق (nasaq.dev)"], ["p2", "توثيق نسق (docs.nasaq.dev)"]],
  },
  gsc: {
    en: [["s1", "https://nasaq.dev/"], ["s2", "https://docs.nasaq.dev/"]],
    ar: [["s1", "https://nasaq.dev/"], ["s2", "https://docs.nasaq.dev/"]],
  },
  youtube: {
    en: [["c1", "Nasaq Design"], ["c2", "Nasaq Talks"]],
    ar: [["c1", "نسق للتصميم"], ["c2", "حديث نسق"]],
  },
  apm: { en: [["a1", "api.nasaq.dev (production)"], ["a2", "api.nasaq.dev (staging)"]], ar: [["a1", "api.nasaq.dev (الإنتاج)"], ["a2", "api.nasaq.dev (التجريبي)"]] },
  vitals: { en: [["o1", "https://nasaq.dev"], ["o2", "https://docs.nasaq.dev"]], ar: [["o1", "https://nasaq.dev"], ["o2", "https://docs.nasaq.dev"]] },
};

function scopesFor(kind: DemoKind, ar: boolean) {
  const t = (en: string, a: string) => (ar ? a : en);
  switch (kind) {
    case "ga":
      return [{ id: "analytics.readonly", label: t("See your Google Analytics reports and settings", "عرض تقارير Google Analytics وإعداداتها"), required: true }];
    case "gsc":
      return [{ id: "webmasters.readonly", label: t("See your Search Console performance data", "عرض بيانات أداء Search Console"), required: true }];
    case "youtube":
      return [
        { id: "youtube.readonly", label: t("See your YouTube account and channel", "عرض حسابك وقناتك على YouTube"), required: true },
        { id: "yt-analytics.readonly", label: t("See your YouTube Analytics reports", "عرض تقارير YouTube Analytics"), required: true },
      ];
    case "apm":
      return [{ id: "apm.read", label: t("Read traces, metrics and error groups", "قراءة التتبّعات والمقاييس ومجموعات الأخطاء"), required: true }];
    case "vitals":
      return [{ id: "crux.read", label: t("Read real-user Core Web Vitals for your origins", "قراءة مؤشرات الويب الأساسية من المستخدمين الفعليين لنطاقاتك"), required: true }];
  }
}

const IDENTITY: Record<DemoKind, string> = { ga: "sara@nasaq.dev", gsc: "sara@nasaq.dev", youtube: "sara@nasaq.dev", apm: "sara@nasaq.dev", vitals: "sara@nasaq.dev" };

/** The service object for one page, as the host would build it from its own OAuth state. */
export function makeService(kind: DemoKind, ar: boolean, status: IntegrationStatus, accountId?: string): IntegrationService {
  const accounts = ACCOUNTS[kind][ar ? "ar" : "en"].map(([id, name]) => ({ id, name }));
  const connected = status === "connected";
  return {
    id: kind,
    name: NAMES[kind],
    scopes: scopesFor(kind, ar),
    status,
    connectedAs: connected || status === "needs-reauth" ? IDENTITY[kind] : undefined,
    accounts: connected ? accounts : undefined,
    accountId: connected ? (accountId ?? accounts[0]?.id) : undefined,
    message: status === "needs-reauth" ? (ar ? "انتهت صلاحية تسجيل الدخول." : "The sign-in expired.") : undefined,
    lastSyncAt: connected ? Date.parse("2026-09-29T09:40:00Z") : undefined,
  };
}

/** Connection state that behaves like a real OAuth round trip: connect and disconnect take a moment. */
export function useDemoConnection(kind: DemoKind, initial: IntegrationStatus = "connected") {
  const ar = useAr();
  const [status, setStatus] = useState<IntegrationStatus>(initial);
  const [accountId, setAccountId] = useState<string>();
  const service = useMemo(() => makeService(kind, ar, status, accountId), [kind, ar, status, accountId]);
  return {
    service,
    connected: status === "connected",
    accountId: accountId ?? service.accountId,
    onConnect: async () => {
      await wait(900);
      setStatus("connected");
    },
    onDisconnect: async () => {
      await wait(500);
      setStatus("disconnected");
    },
    onSelectAccount: async (_id: string, account: string) => {
      await wait(400);
      setAccountId(account);
    },
  };
}

/**
 * Loads a report after a short delay and again whenever `key` changes, so the skeleton, the refresh button and the
 * period switch all show their loading states. `make` may change every render.
 */
export function useDemoReport<T>(make: () => T, key: string, enabled: boolean) {
  const makeRef = useRef(make);
  makeRef.current = make;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.parse("2026-09-29T09:40:00Z"));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    wait(900).then(() => {
      if (!live) return;
      setData(makeRef.current());
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [key, enabled]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await wait(900);
    setData(makeRef.current());
    setUpdatedAt(Date.now());
    setNonce((n) => n + 1);
    setRefreshing(false);
  }, []);

  return { data, loading, refreshing, updatedAt, onRefresh, nonce };
}

/* ---------- Google Analytics ---------- */

const CHANNELS = {
  en: ["Organic Search", "Direct", "Referral", "Organic Social", "Email", "Paid Search"],
  ar: ["البحث المجاني", "مباشر", "إحالة", "التواصل الاجتماعي", "البريد الإلكتروني", "البحث المدفوع"],
};
const DEVICES = { en: ["Mobile", "Desktop", "Tablet"], ar: ["الجوال", "سطح المكتب", "الجهاز اللوحي"] };

export function gaReport(period: number, ar: boolean): GoogleAnalyticsData {
  const l = ar ? "ar" : "en";
  const dates = dayRange(period);
  const prevDates = dayRange(period, period);
  const users = wave(period, 2140, { trend: 0.12, seed: 11 });
  const sessions = users.map((u, i) => u * (1.28 + (i % 5) * 0.01));
  const conversions = sessions.map((s, i) => s * (0.031 + (i % 4) * 0.002));
  const pUsers = wave(period, 1960, { trend: 0.05, seed: 12 });
  const pSessions = pUsers.map((u) => u * 1.27);
  const pConv = pSessions.map((s) => s * 0.03);
  const series: TimeSeriesPoint[] = dates.map((date, i) => ({ date, users: round(users[i]!), sessions: round(sessions[i]!), conversions: round(conversions[i]!) }));
  const previousSeries: TimeSeriesPoint[] = prevDates.map((date, i) => ({ date, users: round(pUsers[i]!), sessions: round(pSessions[i]!), conversions: round(pConv[i]!) }));
  const rt = wave(30, 86, { weekly: 0, noise: 0.25, seed: 5 }).map(round);
  const ch = [0.46, 0.22, 0.13, 0.1, 0.06, 0.03];
  const total = sum(sessions);
  return {
    summary: {
      users: { value: round(sum(users) * 0.83), previous: round(sum(pUsers) * 0.83), trend: spark(users) },
      sessions: { value: round(total), previous: round(sum(pSessions)), trend: spark(sessions) },
      engagementRate: { value: 0.612, previous: 0.587, trend: spark(wave(period, 0.6, { seed: 3, noise: 0.03 })) },
      engagementSeconds: { value: 98, previous: 104, trend: spark(wave(period, 98, { seed: 4, noise: 0.05 })) },
      conversions: { value: round(sum(conversions)), previous: round(sum(pConv)), trend: spark(conversions) },
    },
    series,
    previousSeries,
    realtime: {
      active: rt[rt.length - 1]!,
      perMinute: rt,
      updatedAt: Date.parse("2026-09-29T09:40:00Z"),
      pages: [
        { id: "r1", label: "/blog/rtl-design-systems", value: 21 },
        { id: "r2", label: "/docs/components/data-table", value: 14 },
        { id: "r3", label: "/", value: 12 },
        { id: "r4", label: "/pricing", value: 7 },
        { id: "r5", label: "/blog/arabic-numerals", value: 5 },
      ],
      countries: [
        { code: "SA", value: 31 },
        { code: "EG", value: 18 },
        { code: "AE", value: 14 },
        { code: "US", value: 9 },
      ],
    },
    channels: CHANNELS[l].map((label, i) => ({ id: `c${i}`, label, value: round(total * ch[i]!), previous: round(total * ch[i]! * (0.85 + ((i * 7) % 10) / 33)) })),
    sourceMedium: scaleRows(
      [
        ["google / organic", round(total * 0.41)],
        ["(direct) / (none)", round(total * 0.22)],
        ["t.co / referral", round(total * 0.07)],
        ["newsletter / email", round(total * 0.06)],
        ["linkedin.com / referral", round(total * 0.05)],
        ["bing / organic", round(total * 0.04)],
        ["github.com / referral", round(total * 0.03)],
        ["duckduckgo / organic", round(total * 0.02)],
      ],
      "sm",
      21,
    ),
    pages: scaleRows(
      [
        ["/blog/rtl-design-systems", round(total * 0.14)],
        ["/", round(total * 0.12)],
        ["/docs/components/data-table", round(total * 0.09)],
        ["/blog/arabic-numerals", round(total * 0.07)],
        ["/pricing", round(total * 0.06)],
        ["/docs/getting-started", round(total * 0.05)],
        ["/docs/components/chart", round(total * 0.04)],
        ["/blog/tokens-in-tailwind-v4", round(total * 0.035)],
        ["/changelog", round(total * 0.025)],
        ["/about", round(total * 0.015)],
      ],
      "pg",
      22,
    ),
    countries: [
      { code: "SA", value: round(total * 0.27), previous: round(total * 0.24) },
      { code: "EG", value: round(total * 0.16), previous: round(total * 0.17) },
      { code: "AE", value: round(total * 0.11), previous: round(total * 0.1) },
      { code: "US", value: round(total * 0.08), previous: round(total * 0.09) },
      { code: "KW", value: round(total * 0.06), previous: round(total * 0.05) },
      { code: "JO", value: round(total * 0.05), previous: round(total * 0.05) },
      { code: "GB", value: round(total * 0.04), previous: round(total * 0.045) },
      { code: "QA", value: round(total * 0.03), previous: round(total * 0.028) },
    ],
    devices: DEVICES[l].map((label, i) => ({ id: `d${i}`, label, value: round(total * [0.64, 0.31, 0.05][i]!), previous: round(total * [0.6, 0.35, 0.05][i]!) })),
    daily: dates.map((date, i) => ({ date, count: round(sessions[i]!) })),
  };
}

/* ---------- Search Console ---------- */

const QUERIES = {
  en: ["nasaq design system", "rtl react components", "arabic ui kit", "base ui data table", "tailwind v4 design tokens", "rtl data table react", "arabic numerals formatting", "storybook rtl", "shadcn registry rtl", "bidi text react", "hijri date picker", "stat card component", "nasaq ui", "arabic dashboard template", "rtl chart recharts", "design tokens css variables", "react rtl tailwind", "phone input arabic", "arabic form validation messages", "web vitals dashboard"],
  ar: ["نظام تصميم نسق", "مكونات ريأكت من اليمين لليسار", "مجموعة واجهات عربية", "جدول بيانات base ui", "متغيرات تصميم tailwind", "جدول بيانات عربي ريأكت", "تنسيق الأرقام العربية", "ستوري بوك عربي", "سجل shadcn عربي", "النص ثنائي الاتجاه ريأكت", "منتقي التاريخ الهجري", "مكون بطاقة إحصائية", "نسق ui", "قالب لوحة تحكم عربي", "مخطط بياني عربي", "رموز التصميم css", "ريأكت وtailwind عربي", "حقل رقم الهاتف", "رسائل التحقق من النماذج", "لوحة مؤشرات الويب"],
};

function searchRows(labels: readonly string[], seed: number, scale: number): SearchPerformanceRow[] {
  const r = rng(seed);
  return labels.map((label, i) => {
    const impressions = round((scale / (i + 1.4)) * (0.8 + r() * 0.5));
    const ctr = Math.max(0.006, 0.12 / (1 + i * 0.35) + (r() - 0.5) * 0.01);
    const clicks = round(impressions * ctr);
    const position = Math.round((1.6 + i * 1.15 + r() * 2.2) * 10) / 10;
    return { id: `r${i}`, label, clicks, impressions, position, previousClicks: round(clicks * (0.78 + r() * 0.45)), previousPosition: Math.round((position + (r() - 0.45) * 2.4) * 10) / 10 };
  });
}

export function gscReport(period: number, ar: boolean): SearchConsoleData {
  const l = ar ? "ar" : "en";
  const dates = dayRange(period);
  const prevDates = dayRange(period, period);
  const clicks = wave(period, 430, { trend: 0.18, seed: 31 });
  const impressions = wave(period, 14200, { trend: 0.1, seed: 32 });
  const position = wave(period, 11.6, { trend: -0.07, weekly: 0.02, noise: 0.03, seed: 33 });
  const pClicks = wave(period, 372, { trend: 0.06, seed: 34 });
  const pImpressions = wave(period, 13100, { trend: 0.04, seed: 35 });
  const pPosition = wave(period, 12.4, { trend: 0, weekly: 0.02, noise: 0.03, seed: 36 });
  const totalClicks = sum(clicks);
  const totalImpr = sum(impressions);
  const pTotalClicks = sum(pClicks);
  const pTotalImpr = sum(pImpressions);
  return {
    summary: {
      clicks: { value: round(totalClicks), previous: round(pTotalClicks), trend: spark(clicks) },
      impressions: { value: round(totalImpr), previous: round(pTotalImpr), trend: spark(impressions) },
      ctr: { value: totalClicks / totalImpr, previous: pTotalClicks / pTotalImpr, trend: spark(clicks.map((c, i) => c / impressions[i]!)) },
      position: { value: Math.round(mean(position) * 10) / 10, previous: Math.round(mean(pPosition) * 10) / 10, trend: spark(position) },
    },
    series: dates.map((date, i) => ({ date, clicks: round(clicks[i]!), impressions: round(impressions[i]!), ctr: clicks[i]! / impressions[i]!, position: Math.round(position[i]! * 10) / 10 })),
    previousSeries: prevDates.map((date, i) => ({ date, clicks: round(pClicks[i]!), impressions: round(pImpressions[i]!), ctr: pClicks[i]! / pImpressions[i]!, position: Math.round(pPosition[i]! * 10) / 10 })),
    queries: searchRows(QUERIES[l], 41, totalImpr / 6),
    pages: searchRows(["https://nasaq.dev/blog/rtl-design-systems", "https://nasaq.dev/", "https://nasaq.dev/docs/components/data-table", "https://nasaq.dev/blog/arabic-numerals", "https://nasaq.dev/pricing", "https://nasaq.dev/docs/getting-started", "https://nasaq.dev/docs/components/chart", "https://nasaq.dev/blog/tokens-in-tailwind-v4", "https://nasaq.dev/changelog", "https://nasaq.dev/about", "https://nasaq.dev/docs/components/phone-input", "https://nasaq.dev/docs/rtl"], 42, totalImpr / 5),
    countries: [
      { code: "SA", value: round(totalClicks * 0.31), previous: round(pTotalClicks * 0.29) },
      { code: "EG", value: round(totalClicks * 0.2), previous: round(pTotalClicks * 0.21) },
      { code: "AE", value: round(totalClicks * 0.1), previous: round(pTotalClicks * 0.09) },
      { code: "US", value: round(totalClicks * 0.08), previous: round(pTotalClicks * 0.09) },
      { code: "KW", value: round(totalClicks * 0.05), previous: round(pTotalClicks * 0.04) },
      { code: "JO", value: round(totalClicks * 0.05), previous: round(pTotalClicks * 0.05) },
      { code: "GB", value: round(totalClicks * 0.04), previous: round(pTotalClicks * 0.04) },
      { code: "MA", value: round(totalClicks * 0.03), previous: round(pTotalClicks * 0.03) },
    ],
    devices: DEVICES[l].map((label, i) => ({ id: `d${i}`, label, value: round(totalClicks * [0.61, 0.36, 0.03][i]!), previous: round(pTotalClicks * [0.58, 0.39, 0.03][i]!) })),
  };
}

/* ---------- YouTube ---------- */

const VIDEOS = {
  en: ["Build an RTL dashboard in 20 minutes", "Arabic numerals: the bugs nobody warns you about", "Design tokens with Tailwind v4", "Bidi text in React, explained", "A data table that works in Arabic", "Nasaq design system tour", "Charts in RTL with Recharts", "Hijri dates without pain", "Accessible forms, end to end", "Storybook as a living lab"],
  ar: ["ابنِ لوحة تحكم عربية في 20 دقيقة", "الأرقام العربية: الأخطاء التي لا ينبّهك إليها أحد", "رموز التصميم مع Tailwind v4", "النص ثنائي الاتجاه في ريأكت", "جدول بيانات يعمل بالعربية", "جولة في نظام نسق للتصميم", "المخططات من اليمين لليسار مع Recharts", "التاريخ الهجري بلا عناء", "نماذج سهلة الوصول من البداية للنهاية", "ستوري بوك كمختبر حي"],
};
const TRAFFIC = {
  en: ["YouTube search", "Suggested videos", "Browse features", "External", "Channel pages", "Notifications", "Playlists"],
  ar: ["بحث YouTube", "الفيديوهات المقترحة", "ميزات التصفح", "مصادر خارجية", "صفحات القنوات", "الإشعارات", "قوائم التشغيل"],
};

export function youtubeReport(period: number, ar: boolean): YouTubeChannelData {
  const l = ar ? "ar" : "en";
  const dates = dayRange(period);
  const prevDates = dayRange(period, period);
  const views = wave(period, 5200, { trend: 0.14, seed: 51, weekly: 0.1 });
  const hours = views.map((v, i) => v * (0.043 + (i % 3) * 0.002));
  const subs = wave(period, 19, { trend: 0.2, seed: 52, noise: 0.25 });
  const pViews = wave(period, 4700, { trend: 0.03, seed: 53, weekly: 0.1 });
  const pHours = pViews.map((v) => v * 0.044);
  const pSubs = wave(period, 17, { trend: 0.05, seed: 54, noise: 0.25 });
  const totalViews = sum(views);
  const share = [0.19, 0.15, 0.13, 0.11, 0.09, 0.08, 0.06, 0.05, 0.04, 0.03];
  return {
    channel: { name: ar ? "نسق للتصميم" : "Nasaq Design", handle: "@nasaqdesign", subscribers: 48200 },
    summary: {
      views: { value: round(totalViews), previous: round(sum(pViews)), trend: spark(views) },
      watchHours: { value: round(sum(hours)), previous: round(sum(pHours)), trend: spark(hours) },
      subscribers: { value: round(sum(subs)), previous: round(sum(pSubs)), trend: spark(subs) },
      avgSeconds: { value: 214, previous: 226, trend: spark(wave(period, 214, { seed: 55, noise: 0.05 })) },
    },
    series: dates.map((date, i) => ({ date, views: round(views[i]!), watchHours: round(hours[i]!), subscribers: round(subs[i]!) })),
    previousSeries: prevDates.map((date, i) => ({ date, views: round(pViews[i]!), watchHours: round(pHours[i]!), subscribers: round(pSubs[i]!) })),
    videos: VIDEOS[l].map((title, i) => ({
      id: `v${i}`,
      title,
      views: round(totalViews * share[i]!),
      previousViews: round(totalViews * share[i]! * (0.7 + ((i * 13) % 9) / 14)),
      watchHours: round(totalViews * share[i]! * (0.03 + (i % 4) * 0.008)),
      avgSeconds: 150 + ((i * 47) % 260),
      href: "#",
    })),
    trafficSources: TRAFFIC[l].map((label, i) => ({ id: `t${i}`, label, value: round(totalViews * [0.31, 0.24, 0.17, 0.12, 0.07, 0.05, 0.04][i]!), previous: round(totalViews * [0.29, 0.26, 0.16, 0.12, 0.07, 0.06, 0.04][i]! * 0.92) })),
    countries: [
      { code: "SA", value: round(totalViews * 0.24), previous: round(totalViews * 0.2) },
      { code: "EG", value: round(totalViews * 0.19), previous: round(totalViews * 0.2) },
      { code: "AE", value: round(totalViews * 0.09), previous: round(totalViews * 0.08) },
      { code: "IQ", value: round(totalViews * 0.07), previous: round(totalViews * 0.06) },
      { code: "US", value: round(totalViews * 0.06), previous: round(totalViews * 0.07) },
      { code: "MA", value: round(totalViews * 0.05), previous: round(totalViews * 0.05) },
      { code: "DZ", value: round(totalViews * 0.04), previous: round(totalViews * 0.04) },
      { code: "JO", value: round(totalViews * 0.03), previous: round(totalViews * 0.03) },
    ],
  };
}

/* ---------- APM ---------- */

const ROUTES: [EndpointRow["method"], string, number, number, number][] = [
  ["GET", "/v1/projects", 42_800, 92, 0.002],
  ["GET", "/v1/projects/:id/issues", 38_100, 148, 0.004],
  ["POST", "/v1/issues", 9_600, 310, 0.011],
  ["POST", "/v1/reports/export", 1_240, 2_450, 0.032],
  ["GET", "/v1/search", 27_500, 420, 0.006],
  ["PATCH", "/v1/issues/:id", 7_900, 205, 0.009],
  ["GET", "/v1/analytics/overview", 5_300, 1_380, 0.018],
  ["POST", "/v1/auth/token", 18_600, 64, 0.003],
  ["DELETE", "/v1/issues/:id", 1_100, 120, 0.004],
  ["GET", "/v1/invoices/:id/pdf", 2_050, 1_820, 0.024],
];

function span(id: string, name: string, service: string, startMs: number, durationMs: number, parentId?: string, error = false): TraceSpan {
  return { id, name, service, startMs, durationMs, parentId, error };
}

function makeTraces(): TraceSummary[] {
  const t0 = Date.parse("2026-09-29T09:38:00Z");
  return [
    {
      id: "t1",
      method: "POST",
      name: "/v1/reports/export",
      status: 200,
      durationMs: 2480,
      startedAt: t0 - 40_000,
      service: "api",
      spans: [
        span("a", "POST /v1/reports/export", "api", 0, 2480),
        span("b", "auth.verify", "api", 4, 38, "a"),
        span("c", "SELECT issues WHERE project_id", "postgres", 50, 640, "a"),
        span("d", "render report", "worker", 700, 1500, "a"),
        span("e", "s3.putObject", "storage", 2210, 250, "a"),
      ],
    },
    {
      id: "t2",
      method: "GET",
      name: "/v1/analytics/overview",
      status: 500,
      durationMs: 1420,
      startedAt: t0 - 95_000,
      service: "api",
      spans: [
        span("a", "GET /v1/analytics/overview", "api", 0, 1420, undefined, true),
        span("b", "cache.get overview", "redis", 3, 12, "a"),
        span("c", "SELECT events GROUP BY day", "postgres", 20, 1310, "a", true),
      ],
    },
    { id: "t3", method: "GET", name: "/v1/projects", status: 200, durationMs: 88, startedAt: t0 - 130_000, service: "api" },
    { id: "t4", method: "GET", name: "/v1/search", status: 200, durationMs: 431, startedAt: t0 - 170_000, service: "api" },
    { id: "t5", method: "POST", name: "/v1/issues", status: 201, durationMs: 296, startedAt: t0 - 210_000, service: "api" },
    { id: "t6", method: "GET", name: "/v1/invoices/:id/pdf", status: 200, durationMs: 1880, startedAt: t0 - 260_000, service: "api" },
    { id: "t7", method: "PATCH", name: "/v1/issues/:id", status: 404, durationMs: 41, startedAt: t0 - 300_000, service: "api" },
    { id: "t8", method: "POST", name: "/v1/auth/token", status: 200, durationMs: 63, startedAt: t0 - 350_000, service: "api" },
  ];
}

export function apmReport(hours: number): ApmData {
  const buckets = hours === 1 ? 12 : 24;
  const stepMin = (hours * 60) / buckets;
  const times = Array.from({ length: buckets }, (_, i) => {
    const t = new Date(Date.UTC(2026, 8, 29, 9, 40) - (buckets - 1 - i) * stepMin * 60_000);
    return t.toISOString().slice(0, 16);
  });
  const p50 = wave(buckets, 118, { seed: 61, weekly: 0, noise: 0.1 });
  const spike = Math.floor(buckets * 0.7);
  const latency: LatencyPoint[] = times.map((time, i) => {
    const bump = i >= spike && i <= spike + 1 ? 2.4 : 1;
    return { time, p50: round(p50[i]! * (bump > 1 ? 1.4 : 1)), p95: round(p50[i]! * 4 * bump), p99: round(p50[i]! * 9.5 * bump) };
  });
  const req = wave(buckets, Math.round(2600 * stepMin * 0.4), { seed: 62, weekly: 0, noise: 0.12 });
  const errors: ErrorRatePoint[] = times.map((time, i) => {
    const bad = i >= spike && i <= spike + 1;
    return { time, requests: round(req[i]!), errors: round(req[i]! * (bad ? 0.034 : 0.009 + (i % 4) * 0.001)) };
  });
  const rpm = req.map((r) => r / stepMin);
  const totalReq = sum(req);
  const totalErr = sum(errors.map((e) => e.errors));
  return {
    summary: {
      requests: { value: round(totalReq), previous: round(totalReq * 0.93), trend: spark(req) },
      throughput: { value: round(mean(rpm)), previous: round(mean(rpm) * 0.94), trend: spark(rpm) },
      p95: { value: round(mean(latency.map((l) => l.p95))), previous: round(mean(latency.map((l) => l.p95)) * 0.9), trend: spark(latency.map((l) => l.p95)) },
      errorRate: { value: totalErr / totalReq, previous: (totalErr / totalReq) * 0.8, trend: spark(errors.map((e) => e.errors / e.requests)) },
    },
    latency,
    latencySummary: { p50: 121, p95: 486, p99: 1140 },
    previousLatencySummary: { p50: 117, p95: 431, p99: 980 },
    errors,
    previousErrorRate: (totalErr / totalReq) * 0.8,
    topErrors: [
      { id: "e1", message: "TimeoutError: query exceeded 1200ms", count: 214, endpoint: "GET /v1/analytics/overview", lastSeenAt: Date.parse("2026-09-29T09:31:00Z") },
      { id: "e2", message: "PayloadTooLargeError: export exceeds 25 MB", count: 61, endpoint: "POST /v1/reports/export", lastSeenAt: Date.parse("2026-09-29T09:12:00Z") },
      { id: "e3", message: "ECONNRESET reading from redis", count: 27, endpoint: "GET /v1/search", lastSeenAt: Date.parse("2026-09-29T08:57:00Z") },
      { id: "e4", message: "ValidationError: title must not be empty", count: 19, endpoint: "POST /v1/issues", lastSeenAt: Date.parse("2026-09-29T09:36:00Z") },
    ],
    throughput: times.map((date, i) => ({ date, rpm: round(rpm[i]!) })),
    previousThroughput: times.map((date, i) => ({ date, rpm: round(rpm[i]! * (0.86 + ((i * 5) % 7) / 25)) })),
    endpoints: ROUTES.map(([method, route, requests, p95, errorRate], i) => ({
      id: `ep${i}`,
      method,
      route,
      requests: round(requests * (hours / 24)),
      throughput: Math.round((requests / 1440) * 10) / 10,
      p50: round(p95 / 3.6),
      p95,
      errorRate,
    })),
    traces: makeTraces(),
  };
}

/* ---------- Web vitals ---------- */

const VITALS_MOBILE = {
  LCP: [2900, 3100, [0.58, 0.28, 0.14]],
  INP: [182, 210, [0.77, 0.16, 0.07]],
  CLS: [0.08, 0.11, [0.82, 0.11, 0.07]],
  FCP: [2050, 2200, [0.44, 0.38, 0.18]],
  TTFB: [710, 690, [0.71, 0.21, 0.08]],
} as const;
const VITALS_DESKTOP = {
  LCP: [1900, 2100, [0.81, 0.13, 0.06]],
  INP: [96, 104, [0.92, 0.06, 0.02]],
  CLS: [0.04, 0.05, [0.93, 0.05, 0.02]],
  FCP: [1100, 1250, [0.79, 0.16, 0.05]],
  TTFB: [420, 440, [0.9, 0.08, 0.02]],
} as const;

export function vitalsReport(period: number, device: WebVitalsDevice): WebVitalsData {
  const src = device === "mobile" ? VITALS_MOBILE : VITALS_DESKTOP;
  const dates = dayRange(period);
  const ids = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
  const vitals: WebVitalsData["vitals"] = {};
  for (const id of ids) {
    const [p75, previous, [good, needsImprovement, poor]] = src[id];
    vitals[id] = { p75, previous, distribution: { good, needsImprovement, poor } };
  }
  const cols = ids.map((id, k) => wave(period, src[id][0], { seed: 71 + k, weekly: 0.02, noise: id === "CLS" ? 0.18 : 0.07, trend: -0.04 }));
  const series: TimeSeriesPoint[] = dates.map((date, i) => {
    const row: TimeSeriesPoint = { date };
    ids.forEach((id, k) => {
      const v = cols[k]![i]!;
      row[id] = id === "CLS" ? Math.round(v * 1000) / 1000 : round(v);
    });
    return row;
  });
  const k = device === "mobile" ? 1 : 0.68;
  const pages = [
    ["/", 128_000, 2100, 140, 0.03],
    ["/blog/rtl-design-systems", 96_400, 3400, 190, 0.06],
    ["/docs/components/data-table", 61_200, 2700, 310, 0.09],
    ["/pricing", 44_800, 1800, 120, 0.02],
    ["/blog/arabic-numerals", 38_900, 4300, 160, 0.14],
    ["/docs/getting-started", 31_500, 2200, 95, 0.05],
    ["/docs/components/chart", 22_700, 3900, 540, 0.11],
    ["/changelog", 14_300, 2600, 180, 0.28],
  ] as const;
  return {
    vitals,
    series,
    pages: pages.map(([url, loads, lcp, inp, cls], i) => ({ id: `p${i}`, url, loads, vitals: { LCP: round(lcp * k), INP: round(inp * (0.6 + 0.4 * k)), CLS: Math.round(cls * k * 1000) / 1000 } })),
  };
}

/* ---------- small display helpers ---------- */

/** A flag and the country name for a code, in the story's language. */
export function flagEmojiLabel(code: string, ar: boolean): string {
  const flag = String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
  const name = new Intl.DisplayNames(ar ? "ar" : "en", { type: "region" }).of(code.toUpperCase()) ?? code;
  return `${flag} ${name}`;
}
