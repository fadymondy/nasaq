"use client";

import { useMemo, useState } from "react";
import { Clock, Eye, Timer, UserPlus } from "lucide-react";
import { AnalyticsPageFrame, type AnalyticsPageBaseProps, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { BreakdownTable, type BreakdownRow } from "../breakdown-table";
import { GeoList, type GeoRow } from "../geo-list";
import { MetricTiles, type MetricTileData, formatSeconds } from "../metric-tiles";
import { useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Num, formatNumber } from "../numeric";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { PeriodToggle, type TimeSeriesMetric, type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";

const STRINGS = {
  en: {
    title: "YouTube",
    description: (channel: string, subscribers?: string) => (subscribers ? `${channel} · ${subscribers} subscribers` : channel),
    views: "Views",
    watchTime: "Watch time (hours)",
    subscribers: "Net subscribers",
    avgDuration: "Avg. view duration",
    chartTitle: "Channel performance",
    chartDescription: "Select a tile to chart it",
    tabVideos: "Top videos",
    tabTraffic: "Traffic sources",
    tabAudience: "Audience",
    video: "Video",
    watch: "Watch time",
    avgView: "Avg. duration",
    trafficSources: "How viewers found you",
    source: "Source",
    countries: "Countries",
    benefits: ["Views, watch time and subscribers against the previous period", "Your best videos", "Where viewers come from"],
    hours: "h",
  },
  ar: {
    title: "YouTube",
    description: (channel: string, subscribers?: string) => (subscribers ? `${channel} · ${subscribers} مشترك` : channel),
    views: "المشاهدات",
    watchTime: "وقت المشاهدة (ساعات)",
    subscribers: "صافي المشتركين",
    avgDuration: "متوسط مدة المشاهدة",
    chartTitle: "أداء القناة",
    chartDescription: "اختر بطاقة لعرضها في الرسم",
    tabVideos: "أفضل الفيديوهات",
    tabTraffic: "مصادر الزيارات",
    tabAudience: "الجمهور",
    video: "الفيديو",
    watch: "وقت المشاهدة",
    avgView: "متوسط المدة",
    trafficSources: "كيف وصل المشاهدون إليك",
    source: "المصدر",
    countries: "الدول",
    benefits: ["المشاهدات ووقت المشاهدة والمشتركون مقارنة بالفترة السابقة", "أفضل فيديوهاتك", "من أين يأتي المشاهدون"],
    hours: "س",
  },
};

export type YouTubeChannelPageLabels = typeof STRINGS.en;

export interface YouTubeTotal {
  value: number;
  previous?: number;
  trend?: readonly number[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  /** Views in the period. */
  views: number;
  previousViews?: number;
  /** Watch time in hours. */
  watchHours: number;
  /** Average view duration in seconds. */
  avgSeconds: number;
  href?: string;
}

export interface YouTubeChannelData {
  channel?: { name: string; handle?: string; subscribers?: number };
  summary: {
    views: YouTubeTotal;
    /** Hours. */
    watchHours: YouTubeTotal;
    /** Subscribers gained minus lost. */
    subscribers: YouTubeTotal;
    /** Seconds. */
    avgSeconds: YouTubeTotal;
  };
  /** One row per day with `views`, `watchHours` and `subscribers`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  videos: readonly YouTubeVideo[];
  trafficSources: readonly BreakdownRow[];
  countries: readonly GeoRow[];
}

export interface YouTubeChannelPageProps extends AnalyticsPageBaseProps {
  data?: YouTubeChannelData;
  labels?: Partial<YouTubeChannelPageLabels>;
  frameLabels?: Partial<AnalyticsPageFrameLabels>;
}

const compact = { notation: "compact", maximumFractionDigits: 1 } as const;

/**
 * The YouTube channel report: views, watch time and subscribers with comparison, a chart the tiles drive, the best
 * videos, traffic sources and countries. Shows the connect screen until `service` is connected.
 */
export function YouTubeChannelPage({ service, data, period, onPeriodChange, loading, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, className, labels, frameLabels }: YouTubeChannelPageProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const [metric, setMetric] = useState("views");
  const [tab, setTab] = useState("videos");
  const busy = loading || !data;
  const s = data?.summary;

  const tile = (id: string, label: string, total: YouTubeTotal | undefined, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total?.value ?? 0, previous: total?.previous, sparkline: total?.trend, ...extra });
  const tiles: MetricTileData[] = s
    ? [
        tile("views", t.views, s.views, { icon: <Eye aria-hidden /> }),
        tile("watchHours", t.watchTime, s.watchHours, { icon: <Clock aria-hidden /> }),
        tile("subscribers", t.subscribers, s.subscribers, { icon: <UserPlus aria-hidden /> }),
        tile("avgSeconds", t.avgDuration, s.avgSeconds, { display: formatSeconds(s.avgSeconds.value, ar), previousDisplay: s.avgSeconds.previous === undefined ? undefined : formatSeconds(s.avgSeconds.previous, ar), icon: <Timer aria-hidden /> }),
      ]
    : [];

  const metrics: TimeSeriesMetric[] = [
    { id: "views", label: t.views, color: "var(--primary)" },
    { id: "watchHours", label: t.watchTime, color: "var(--nq-tag-purple)" },
    { id: "subscribers", label: t.subscribers, color: "var(--nq-tag-teal)" },
  ];

  const videoRows = useMemo<BreakdownRow[]>(() => (data?.videos ?? []).map((v) => ({ id: v.id, label: v.title, value: v.views, previous: v.previousViews, href: v.href })), [data?.videos]);
  const byId = useMemo(() => new Map((data?.videos ?? []).map((v) => [v.id, v])), [data?.videos]);
  const locale = ar ? "ar" : "en";
  const subs = data?.channel?.subscribers;

  return (
    <AnalyticsPageFrame
      title={t.title}
      description={data?.channel ? t.description(data.channel.name, subs === undefined ? undefined : formatNumber(subs, locale, compact)) : undefined}
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
      <TimeSeriesPanel title={t.chartTitle} description={t.chartDescription} metrics={metrics} data={data?.series ?? []} previousData={data?.previousSeries} metric={metric} onMetricChange={setMetric} loading={busy} />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="videos">{t.tabVideos}</TabsTab>
          <TabsTab value="traffic">{t.tabTraffic}</TabsTab>
          <TabsTab value="audience">{t.tabAudience}</TabsTab>
        </TabsList>
        <TabsPanel value="videos">
          <BreakdownTable
            title={t.tabVideos}
            dimensionLabel={t.video}
            valueLabel={t.views}
            rows={videoRows}
            limit={10}
            showShare={false}
            loading={busy}
            columns={[
              { id: "watch", header: t.watch, align: "end", cell: (r) => <Num value={byId.get(r.id)?.watchHours ?? 0} format={{ maximumFractionDigits: 0 }} /> },
              { id: "avg", header: t.avgView, align: "end", cell: (r) => <bdi dir="ltr">{formatSeconds(byId.get(r.id)?.avgSeconds ?? 0, ar)}</bdi> },
            ]}
          />
        </TabsPanel>
        <TabsPanel value="traffic">
          <BreakdownTable title={t.trafficSources} dimensionLabel={t.source} valueLabel={t.views} rows={data?.trafficSources ?? []} loading={busy} />
        </TabsPanel>
        <TabsPanel value="audience">
          <GeoList title={t.countries} valueLabel={t.views} rows={data?.countries ?? []} limit={10} loading={busy} />
        </TabsPanel>
      </Tabs>
    </AnalyticsPageFrame>
  );
}
