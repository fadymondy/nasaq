"use client";

import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { AnalyticsPageFrame, type AnalyticsPageBaseProps, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Num } from "../numeric";
import { Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { Toggle, ToggleGroup } from "../toggle-group";
import { PeriodToggle, TimeSeriesPanel, type TimeSeriesPoint } from "../time-series-panel";
import {
  VITAL_THRESHOLDS,
  type VitalDistribution,
  type VitalRating,
  WEB_VITAL_IDS,
  type WebVitalId,
  WebVitalGauge,
  WebVitalGaugeGrid,
  formatVital,
  passesCoreWebVitals,
  rateVital,
} from "../web-vital-gauge";

const STRINGS = {
  en: {
    title: "Web vitals",
    description: (site: string) => `Real-user performance of ${site}, judged at the 75th percentile`,
    pass: "Passes Core Web Vitals",
    fail: "Does not pass Core Web Vitals",
    passHint: "LCP, INP and CLS are all good for at least 75% of page loads.",
    failHint: "At least one of LCP, INP or CLS is not good for 75% of page loads.",
    noData: "Not enough data to assess Core Web Vitals yet.",
    device: "Device",
    mobile: "Mobile",
    desktop: "Desktop",
    trendTitle: "Trend",
    trendDescription: (id: string) => `${id} at the 75th percentile per day. Dashed lines mark Google's good and poor limits.`,
    goodLimit: "Good limit",
    poorLimit: "Poor limit",
    pagesTitle: "Pages to fix first",
    pagesDescription: "Pages with the most page loads, rated on each metric",
    page: "Page",
    loads: "Page loads",
    good: "Good",
    needs: "Needs improvement",
    poor: "Poor",
    benefits: ["LCP, INP, CLS, FCP and TTFB at the 75th percentile", "How many page loads are good, need improvement or are poor", "Trend over time and the pages to fix first"],
    empty: "No pages to show",
  },
  ar: {
    title: "مؤشرات الويب",
    description: (site: string) => `أداء ${site} عند المستخدمين الفعليين، عند المئين 75`,
    pass: "يجتاز مؤشرات الويب الأساسية",
    fail: "لا يجتاز مؤشرات الويب الأساسية",
    passHint: "مؤشرات LCP وINP وCLS جيدة في 75% على الأقل من تحميلات الصفحات.",
    failHint: "أحد مؤشرات LCP أو INP أو CLS ليس جيدًا في 75% من تحميلات الصفحات.",
    noData: "لا بيانات كافية لتقييم مؤشرات الويب الأساسية بعد.",
    device: "الجهاز",
    mobile: "الجوال",
    desktop: "سطح المكتب",
    trendTitle: "الاتجاه",
    trendDescription: (id: string) => `${id} عند المئين 75 لكل يوم. الخطان المتقطعان يمثلان حدّي Google للجيد والضعيف.`,
    goodLimit: "حد الجيد",
    poorLimit: "حد الضعيف",
    pagesTitle: "الصفحات التي تُصلح أولًا",
    pagesDescription: "الصفحات الأكثر تحميلًا مع تقييم كل مؤشر",
    page: "الصفحة",
    loads: "تحميلات الصفحة",
    good: "جيد",
    needs: "يحتاج إلى تحسين",
    poor: "ضعيف",
    benefits: ["LCP وINP وCLS وFCP وTTFB عند المئين 75", "كم تحميلًا جيدًا أو يحتاج إلى تحسين أو ضعيفًا", "الاتجاه عبر الزمن والصفحات التي تُصلح أولًا"],
    empty: "لا صفحات لعرضها",
  },
};

export type WebVitalsPageLabels = typeof STRINGS.en;

export interface WebVitalReading {
  /** The 75th percentile, in milliseconds (unitless for CLS). */
  p75?: number;
  previous?: number;
  /** Share of page loads in each rating. */
  distribution?: VitalDistribution;
}

export interface WebVitalsPageRow {
  id: string;
  url: string;
  loads: number;
  /** 75th percentile per metric. */
  vitals: Partial<Record<WebVitalId, number>>;
}

export interface WebVitalsData {
  vitals: Partial<Record<WebVitalId, WebVitalReading>>;
  /** One row per day with the p75 of each metric under its id: `LCP`, `INP`, `CLS`, `FCP`, `TTFB`. */
  series: readonly TimeSeriesPoint[];
  pages: readonly WebVitalsPageRow[];
}

export type WebVitalsDevice = "mobile" | "desktop";

export interface WebVitalsPageProps extends AnalyticsPageBaseProps {
  data?: WebVitalsData;
  /** The origin shown, for the subtitle. */
  site?: string;
  /** The device the numbers are for. Omit to hide the device switch. */
  device?: WebVitalsDevice;
  onDeviceChange?: (device: WebVitalsDevice) => void;
  /** The metric charted (controlled). Default LCP. */
  metric?: WebVitalId;
  onMetricChange?: (metric: WebVitalId) => void;
  onPageClick?: (row: WebVitalsPageRow) => void;
  labels?: Partial<WebVitalsPageLabels>;
  frameLabels?: Partial<AnalyticsPageFrameLabels>;
}

const tone: Record<VitalRating, StatusTone> = { good: "success", "needs-improvement": "warning", poor: "danger" };

/**
 * The web vitals report: a verdict on Core Web Vitals, one gauge per metric with its distribution, a trend chart with
 * Google's good and poor limits, and the busiest pages rated per metric. Shows the connect screen until `service` is connected.
 */
export function WebVitalsPage({ service, data, site, device, onDeviceChange, metric: metricProp, onMetricChange, onPageClick, period, onPeriodChange, loading, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, className, labels, frameLabels }: WebVitalsPageProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [inner, setInner] = useState<WebVitalId>("LCP");
  const metric = metricProp ?? inner;
  const pick = (m: WebVitalId) => {
    setInner(m);
    onMetricChange?.(m);
  };
  const busy = loading || !data;
  const locale = useAnalyticsAr() ? "ar" : "en";

  const p75: Partial<Record<WebVitalId, number>> = {};
  for (const id of WEB_VITAL_IDS) {
    const v = data?.vitals[id]?.p75;
    if (v !== undefined) p75[id] = v;
  }
  const assessed = (["LCP", "INP", "CLS"] as const).every((id) => p75[id] !== undefined);
  const passes = passesCoreWebVitals(p75);

  const th = VITAL_THRESHOLDS[metric];
  const limit = (v: number) => (th.unit === "score" ? String(v) : formatVital(metric, v, locale));

  return (
    <AnalyticsPageFrame
      title={t.title}
      description={site ? t.description(site) : undefined}
      service={service}
      benefits={t.benefits}
      actions={
        <>
          {device && onDeviceChange ? (
            <ToggleGroup aria-label={t.device} value={[device]} onValueChange={(v) => v[0] && onDeviceChange(v[0] as WebVitalsDevice)}>
              <Toggle value="mobile">{t.mobile}</Toggle>
              <Toggle value="desktop">{t.desktop}</Toggle>
            </ToggleGroup>
          ) : null}
          <PeriodToggle value={period} onValueChange={onPeriodChange} />
        </>
      }
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
      {busy ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <Card data-slot="web-vitals-verdict" data-pass={assessed ? passes : undefined}>
          <CardContent className="flex items-center gap-3">
            {assessed ? (
              passes ? <CircleCheck aria-hidden className="size-8 shrink-0 text-nq-success-text" /> : <CircleX aria-hidden className="size-8 shrink-0 text-nq-danger-text" />
            ) : null}
            <div className="flex min-w-0 flex-col">
              <p className="text-h3 text-foreground">{assessed ? (passes ? t.pass : t.fail) : t.noData}</p>
              {assessed ? <p className="text-body-sm text-muted-foreground">{passes ? t.passHint : t.failHint}</p> : null}
            </div>
          </CardContent>
        </Card>
      )}
      <WebVitalGaugeGrid>
        {WEB_VITAL_IDS.map((id) => (
          <WebVitalGauge key={id} metric={id} value={data?.vitals[id]?.p75} previous={data?.vitals[id]?.previous} distribution={data?.vitals[id]?.distribution} selected={metric === id} onSelect={pick} />
        ))}
      </WebVitalGaugeGrid>
      <TimeSeriesPanel
        title={`${t.trendTitle}: ${metric}`}
        description={t.trendDescription(metric)}
        metrics={WEB_VITAL_IDS.map((id) => ({ id, label: id, aggregate: "avg" as const, lowerIsBetter: true, format: VITAL_THRESHOLDS[id].unit === "score" ? { maximumFractionDigits: 2 } : { maximumFractionDigits: 0 } }))}
        metric={metric}
        onMetricChange={(m) => pick(m as WebVitalId)}
        data={data?.series ?? []}
        referenceLines={[
          { value: th.good, label: `${t.goodLimit} ${limit(th.good)}`, tone: "success" },
          { value: th.poor, label: `${t.poorLimit} ${limit(th.poor)}`, tone: "danger" },
        ]}
        loading={busy}
      />
      <Card data-slot="web-vitals-pages">
        <CardHeader>
          <CardTitle as="h3">{t.pagesTitle}</CardTitle>
          <CardDescription>{t.pagesDescription}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {busy ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data.pages.length === 0 ? (
            <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <Table label={t.pagesTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.page}</TableHead>
                  <TableHead className="text-end">{t.loads}</TableHead>
                  {(["LCP", "INP", "CLS"] as const).map((id) => (
                    <TableHead key={id} className="text-end">
                      {id}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pages.map((row) => (
                  <TableRow key={row.id} onClick={onPageClick ? () => onPageClick(row) : undefined} className={onPageClick ? "cursor-pointer" : undefined}>
                    <TableCell className="max-w-0 min-w-40">
                      <bdi dir="ltr" className="block truncate">
                        {row.url}
                      </bdi>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      <Num value={row.loads} format={{ notation: "compact", maximumFractionDigits: 1 }} />
                    </TableCell>
                    {(["LCP", "INP", "CLS"] as const).map((id) => {
                      const v = row.vitals[id];
                      const rating = v === undefined ? undefined : rateVital(id, v);
                      return (
                        <TableCell key={id} className="text-end tabular-nums">
                          {v === undefined || !rating ? (
                            "–"
                          ) : (
                            <Status tone={tone[rating]} tinted title={rating === "good" ? t.good : rating === "poor" ? t.poor : t.needs} className="justify-end">
                              <bdi dir="ltr">{formatVital(id, v, locale)}</bdi>
                            </Status>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AnalyticsPageFrame>
  );
}
