"use client";

import { Download, Footprints, BedDouble, Droplets, Heart, Scale } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { ENGINE_ICONS } from "../engine-card/engine-card";
import { type EngineId, type HistoryDay, parseCivilDate, summariseDays } from "../engine-card/health-engines";
import type { FormatNumberOptions } from "../numeric";
import { Duration, type HealthActionResult, Measure, useHealthDate, useHealthLabels } from "../engine-card/health-format";
import { SectionHeader } from "../section-header";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { StatCard, StatGrid } from "../stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { Toggle, ToggleGroup } from "../toggle-group";
import { type ReportDay, type ReportMetric, metricSeries, summariseReport } from "./report-math";

export * from "./report-math";

const STRINGS = {
  en: {
    title: "Reports",
    lede: "Your recent days, in counts and averages. Days with no reading are left out, never counted as zero.",
    period: "Period",
    periodOption: (days: number) => `${days} days`,
    export: "Export CSV",
    exporting: "Exporting",
    exportFailed: "The export failed.",
    averages: "Averages",
    averagesDescription: (n: number) => `Across the ${n} days that reported each figure.`,
    avgWater: "Average water",
    avgSteps: "Average steps",
    avgSleep: "Average sleep",
    avgHeartRate: "Average resting heart rate",
    weightChange: "Weight change",
    weightChangeNote: (from: ReactNode, to: ReactNode) => (
      <>
        {from} to {to}
      </>
    ),
    notEnough: "Not enough readings",
    trend: "Trend",
    metrics: { waterMl: "Water", steps: "Steps", sleepMinutes: "Sleep", weightKg: "Weight", restingHeartRate: "Resting heart rate", activeEnergyKcal: "Active energy" } as Record<ReportMetric, string>,
    metricPicker: "Figure to chart",
    trendSummary: (label: string, days: number) => `${label} over the last ${days} days`,
    noReadings: "No readings in this period for this figure.",
    meals: "Meals",
    mealsDescription: "Meals per day by safety.",
    caffeine: "Caffeine",
    caffeineDescription: "Caffeine drinks per day, counted.",
    safe: "Safe",
    unsafe: "Unsafe",
    clean: "Clean",
    sugar: "With sugar",
    adherence: "Protocol days",
    adherenceDescription: "For each engine that judges days: days on protocol, off it, and days it declined to judge.",
    engine: "Engine",
    onProtocol: "On protocol",
    offProtocol: "Off protocol",
    notJudged: "Not judged",
    currentStreak: "Current streak",
    bestStreak: "Best streak",
    loadError: "The report could not be loaded.",
    retry: "Try again",
    empty: "No days in this period",
    emptyHint: "Log something or sync a device to build a report.",
    daysWithData: "Days with data",
    shutdownDays: "Days with shutdown violations",
    tableCaption: "Protocol days per engine",
  },
  ar: {
    title: "التقارير",
    lede: "أيامك الأخيرة بالأعداد والمتوسطات. الأيام بلا قراءة تُستبعد ولا تُحسب صفرًا.",
    period: "الفترة",
    periodOption: (days: number) => `${days} يومًا`,
    export: "تصدير CSV",
    exporting: "جارٍ التصدير",
    exportFailed: "فشل التصدير.",
    averages: "المتوسطات",
    averagesDescription: (n: number) => `على مدى ${n} يومًا أبلغ كل رقم فيها.`,
    avgWater: "متوسط الماء",
    avgSteps: "متوسط الخطوات",
    avgSleep: "متوسط النوم",
    avgHeartRate: "متوسط نبض الراحة",
    weightChange: "تغيّر الوزن",
    weightChangeNote: (from: ReactNode, to: ReactNode) => (
      <>
        من {from} إلى {to}
      </>
    ),
    notEnough: "قراءات غير كافية",
    trend: "الاتجاه",
    metrics: { waterMl: "الماء", steps: "الخطوات", sleepMinutes: "النوم", weightKg: "الوزن", restingHeartRate: "نبض الراحة", activeEnergyKcal: "الطاقة النشطة" } as Record<ReportMetric, string>,
    metricPicker: "الرقم المعروض",
    trendSummary: (label: string, days: number) => `${label} خلال آخر ${days} يومًا`,
    noReadings: "لا قراءات في هذه الفترة لهذا الرقم.",
    meals: "الوجبات",
    mealsDescription: "الوجبات في اليوم حسب الأمان.",
    caffeine: "الكافيين",
    caffeineDescription: "مشروبات الكافيين في اليوم، معدودة.",
    safe: "آمنة",
    unsafe: "غير آمنة",
    clean: "بدون سكر",
    sugar: "مع سكر",
    adherence: "أيام البروتوكول",
    adherenceDescription: "لكل محرّك يحكم على الأيام: أيام ضمن البروتوكول وخارجه وأيام امتنع عن تقييمها.",
    engine: "المحرّك",
    onProtocol: "ضمن البروتوكول",
    offProtocol: "خارج البروتوكول",
    notJudged: "لم تُقيَّم",
    currentStreak: "السلسلة الحالية",
    bestStreak: "أفضل سلسلة",
    loadError: "تعذّر تحميل التقرير.",
    retry: "حاول مرة أخرى",
    empty: "لا أيام في هذه الفترة",
    emptyHint: "سجّل شيئًا أو زامن جهازًا لبناء تقرير.",
    daysWithData: "أيام فيها بيانات",
    shutdownDays: "أيام فيها مخالفات إغلاق",
    tableCaption: "أيام البروتوكول لكل محرّك",
  },
};

export type HealthReportLabels = typeof STRINGS.en;

/** One engine's day verdicts over the report period, oldest first. */
export interface EngineReport {
  engine: EngineId;
  days: readonly HistoryDay[];
}

export interface HealthReportProps extends Omit<ComponentProps<"div">, "children"> {
  /** One rollup per day, oldest first. Figures a device did not send are left out. */
  days: readonly ReportDay[];
  /** Per-engine verdicts for the same period. Only hydration, caffeine and GERD judge days. */
  engines?: readonly EngineReport[];
  /** Periods offered, in days. Default `[7, 30, 90]`. */
  periods?: readonly number[];
  /** The applied period. Controlled; omit to let the component keep it. */
  period?: number;
  /** Called when a period is chosen. Load it and pass the new `days` back. */
  onPeriodChange?: (days: number) => void;
  /** Export the report. Resolve with `{ error }` to show the server's message. Omit to hide the button. */
  onExport?: () => Promise<HealthActionResult>;
  loading?: boolean;
  /** The server's message when the report could not be loaded. */
  error?: string;
  onRetry?: () => void;
  labels?: Partial<HealthReportLabels>;
}

const METRIC_ICON = { waterMl: Droplets, steps: Footprints, sleepMinutes: BedDouble, weightKg: Scale, restingHeartRate: Heart } as const;
const CHART_METRICS: ReportMetric[] = ["waterMl", "steps", "sleepMinutes", "weightKg", "restingHeartRate"];

/**
 * Health reports over a period: averages that skip missing days, a chart of one figure at a time, meals and caffeine
 * per day, and each engine's days on and off protocol with streaks. Counts and verdicts, never a score.
 */
export function HealthReport({ days, engines, periods = [7, 30, 90], period, onPeriodChange, onExport, loading = false, error, onRetry, labels, className, ...props }: HealthReportProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const headingId = useId();
  const [ownPeriod, setOwnPeriod] = useState(periods[0] ?? 30);
  const active = period ?? ownPeriod;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string>();
  const summary = useMemo(() => summariseReport(days), [days]);

  async function runExport() {
    if (!onExport) return;
    setExporting(true);
    setExportError(undefined);
    try {
      const result = await onExport();
      if (result && result.error) setExportError(result.error);
    } catch {
      setExportError(t.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  let body: ReactNode;
  if (loading) {
    body = (
      <div aria-busy className="flex flex-col gap-4">
        <StatGrid>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </StatGrid>
        <Skeleton className="h-64" />
      </div>
    );
  } else if (error) {
    body = (
      <ErrorState
        title={t.loadError}
        description={error}
        actions={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (days.length === 0 || summary.daysWithData === 0) {
    body = <EmptyState title={t.empty} description={t.emptyHint} />;
  } else {
    body = <ReportBody days={days} summary={summary} engines={engines} t={t} />;
  }

  return (
    <div data-slot="health-report" aria-labelledby={headingId} className={cn("flex flex-col gap-6", className)} role="region" {...props}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 id={headingId} className="text-h1 text-foreground">
              {t.title}
            </h1>
            <p className="max-w-prose text-pretty text-body text-muted-foreground">{t.lede}</p>
          </div>
          {onExport ? (
            <Button variant="secondary" onClick={runExport} loading={exporting} disabled={loading || days.length === 0}>
              <Download aria-hidden />
              {exporting ? t.exporting : t.export}
            </Button>
          ) : null}
        </div>
        {exportError ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {exportError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label text-muted-foreground">{t.period}</span>
          <ToggleGroup
            aria-label={t.period}
            value={[String(active)]}
            onValueChange={(v) => {
              const next = Number(v[0]);
              if (!next) return;
              setOwnPeriod(next);
              onPeriodChange?.(next);
            }}
          >
            {periods.map((n) => (
              <Toggle key={n} value={String(n)}>
                {t.periodOption(n)}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>
      </header>
      {body}
    </div>
  );
}

type T = ReturnType<typeof useHealthLabels<{ en: typeof STRINGS.en; ar: typeof STRINGS.ar }>>;

function ReportBody({ days, summary, engines, t }: { days: readonly ReportDay[]; summary: ReturnType<typeof summariseReport>; engines?: readonly EngineReport[]; t: T }) {
  const headingId = useId();
  const d = useHealthDate();
  const { xAxis, yAxis } = useChartAxis();
  const [metric, setMetric] = useState<ReportMetric>("waterMl");

  const label = (date: string) => d.date(parseCivilDate(date), { day: "numeric", month: "short" });
  const series = metricSeries(days, metric);
  const hasSeries = series.some((p) => p.value !== null);
  const trendConfig: ChartConfig = { value: { label: t.metrics[metric], color: "var(--primary)" } };
  const stackConfig = (a: [string, string, string], b: [string, string, string]): ChartConfig => ({
    [a[0]]: { label: a[1], color: a[2] },
    [b[0]]: { label: b[1], color: b[2] },
  });
  const mealsConfig = stackConfig(["safe", t.safe, "var(--nq-success)"], ["unsafe", t.unsafe, "var(--nq-warning)"]);
  const caffeineConfig = stackConfig(["clean", t.clean, "var(--nq-success)"], ["sugar", t.sugar, "var(--nq-warning)"]);
  const mealRows = days.map((day) => ({ label: label(day.date), safe: day.meals?.safe ?? 0, unsafe: day.meals?.unsafe ?? 0 }));
  const caffeineRows = days.map((day) => ({ label: label(day.date), clean: day.caffeine?.clean ?? 0, sugar: day.caffeine?.sugar ?? 0 }));
  const hasMeals = days.some((day) => day.meals);
  const hasCaffeine = days.some((day) => day.caffeine);
  const judged = (engines ?? []).filter((e) => e.days.length > 0);
  const a = summary.averages;
  const notEnough = <span className="text-body-sm font-normal text-muted-foreground">{t.notEnough}</span>;
  const tooltipFormat: FormatNumberOptions = {
    maximumFractionDigits: metric === "weightKg" ? 1 : 0,
    ...(metric === "waterMl" ? { style: "unit", unit: "milliliter" } : metric === "weightKg" ? { style: "unit", unit: "kilogram" } : metric === "sleepMinutes" ? { style: "unit", unit: "minute" } : {}),
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${headingId}-avg`} className="flex flex-col gap-4">
        <SectionHeader as="h2" headingId={`${headingId}-avg`} title={t.averages} description={t.averagesDescription(summary.daysWithData)} />
        <StatGrid>
          <StatCard label={t.avgWater} icon={<Droplets />} value={a.waterMl === null ? notEnough : <Measure value={a.waterMl} unit="milliliter" format={{ maximumFractionDigits: 0 }} />} />
          <StatCard label={t.avgSteps} icon={<Footprints />} value={a.steps === null ? notEnough : <Measure value={a.steps} unit="steps" format={{ maximumFractionDigits: 0 }} />} />
          <StatCard label={t.avgSleep} icon={<BedDouble />} value={a.sleepMinutes === null ? notEnough : <Duration seconds={Math.round(a.sleepMinutes * 60)} />} />
          <StatCard label={t.avgHeartRate} icon={<Heart />} value={a.restingHeartRate === null ? notEnough : <Measure value={a.restingHeartRate} unit="bpm" format={{ maximumFractionDigits: 0 }} />} />
          <StatCard
            label={t.weightChange}
            icon={<Scale />}
            value={
              summary.weight === null ? (
                notEnough
              ) : (
                <Measure value={summary.weight.change} unit="kilogram" format={{ maximumFractionDigits: 1, signDisplay: "exceptZero" }} />
              )
            }
          />
          <StatCard label={t.shutdownDays} value={<Measure value={summary.daysWithShutdownViolations} unit="day" format={{ unitDisplay: "long" }} />} />
        </StatGrid>
      </section>

      <section aria-labelledby={`${headingId}-trend`} className="flex flex-col gap-4">
        <SectionHeader
          as="h2"
          headingId={`${headingId}-trend`}
          title={t.trend}
        />
        <div className="overflow-x-auto pb-1">
          <ToggleGroup aria-label={t.metricPicker} value={[metric]} onValueChange={(v) => v[0] && setMetric(v[0] as ReportMetric)}>
            {CHART_METRICS.map((m) => {
              const Icon = METRIC_ICON[m as keyof typeof METRIC_ICON];
              return (
                <Toggle key={m} value={m}>
                  <Icon aria-hidden />
                  {t.metrics[m]}
                </Toggle>
              );
            })}
          </ToggleGroup>
        </div>
        <Card>
          <CardContent>
            {hasSeries ? (
              <ChartContainer config={trendConfig} label={t.trendSummary(t.metrics[metric], days.length)} className="aspect-auto h-64">
                {metric === "weightKg" || metric === "restingHeartRate" ? (
                  <LineChart data={series.map((p) => ({ label: label(p.date), value: p.value }))}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} {...xAxis} />
                    <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} width={40} tickFormatter={(n: number) => String(n)} {...yAxis} />
                    <ChartTooltip content={<ChartTooltipContent config={trendConfig} valueFormat={tooltipFormat} />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <BarChart data={series.map((p) => ({ label: label(p.date), value: p.value }))} barCategoryGap={days.length > 31 ? 1 : 4}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} {...xAxis} />
                    <YAxis tickLine={false} axisLine={false} width={44} {...yAxis} />
                    <ChartTooltip content={<ChartTooltipContent config={trendConfig} valueFormat={tooltipFormat} />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                )}
              </ChartContainer>
            ) : (
              <p className="py-10 text-center text-body-sm text-muted-foreground">{t.noReadings}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {hasMeals || hasCaffeine ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {hasMeals ? (
            <StackCard title={t.meals} description={t.mealsDescription} config={mealsConfig} rows={mealRows} keys={["safe", "unsafe"]} axis={{ xAxis, yAxis }} summary={`${t.meals}, ${days.length}`} />
          ) : null}
          {hasCaffeine ? (
            <StackCard title={t.caffeine} description={t.caffeineDescription} config={caffeineConfig} rows={caffeineRows} keys={["clean", "sugar"]} axis={{ xAxis, yAxis }} summary={`${t.caffeine}, ${days.length}`} />
          ) : null}
        </section>
      ) : null}

      {judged.length > 0 ? (
        <section aria-labelledby={`${headingId}-adh`} className="flex flex-col gap-4">
          <SectionHeader as="h2" headingId={`${headingId}-adh`} title={t.adherence} description={t.adherenceDescription} />
          <Card>
            <CardContent>
              <div className="overflow-x-auto">
              <Table label={t.tableCaption}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.engine}</TableHead>
                    <TableHead>{t.onProtocol}</TableHead>
                    <TableHead>{t.offProtocol}</TableHead>
                    <TableHead>{t.notJudged}</TableHead>
                    <TableHead>{t.currentStreak}</TableHead>
                    <TableHead>{t.bestStreak}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {judged.map((e) => {
                    const totals = summariseDays(e.days);
                    const Icon = ENGINE_ICONS[e.engine];
                    const count = (n: number) => <Measure value={n} unit="day" format={{ unitDisplay: "long" }} />;
                    return (
                      <TableRow key={e.engine}>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 font-medium">
                            <Icon aria-hidden className="size-4 text-muted-foreground" />
                            {t.engines[e.engine].title}
                          </span>
                        </TableCell>
                        <TableCell>{count(totals.daysOnProtocol)}</TableCell>
                        <TableCell>{count(totals.daysOffProtocol)}</TableCell>
                        <TableCell>{count(totals.daysUnevaluated)}</TableCell>
                        <TableCell>{count(totals.currentStreak)}</TableCell>
                        <TableCell>{count(totals.bestStreak)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function StackCard({
  title,
  description,
  config,
  rows,
  keys,
  axis,
  summary,
}: {
  title: string;
  description: string;
  config: ChartConfig;
  rows: Record<string, string | number>[];
  keys: [string, string];
  axis: ReturnType<typeof useChartAxis> extends infer A ? { xAxis: A extends { xAxis: infer X } ? X : never; yAxis: A extends { yAxis: infer Y } ? Y : never } : never;
  summary: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3" className="text-h3">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} label={summary} className="aspect-auto h-52">
          <BarChart data={rows} barCategoryGap={rows.length > 31 ? 1 : 4}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} {...axis.xAxis} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} {...axis.yAxis} />
            <ChartTooltip content={<ChartTooltipContent config={config} />} />
            <ChartLegend content={<ChartLegendContent config={config} />} />
            <Bar dataKey={keys[0]} stackId="s" fill={`var(--color-${keys[0]})`} isAnimationActive={false} />
            <Bar dataKey={keys[1]} stackId="s" fill={`var(--color-${keys[1]})`} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
