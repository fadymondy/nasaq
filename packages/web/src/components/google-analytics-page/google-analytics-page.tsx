"use client";

import { useState } from "react";
import { Activity, Clock, MousePointerClick, Target, Users } from "lucide-react";
import { cn } from "../../lib/cn";
import { AnalyticsPageFrame, type AnalyticsPageBaseProps, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { type BreakdownRow, BreakdownTable } from "../breakdown-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { GeoList, type GeoRow } from "../geo-list";
import { Heatmap, type HeatmapDatum } from "../heatmap";
import { MetricTiles, type MetricTileData, formatSeconds, countryName, flagEmoji } from "../metric-tiles";
import { useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { RealtimeCounter } from "../realtime-counter";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { PeriodToggle, type TimeSeriesMetric, type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";

const STRINGS = {
  en: {
    title: "Google Analytics",
    description: (property: string) => `Traffic and engagement for ${property}`,
    users: "Users",
    sessions: "Sessions",
    engagementRate: "Engagement rate",
    engagementTime: "Avg. engagement time",
    conversions: "Key events",
    trafficTitle: "Traffic",
    trafficDescription: "Daily totals for the selected period",
    tabSources: "Sources",
    tabPages: "Pages",
    tabAudience: "Audience",
    channels: "Default channel group",
    sourceMedium: "Source / medium",
    pages: "Top pages",
    page: "Page",
    channel: "Channel",
    source: "Source / medium",
    devices: "Devices",
    device: "Device",
    countries: "Countries",
    activity: "Sessions by day",
    activityDescription: "Darker days had more sessions",
    realtimeTitle: "Right now",
    realtimeDescription: "Active users in the last 30 minutes",
    realtimePages: "Top active pages",
    realtimeCountries: "Top countries",
    benefits: ["Users, sessions and key events against the previous period", "Traffic sources and top pages", "Countries and devices", "Live active users"],
    sessionsCount: "sessions",
    usersCount: "users",
  },
  ar: {
    title: "Google Analytics",
    description: (property: string) => `الزيارات والتفاعل لـ ${property}`,
    users: "المستخدمون",
    sessions: "الجلسات",
    engagementRate: "معدل التفاعل",
    engagementTime: "متوسط وقت التفاعل",
    conversions: "الأحداث الرئيسية",
    trafficTitle: "الزيارات",
    trafficDescription: "الإجماليات اليومية للفترة المحددة",
    tabSources: "المصادر",
    tabPages: "الصفحات",
    tabAudience: "الجمهور",
    channels: "مجموعة القنوات الافتراضية",
    sourceMedium: "المصدر / الوسيط",
    pages: "أكثر الصفحات زيارة",
    page: "الصفحة",
    channel: "القناة",
    source: "المصدر / الوسيط",
    devices: "الأجهزة",
    device: "الجهاز",
    countries: "الدول",
    activity: "الجلسات حسب اليوم",
    activityDescription: "الأيام الأغمق كانت أكثر جلسات",
    realtimeTitle: "الآن",
    realtimeDescription: "المستخدمون النشطون في آخر 30 دقيقة",
    realtimePages: "أكثر الصفحات نشاطًا",
    realtimeCountries: "أكثر الدول",
    benefits: ["المستخدمون والجلسات والأحداث الرئيسية مقارنة بالفترة السابقة", "مصادر الزيارات وأكثر الصفحات", "الدول والأجهزة", "المستخدمون النشطون الآن"],
    sessionsCount: "جلسة",
    usersCount: "مستخدم",
  },
};

export type GoogleAnalyticsPageLabels = typeof STRINGS.en;

export interface AnalyticsTotal {
  value: number;
  /** The same total for the comparison period. */
  previous?: number;
  /** Daily values for the sparkline. */
  trend?: readonly number[];
}

export interface GoogleAnalyticsData {
  summary: {
    users: AnalyticsTotal;
    sessions: AnalyticsTotal;
    /** A fraction, 0.61 for 61%. */
    engagementRate: AnalyticsTotal;
    /** Seconds. */
    engagementSeconds: AnalyticsTotal;
    conversions: AnalyticsTotal;
  };
  /** One row per day with `users`, `sessions` and `conversions`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  realtime?: {
    active: number;
    perMinute?: readonly number[];
    pages: readonly { id: string; label: string; value: number }[];
    countries: readonly { code: string; value: number }[];
    updatedAt?: number | Date | string;
  };
  channels: readonly BreakdownRow[];
  sourceMedium: readonly BreakdownRow[];
  pages: readonly BreakdownRow[];
  countries: readonly GeoRow[];
  devices: readonly BreakdownRow[];
  /** Sessions per day for the activity calendar. */
  daily?: readonly HeatmapDatum[];
}

export interface GoogleAnalyticsPageProps extends AnalyticsPageBaseProps {
  data?: GoogleAnalyticsData;
  /** The property or site shown, for the subtitle. */
  property?: string;
  /** First and last day of the period, for the activity calendar. */
  range?: { from: string; to: string };
  labels?: Partial<GoogleAnalyticsPageLabels>;
  frameLabels?: Partial<AnalyticsPageFrameLabels>;
}

/**
 * The Google Analytics report: KPI tiles with comparison, a traffic chart, a live counter, and tabs for sources,
 * pages and audience. Shows the connect screen until `service` is connected.
 */
export function GoogleAnalyticsPage({ service, data, property, range, period, onPeriodChange, loading, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, className, labels, frameLabels }: GoogleAnalyticsPageProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const [tab, setTab] = useState("sources");
  const busy = loading || !data;

  const s = data?.summary;
  const tile = (id: string, label: string, total: AnalyticsTotal | undefined, extra: Partial<MetricTileData>): MetricTileData => ({
    id,
    label,
    value: total?.value ?? 0,
    previous: total?.previous,
    sparkline: total?.trend,
    ...extra,
  });
  const tiles: MetricTileData[] = s
    ? [
        tile("users", t.users, s.users, { icon: <Users aria-hidden /> }),
        tile("sessions", t.sessions, s.sessions, { icon: <Activity aria-hidden /> }),
        tile("engagementRate", t.engagementRate, s.engagementRate, { format: { style: "percent", maximumFractionDigits: 1 }, icon: <MousePointerClick aria-hidden /> }),
        tile("engagementSeconds", t.engagementTime, s.engagementSeconds, { display: formatSeconds(s.engagementSeconds.value, ar), previousDisplay: s.engagementSeconds.previous === undefined ? undefined : formatSeconds(s.engagementSeconds.previous, ar), icon: <Clock aria-hidden /> }),
        tile("conversions", t.conversions, s.conversions, { icon: <Target aria-hidden /> }),
      ]
    : [];

  const metrics: TimeSeriesMetric[] = [
    { id: "users", label: t.users, color: "var(--primary)" },
    { id: "sessions", label: t.sessions, color: "var(--nq-tag-teal)" },
    { id: "conversions", label: t.conversions, color: "var(--nq-tag-orange)" },
  ];

  const rt = data?.realtime;
  const locale = ar ? "ar" : "en";
  const account = property ?? service.accounts?.find((a) => a.id === service.accountId)?.name ?? service.accounts?.[0]?.name;

  return (
    <AnalyticsPageFrame
      title={t.title}
      description={account ? t.description(account) : undefined}
      service={service}
      benefits={t.benefits}
      actions={<PeriodToggle value={period} onValueChange={onPeriodChange} />}
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
      <MetricTiles metrics={tiles} loading={busy} skeletons={5} />
      <div className={cn("grid gap-4", rt ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : undefined)}>
        <TimeSeriesPanel
          title={t.trafficTitle}
          description={t.trafficDescription}
          metrics={metrics}
          data={data?.series ?? []}
          previousData={data?.previousSeries}
          defaultMetric="users"
          loading={busy}
        />
        {rt ? (
          <RealtimeCounter
            title={t.realtimeTitle}
            description={t.realtimeDescription}
            value={rt.active}
            perMinute={rt.perMinute}
            updatedAt={rt.updatedAt}
            sections={[
              { id: "pages", title: t.realtimePages, ltr: true, rows: rt.pages },
              {
                id: "countries",
                title: t.realtimeCountries,
                rows: rt.countries.map((c) => ({ id: c.code, label: `${flagEmoji(c.code)} ${countryName(c.code, locale)}`, value: c.value })),
              },
            ]}
          />
        ) : null}
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="sources">{t.tabSources}</TabsTab>
          <TabsTab value="pages">{t.tabPages}</TabsTab>
          <TabsTab value="audience">{t.tabAudience}</TabsTab>
        </TabsList>
        <TabsPanel value="sources" className="grid gap-4 lg:grid-cols-2">
          <BreakdownTable title={t.channels} dimensionLabel={t.channel} valueLabel={t.sessions} rows={data?.channels ?? []} loading={busy} />
          <BreakdownTable title={t.sourceMedium} dimensionLabel={t.source} valueLabel={t.sessions} rows={data?.sourceMedium ?? []} ltrLabels loading={busy} />
        </TabsPanel>
        <TabsPanel value="pages">
          <BreakdownTable title={t.pages} dimensionLabel={t.page} valueLabel={t.sessions} rows={data?.pages ?? []} ltrLabels limit={10} loading={busy} />
        </TabsPanel>
        <TabsPanel value="audience" className="grid gap-4 lg:grid-cols-2">
          <GeoList title={t.countries} valueLabel={t.users} rows={data?.countries ?? []} loading={busy} />
          <div className="flex flex-col gap-4">
            <BreakdownTable title={t.devices} dimensionLabel={t.device} valueLabel={t.users} rows={data?.devices ?? []} loading={busy} />
            {data?.daily && range ? (
              <Card>
                <CardHeader>
                  <CardTitle as="h3">{t.activity}</CardTitle>
                  <CardDescription>{t.activityDescription}</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Heatmap data={data.daily} from={range.from} to={range.to} color="var(--nq-tag-teal)" cellSize={14} label={t.activity} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsPanel>
      </Tabs>
    </AnalyticsPageFrame>
  );
}
