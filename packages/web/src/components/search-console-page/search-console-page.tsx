"use client";

import { useState } from "react";
import { Eye, MousePointerClick, Percent, TrendingUp } from "lucide-react";
import { AnalyticsPageFrame, type AnalyticsPageBaseProps, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { type BreakdownRow, BreakdownTable } from "../breakdown-table";
import { GeoList, type GeoRow } from "../geo-list";
import { MetricTiles, type MetricTileData } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { SearchPerformanceTable, type SearchPerformanceRow } from "../search-performance-table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { PeriodToggle, type TimeSeriesMetric, type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";

const STRINGS = {
  en: {
    title: "Search Console",
    description: (site: string) => `How ${site} performs in Google Search`,
    clicks: "Total clicks",
    impressions: "Total impressions",
    ctr: "Average CTR",
    position: "Average position",
    chartTitle: "Performance",
    chartDescription: "Select a tile to chart it. Average position improves as it gets lower.",
    tabQueries: "Queries",
    tabPages: "Pages",
    tabCountries: "Countries",
    tabDevices: "Devices",
    countries: "Countries",
    devices: "Devices",
    device: "Device",
    clicksShort: "Clicks",
    benefits: ["Clicks, impressions, CTR and average position", "The queries and pages that bring searchers", "Countries and devices"],
  },
  ar: {
    title: "Search Console",
    description: (site: string) => `أداء ${site} في بحث Google`,
    clicks: "إجمالي النقرات",
    impressions: "إجمالي مرات الظهور",
    ctr: "متوسط نسبة النقر",
    position: "متوسط الترتيب",
    chartTitle: "الأداء",
    chartDescription: "اختر بطاقة لعرضها في الرسم. يتحسن متوسط الترتيب كلما قلّ الرقم.",
    tabQueries: "عبارات البحث",
    tabPages: "الصفحات",
    tabCountries: "الدول",
    tabDevices: "الأجهزة",
    countries: "الدول",
    devices: "الأجهزة",
    device: "الجهاز",
    clicksShort: "النقرات",
    benefits: ["النقرات ومرات الظهور ونسبة النقر ومتوسط الترتيب", "عبارات البحث والصفحات التي تجلب الزوار", "الدول والأجهزة"],
  },
};

export type SearchConsolePageLabels = typeof STRINGS.en;

export interface SearchConsoleTotal {
  value: number;
  previous?: number;
  trend?: readonly number[];
}

export interface SearchConsoleData {
  summary: {
    clicks: SearchConsoleTotal;
    impressions: SearchConsoleTotal;
    /** A fraction, 0.034 for 3.4%. */
    ctr: SearchConsoleTotal;
    /** Average position. Lower is better. */
    position: SearchConsoleTotal;
  };
  /** One row per day with `clicks`, `impressions`, `ctr` and `position`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  queries: readonly SearchPerformanceRow[];
  pages: readonly SearchPerformanceRow[];
  /** Clicks per country. */
  countries: readonly GeoRow[];
  /** Clicks per device. */
  devices: readonly BreakdownRow[];
}

export interface SearchConsolePageProps extends AnalyticsPageBaseProps {
  data?: SearchConsoleData;
  /** The verified site, for the subtitle. */
  site?: string;
  /** Called when a query or page row is chosen, for example to open a detail view. */
  onRowClick?: (row: SearchPerformanceRow, kind: "query" | "page") => void;
  labels?: Partial<SearchConsolePageLabels>;
  frameLabels?: Partial<AnalyticsPageFrameLabels>;
}

const pct = { style: "percent", maximumFractionDigits: 1 } as const;
const one = { maximumFractionDigits: 1 } as const;

/**
 * The Search Console report: clicks, impressions, CTR and position tiles that also pick the chart's metric,
 * then tabs of queries, pages, countries and devices. Shows the connect screen until `service` is connected.
 */
export function SearchConsolePage({ service, data, site, period, onPeriodChange, loading, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, onRowClick, className, labels, frameLabels }: SearchConsolePageProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [metric, setMetric] = useState("clicks");
  const [tab, setTab] = useState("queries");
  const busy = loading || !data;
  const s = data?.summary;

  const tile = (id: string, label: string, total: SearchConsoleTotal | undefined, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total?.value ?? 0, previous: total?.previous, sparkline: total?.trend, ...extra });
  const tiles: MetricTileData[] = s
    ? [
        tile("clicks", t.clicks, s.clicks, { icon: <MousePointerClick aria-hidden /> }),
        tile("impressions", t.impressions, s.impressions, { icon: <Eye aria-hidden /> }),
        tile("ctr", t.ctr, s.ctr, { format: pct, icon: <Percent aria-hidden /> }),
        tile("position", t.position, s.position, { format: one, invert: true, icon: <TrendingUp aria-hidden /> }),
      ]
    : [];

  const metrics: TimeSeriesMetric[] = [
    { id: "clicks", label: t.clicks, color: "var(--primary)" },
    { id: "impressions", label: t.impressions, color: "var(--nq-tag-purple)" },
    { id: "ctr", label: t.ctr, format: pct, aggregate: "avg", color: "var(--nq-tag-teal)" },
    { id: "position", label: t.position, format: one, aggregate: "avg", lowerIsBetter: true, color: "var(--nq-tag-orange)" },
  ];

  return (
    <AnalyticsPageFrame
      title={t.title}
      description={site ? t.description(site) : undefined}
      service={service}
      benefits={t.benefits}
      actions={<PeriodToggle options={[7, 28, 90]} value={period} onValueChange={onPeriodChange} />}
      error={error}
      onRetry={onRetry}
      onRefresh={onRefresh}
      refreshing={refreshing}
      updatedAt={updatedAt}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSelectAccount={onSelectAccount}
      className={className}
      labels={frameLabels}
    >
      <MetricTiles metrics={tiles} selected={metric} onSelect={setMetric} loading={busy} />
      <TimeSeriesPanel
        title={t.chartTitle}
        description={t.chartDescription}
        metrics={metrics}
        data={data?.series ?? []}
        previousData={data?.previousSeries}
        metric={metric}
        onMetricChange={setMetric}
        loading={busy}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="queries">{t.tabQueries}</TabsTab>
          <TabsTab value="pages">{t.tabPages}</TabsTab>
          <TabsTab value="countries">{t.tabCountries}</TabsTab>
          <TabsTab value="devices">{t.tabDevices}</TabsTab>
        </TabsList>
        <TabsPanel value="queries">
          <SearchPerformanceTable kind="query" rows={data?.queries ?? []} loading={busy} onRowClick={onRowClick ? (r) => onRowClick(r, "query") : undefined} />
        </TabsPanel>
        <TabsPanel value="pages">
          <SearchPerformanceTable kind="page" rows={data?.pages ?? []} loading={busy} onRowClick={onRowClick ? (r) => onRowClick(r, "page") : undefined} />
        </TabsPanel>
        <TabsPanel value="countries">
          <GeoList title={t.countries} valueLabel={t.clicksShort} rows={data?.countries ?? []} limit={10} loading={busy} />
        </TabsPanel>
        <TabsPanel value="devices">
          <BreakdownTable title={t.devices} dimensionLabel={t.device} valueLabel={t.clicksShort} rows={data?.devices ?? []} loading={busy} />
        </TabsPanel>
      </Tabs>
    </AnalyticsPageFrame>
  );
}
