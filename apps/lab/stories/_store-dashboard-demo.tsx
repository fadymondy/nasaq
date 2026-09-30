/*
 * Demo data and the page shell for the store admin dashboard stories.
 * Everything is generated from a seeded generator, so a chart never changes between renders or reloads.
 * Money is integer minor units (EGP piasters). Names and figures are invented.
 */
import {
  type CommerceOrder,
  type CommerceProduct,
  ReportFilterBar,
  type ReportFilterField,
  StoreDashboard,
  type StoreBreakdownRow,
  type StoreDashboardProps,
  type StoreLowStockItem,
  type StorePeriodTotals,
  type StoreSalesPoint,
  type StoreTopProduct,
  type TimeComparison,
  type TimeRangeValue,
  resolveTimeRange,
  useNasaq,
  useReportFilters,
} from "@nasaq/web";
import { useEffect, useMemo, useState } from "react";
import { STORE_CURRENCY, type StoreLocale, storeOrders, storeProducts } from "./_store-demo";

const ARABIC = (locale: string) => locale.startsWith("ar");

/** "Now" for the demo: the same instant in every story. */
export const STORE_DASHBOARD_NOW = new Date("2026-09-30T09:30:00Z");
export const STORE_DASHBOARD_ZONE = "Africa/Cairo";

/** mulberry32: a tiny seeded generator, so the same seed always gives the same series. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isoHour = (ms: number) => new Date(ms).toISOString().slice(0, 13) + ":00";

export interface ChannelShare {
  id: string;
  en: string;
  ar: string;
  /** Share of sales, in percent. */
  share: number;
  /** How it moved against the previous period. */
  drift: number;
}

export const CHANNELS: readonly ChannelShare[] = [
  { id: "search", en: "Search", ar: "محركات البحث", share: 31, drift: 1.12 },
  { id: "social", en: "Social media", ar: "وسائل التواصل", share: 23, drift: 1.24 },
  { id: "direct", en: "Direct", ar: "زيارة مباشرة", share: 18, drift: 0.97 },
  { id: "email", en: "Email", ar: "البريد الإلكتروني", share: 11, drift: 1.05 },
  { id: "marketplace", en: "Marketplace", ar: "الأسواق الإلكترونية", share: 10, drift: 0.88 },
  { id: "whatsapp", en: "WhatsApp", ar: "واتساب", share: 7, drift: 1.4 },
];

const CITIES: readonly { id: string; en: string; ar: string; share: number; drift: number }[] = [
  { id: "cairo", en: "Cairo", ar: "القاهرة", share: 33, drift: 1.09 },
  { id: "alexandria", en: "Alexandria", ar: "الإسكندرية", share: 15, drift: 1.03 },
  { id: "giza", en: "Giza", ar: "الجيزة", share: 13, drift: 1.15 },
  { id: "mansoura", en: "Mansoura", ar: "المنصورة", share: 7, drift: 0.94 },
  { id: "tanta", en: "Tanta", ar: "طنطا", share: 6, drift: 1.2 },
  { id: "hurghada", en: "Hurghada", ar: "الغردقة", share: 5, drift: 0.82 },
  { id: "luxor", en: "Luxor", ar: "الأقصر", share: 4, drift: 1.07 },
  { id: "other", en: "Other cities", ar: "مدن أخرى", share: 17, drift: 1.01 },
];

export interface StoreDashboardScenario {
  /** Days in the period. 1 gives 24 hourly points. */
  days: number;
  /** Channel ids to keep. Empty keeps them all. */
  channels?: readonly string[];
  /** Whether the previous period is wanted, and how far back it sits (in days). */
  compare?: "none" | "previous" | "year";
}

function periodSeries(days: number, endMs: number, seed: number, scale: number, growth: number): StoreSalesPoint[] {
  const rand = seeded(seed);
  const hourly = days <= 1;
  const count = hourly ? 24 : days;
  const out: StoreSalesPoint[] = [];
  for (let i = 0; i < count; i++) {
    const at = hourly ? endMs - (count - 1 - i) * 3_600_000 : endMs - (count - 1 - i) * DAY;
    const hour = new Date(at).getUTCHours();
    const weekday = new Date(at).getUTCDay();
    // Shoppers peak in the evening; Fridays and Saturdays are the busy days; a slow upward trend over the period.
    const shape = hourly ? 0.35 + 0.9 * Math.exp(-((((hour + 3) % 24) - 18) ** 2) / 24) : weekday === 5 || weekday === 6 ? 1.22 : weekday === 0 ? 0.9 : 1;
    const trend = 1 + (growth * i) / Math.max(1, count);
    const sessions = Math.round(1450 * scale * shape * trend * (hourly ? 1 / 24 : 1) * (0.9 + rand() * 0.2));
    const conversion = 0.026 + rand() * 0.008 + (weekday === 5 ? 0.003 : 0);
    const orders = Math.max(0, Math.round(sessions * conversion));
    const aov = Math.round(38_000 + rand() * 9_000);
    out.push({ date: hourly ? isoHour(at) : isoDay(at), sales: orders * aov, orders, sessions });
  }
  return out;
}

function sumTotals(series: readonly StoreSalesPoint[], seed: number, returningShare: number): StorePeriodTotals {
  const rand = seeded(seed);
  const sales = series.reduce((s, p) => s + p.sales, 0);
  const orders = series.reduce((s, p) => s + p.orders, 0);
  const sessions = series.reduce((s, p) => s + p.sessions, 0);
  const customers = Math.round(orders * (0.84 + rand() * 0.05));
  return {
    sales,
    orders,
    sessions,
    customers,
    returningCustomers: Math.round(customers * returningShare),
    addToCart: Math.round(sessions * (0.105 + rand() * 0.01)),
    checkouts: Math.round(sessions * (0.048 + rand() * 0.006)),
  };
}

export interface StoreDashboardDemoData {
  currency: string;
  totals: StorePeriodTotals;
  previousTotals?: StorePeriodTotals;
  series: StoreSalesPoint[];
  previousSeries?: StoreSalesPoint[];
  topProducts: StoreTopProduct[];
  categories: StoreBreakdownRow[];
  channels: StoreBreakdownRow[];
  cities: StoreBreakdownRow[];
  products: CommerceProduct[];
  recentOrders: CommerceOrder[];
}

/** The whole dashboard for one scenario: the same input always returns the same numbers. */
export function storeDashboardDemo(locale: StoreLocale, { days, channels = [], compare = "previous" }: StoreDashboardScenario): StoreDashboardDemoData {
  const ar = locale === "ar";
  const factor = channels.length ? CHANNELS.filter((c) => channels.includes(c.id)).reduce((s, c) => s + c.share, 0) / 100 : 1;
  const span = days <= 1 ? 3_600_000 * 24 : days * DAY;
  const end = days <= 1 ? Math.floor(STORE_DASHBOARD_NOW.getTime() / 3_600_000) * 3_600_000 : Math.floor(STORE_DASHBOARD_NOW.getTime() / DAY) * DAY;
  const back = compare === "year" ? 365 * DAY : span;
  const series = periodSeries(days, end, 11 + days, factor, 0.18);
  const previousSeries = compare === "none" ? undefined : periodSeries(days, end - back, compare === "year" ? 91 + days : 51 + days, factor * (compare === "year" ? 0.74 : 0.9), 0.08);
  const totals = sumTotals(series, 3, 0.39);
  const previousTotals = previousSeries ? sumTotals(previousSeries, 4, compare === "year" ? 0.31 : 0.36) : undefined;

  const split = (rows: readonly { id: string; en: string; ar: string; share: number; drift: number }[], seed: number): StoreBreakdownRow[] => {
    const rand = seeded(seed);
    return rows.map((r) => {
      const value = Math.round((totals.sales * r.share) / 100 * (0.97 + rand() * 0.06));
      return { id: r.id, label: ar ? r.ar : r.en, value, ...(previousTotals ? { previous: Math.round(value / (r.drift * (0.98 + rand() * 0.04))) } : {}) };
    });
  };
  const channelRows = split(channels.length ? CHANNELS.filter((c) => channels.includes(c.id)) : CHANNELS, 21).map((r) => ({ ...r, value: Math.round(r.value / (factor || 1)) }));

  const products = storeProducts(locale);
  const rand = seeded(31);
  const catalogueShare = [0.17, 0.16, 0.13, 0.11, 0.1, 0.09, 0.08, 0.06, 0.05, 0.03, 0.02];
  const topProducts: StoreTopProduct[] = products.slice(0, catalogueShare.length).map((p, i) => {
    const revenue = Math.round(totals.sales * catalogueShare[i]! * (0.95 + rand() * 0.1));
    const unit = p.variants[0]!.price;
    return {
      id: p.id,
      name: p.name,
      image: p.images[0]?.src,
      units: Math.max(1, Math.round(revenue / unit)),
      revenue,
      ...(previousTotals ? { previousRevenue: Math.round(revenue * (0.78 + rand() * 0.4)) } : {}),
    };
  });
  const byCategory = new Map<string, StoreBreakdownRow>();
  for (const [i, tp] of topProducts.entries()) {
    const category = products[i]!.category ?? (ar ? "أخرى" : "Other");
    const row = byCategory.get(category) ?? { id: category, label: category, value: 0, ...(previousTotals ? { previous: 0 } : {}) };
    row.value += tp.revenue;
    if (row.previous !== undefined) row.previous += tp.previousRevenue ?? 0;
    byCategory.set(category, row);
  }

  return {
    currency: STORE_CURRENCY,
    totals,
    previousTotals,
    series,
    previousSeries,
    topProducts,
    categories: [...byCategory.values()],
    channels: channelRows,
    cities: split(CITIES, 41),
    products,
    recentOrders: storeOrders(locale).slice(0, 8),
  };
}

/** A believable visitors-per-minute trace for `tick` (each tick is one minute); same tick, same numbers. */
export function liveVisitorsAt(tick: number, minutes = 30): { count: number; history: number[] } {
  const history = Array.from({ length: minutes }, (_, i) => {
    const t = tick - (minutes - 1 - i);
    return Math.round(72 + 14 * Math.sin(t / 5) + 8 * Math.sin(t / 2.3) + seeded(t + 7)() * 6);
  });
  return { count: history[history.length - 1]!, history };
}

/** Ticks once a few seconds, so the live tile moves. Frozen when `paused`. */
export function useLiveVisitors(paused = false, everyMs = 4000) {
  const [tick, setTick] = useState(240);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTick((n) => n + 1), everyMs);
    return () => clearInterval(id);
  }, [paused, everyMs]);
  return useMemo(() => liveVisitorsAt(tick), [tick]);
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const RANGE_DAYS = (range: TimeRangeValue) => {
  const { from, to } = resolveTimeRange(range, { now: STORE_DASHBOARD_NOW, timeZone: STORE_DASHBOARD_ZONE });
  return Math.min(90, Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY)));
};

const compareText = (ar: boolean, mode: TimeComparison, days: number) =>
  mode === "year" ? (ar ? "مقارنة بالعام الماضي" : "vs the same period last year") : ar ? `مقارنة بالفترة السابقة (${days} ${days <= 10 ? "أيام" : "يومًا"})` : `vs the previous ${days} days`;

export type StoreDashboardStoryMode = "live" | "loading" | "empty" | "error";

/** The page: title, ReportFilterBar (period, comparison, channel), and the StoreDashboard wired to the demo data. */
export function StoreDashboardPage({ mode = "live" }: { mode?: StoreDashboardStoryMode }) {
  const nq = useNasaq();
  const ar = ARABIC(nq.locale);
  const locale: StoreLocale = ar ? "ar" : "en";
  const fields: ReportFilterField[] = useMemo(
    () => [
      {
        id: "channel",
        kind: "multi",
        label: ar ? "القناة" : "Channel",
        options: CHANNELS.map((c) => ({ value: c.id, label: ar ? c.ar : c.en })),
      },
    ],
    [ar],
  );
  const filters = useReportFilters({ fields, defaultRange: { kind: "relative", preset: "30d" }, defaultComparison: "previous", syncLocation: false });
  const days = RANGE_DAYS(filters.state.range);
  const channels = filters.state.fields.channel ?? [];
  const compare = filters.state.comparison;

  const base = useMemo(() => storeDashboardDemo(locale, { days, channels, compare }), [locale, days, channels.join(","), compare]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const products = useMemo(
    () => base.products.map((p) => ({ ...p, variants: p.variants.map((v) => (stock[v.id] === undefined ? v : { ...v, stock: stock[v.id] })) })),
    [base.products, stock],
  );
  const live = useLiveVisitors(mode !== "live");
  const [notice, setNotice] = useState("");
  const [tries, setTries] = useState(0);

  const data: StoreDashboardProps = {
    ...base,
    products,
    liveVisitors: live,
    comparisonLabel: compare === "none" ? undefined : compareText(ar, compare, days),
    loading: mode === "loading",
    empty: mode === "empty",
    error: mode === "error" && tries === 0 ? true : undefined,
    onRetry: () => setTries((n) => n + 1),
    onOpenOrder: (o) => setNotice(ar ? `فُتح الطلب ${o.number}` : `Opened order ${o.number}`),
    onOpenProduct: (id) => setNotice(ar ? `فُتح المنتج ${base.products.find((p) => p.id === id)?.name ?? id}` : `Opened product ${base.products.find((p) => p.id === id)?.name ?? id}`),
    onRestock: async (item: StoreLowStockItem) => {
      await wait(400);
      setStock((s) => ({ ...s, [item.variantId]: 24 }));
      setNotice(ar ? `أُعيد توريد ${item.productName}` : `Restocked ${item.productName}`);
    },
    toolbar: (
      <ReportFilterBar
        fields={fields}
        state={filters.state}
        defaults={filters.defaults}
        onStateChange={filters.setState}
        comparison
        presets={["24h", "7d", "30d"]}
        range={{ timeZone: STORE_DASHBOARD_ZONE, now: STORE_DASHBOARD_NOW }}
      />
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "لوحة المتجر" : "Dashboard"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "نظرة سريعة على مبيعات متجرك وما يحتاج انتباهك اليوم." : "How the store is selling, and what needs your attention today."}</p>
      </header>
      <StoreDashboard {...data} />
      <p role="status" aria-live="polite" className="min-h-5 text-body-sm text-muted-foreground">
        {notice}
      </p>
    </main>
  );
}
