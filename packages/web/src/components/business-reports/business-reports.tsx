"use client";

import { ArrowDownRight, CircleCheck, Ellipsis, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { FunnelSteps, ProgressRing, SegmentBar, type SegmentBarSegment, TrendCell } from "../chart-extras";
import { type ContextMenuAction, ContextMenuActions, openContextMenuAt } from "../context-menu";
import { DataTable, type DataTableColumn, type DataTableRowAction, useDataTable } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { type FormatNumberOptions, Num } from "../numeric";
import { StatCard, StatGrid } from "../stat-card";
import { type TimeSeriesMetric, type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  attainment,
  kpiStatus,
  marginBand,
  pipelineRows,
  profitMargin,
  profitTotals,
  winRate,
  type KpiStatus,
  type MarginBand,
  type PipelineStageInput,
} from "./business-reports-math";

const STRINGS = {
  en: {
    revenue: "Revenue",
    cost: "Cost",
    profit: "Profit",
    margin: "Margin",
    losing: (n: number) => (n === 1 ? "1 loses money" : `${n} lose money`),
    breakdown: "Where the revenue goes",
    band: { loss: "Loss", thin: "Thin", healthy: "Healthy" } as Record<MarginBand, string>,
    noRevenue: "No revenue",
    trend: "Trend",
    hours: "Hours",
    subject: "Project",
    empty: "Nothing to report for this period.",
    total: "Total",
    kpiTeam: "Team attainment",
    kpiAhead: "At or above target",
    kpiBehind: "Behind target",
    kpiOf: (actual: string, target: string) => `${actual} of ${target}`,
    kpiStatus: { ahead: "Ahead", "on-track": "On track", behind: "Behind" } as Record<KpiStatus, string>,
    attainment: (name: string, pct: string) => `${name}: ${pct} of target`,
    moreFor: (name: string) => `Actions for ${name}`,
    employee: "Employee",
    target: "Target",
    actual: "Actual",
    view: "View",
    chart: "Chart",
    table: "Table",
    stage: "Stage",
    deals: "Deals",
    value: "Value",
    average: "Average deal",
    fromPrevious: "From previous",
    fromFirst: "From first",
    pipelineValue: "Pipeline value",
    winRate: "Win rate",
    won: "Won",
    open: "Open",
    firstResponse: "First response",
    resolution: "Resolution time",
    csat: "Satisfaction",
    sla: "Within SLA",
    volume: "Ticket volume",
    created: "Created",
    resolved: "Resolved",
    byStatus: "Tickets by status",
    agents: "Agents",
    agent: "Agent",
    assigned: "Assigned",
    resolvedShort: "Resolved",
  },
  ar: {
    revenue: "الإيرادات",
    cost: "التكلفة",
    profit: "الربح",
    margin: "الهامش",
    losing: (n: number) => (n === 1 ? "واحد يخسر" : `${n} تخسر`),
    breakdown: "أين تذهب الإيرادات",
    band: { loss: "خسارة", thin: "ضعيف", healthy: "جيد" } as Record<MarginBand, string>,
    noRevenue: "بلا إيرادات",
    trend: "الاتجاه",
    hours: "الساعات",
    subject: "المشروع",
    empty: "لا شيء للإبلاغ عنه في هذه الفترة.",
    total: "الإجمالي",
    kpiTeam: "تحقيق الفريق",
    kpiAhead: "بلغ الهدف أو تجاوزه",
    kpiBehind: "دون الهدف",
    kpiOf: (actual: string, target: string) => `${actual} من ${target}`,
    kpiStatus: { ahead: "متقدّم", "on-track": "على المسار", behind: "متأخر" } as Record<KpiStatus, string>,
    attainment: (name: string, pct: string) => `${name}: ${pct} من الهدف`,
    moreFor: (name: string) => `إجراءات ${name}`,
    employee: "الموظف",
    target: "الهدف",
    actual: "الفعلي",
    view: "العرض",
    chart: "مخطط",
    table: "جدول",
    stage: "المرحلة",
    deals: "الصفقات",
    value: "القيمة",
    average: "متوسط الصفقة",
    fromPrevious: "من السابقة",
    fromFirst: "من الأولى",
    pipelineValue: "قيمة المسار",
    winRate: "نسبة الفوز",
    won: "مكسوبة",
    open: "مفتوحة",
    firstResponse: "أول رد",
    resolution: "زمن الحل",
    csat: "الرضا",
    sla: "ضمن اتفاقية الخدمة",
    volume: "حجم التذاكر",
    created: "المُنشأة",
    resolved: "المحلولة",
    byStatus: "التذاكر حسب الحالة",
    agents: "الموظفون",
    agent: "الموظف",
    assigned: "المُسندة",
    resolvedShort: "المحلولة",
  },
};

export type BusinessReportsLabels = typeof STRINGS.en;

const PERCENT: FormatNumberOptions = { style: "percent", maximumFractionDigits: 1 };
const WHOLE: FormatNumberOptions = { style: "percent", maximumFractionDigits: 0 };

const bandVariant: Record<MarginBand, "danger" | "warning" | "success"> = { loss: "danger", thin: "warning", healthy: "success" };
const statusVariant: Record<KpiStatus, "success" | "info" | "warning"> = { ahead: "success", "on-track": "info", behind: "warning" };
const statusTone: Record<KpiStatus, "success" | "default" | "warning"> = { ahead: "success", "on-track": "default", behind: "warning" };

/** Minutes as a short duration: "45 min" under two hours, then hours. */
function durationFormat(minutes: number): { value: number; format: FormatNumberOptions } {
  return minutes >= 120
    ? { value: minutes / 60, format: { style: "unit", unit: "hour", unitDisplay: "short", maximumFractionDigits: 1 } }
    : { value: minutes, format: { style: "unit", unit: "minute", unitDisplay: "short", maximumFractionDigits: 0 } };
}

function Duration({ minutes }: { minutes: number }) {
  const d = durationFormat(minutes);
  return <Num value={d.value} format={d.format} />;
}

type SectionProps = Omit<ComponentProps<"section">, "children" | "title">;

/* ------------------------------------------------------------------------------------------- Profitability */

export interface ProfitabilityRow {
  id: string;
  /** Project, client or service. Localise it. */
  name: string;
  revenue: number;
  cost: number;
  /** Hours logged, shown as a column when any row has them. */
  hours?: number;
  /** Margin per period, oldest first, for the row's small chart. */
  marginTrend?: readonly number[];
}

export interface ProfitabilityReportProps extends SectionProps {
  rows: readonly ProfitabilityRow[];
  /** Intl currency options for money, e.g. `{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }`. */
  format: FormatNumberOptions;
  /** Heading of the name column ("Project", "Client"). */
  subjectLabel?: string;
  /** Margins below this are "Thin". Default 0.15. */
  thinBelow?: number;
  /** Menu for a row: context-click, long press, Shift+F10 or the ⋯ button. */
  rowActions?: (row: ProfitabilityRow) => DataTableRowAction[];
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  labels?: Partial<BusinessReportsLabels>;
}

/**
 * Revenue, cost, profit and margin for a period, split by project, client or service. Margin is a number, a word (Loss,
 * Thin, Healthy) and a small trend, so a loss never depends on colour. Rows sort by any column.
 */
export function ProfitabilityReport({ rows, format, subjectLabel, thinBelow = 0.15, rowActions, loading, error, onRetry, labels, className, ...props }: ProfitabilityReportProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const totals = useMemo(() => profitTotals(rows), [rows]);
  const hasHours = rows.some((r) => r.hours !== undefined);
  const hasTrend = rows.some((r) => r.marginTrend?.length);

  const columns = useMemo<DataTableColumn<ProfitabilityRow>[]>(() => {
    const cols: DataTableColumn<ProfitabilityRow>[] = [
      { id: "name", header: subjectLabel ?? t.subject, cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
      { id: "revenue", header: t.revenue, align: "end", cell: (r) => <Num value={r.revenue} format={format} />, sortValue: (r) => r.revenue },
      { id: "cost", header: t.cost, align: "end", cell: (r) => <Num value={r.cost} format={format} />, sortValue: (r) => r.cost },
      { id: "profit", header: t.profit, align: "end", cell: (r) => <Num value={r.revenue - r.cost} format={{ ...format, signDisplay: "exceptZero" }} />, sortValue: (r) => r.revenue - r.cost },
    ];
    if (hasHours) cols.push({ id: "hours", header: t.hours, align: "end", cell: (r) => (r.hours === undefined ? "" : <Num value={r.hours} format={{ maximumFractionDigits: 1 }} />), sortValue: (r) => r.hours ?? 0 });
    cols.push({
      id: "margin",
      header: t.margin,
      align: "end",
      sortValue: (r) => profitMargin(r.revenue, r.cost) ?? -Infinity,
      cell: (r) => {
        const m = profitMargin(r.revenue, r.cost);
        const band = marginBand(m, thinBelow);
        return (
          <span className="inline-flex items-center justify-end gap-2">
            {m === null ? <span className="text-muted-foreground">{t.noRevenue}</span> : <Num value={m} format={PERCENT} />}
            {m !== null ? (
              <Badge variant={bandVariant[band]}>
                {band === "loss" ? <ArrowDownRight aria-hidden /> : band === "thin" ? <TriangleAlert aria-hidden /> : <CircleCheck aria-hidden />}
                {t.band[band]}
              </Badge>
            ) : null}
          </span>
        );
      },
    });
    if (hasTrend)
      cols.push({
        id: "trend",
        header: t.trend,
        cell: (r) => (r.marginTrend?.length ? <TrendCell value="" data={r.marginTrend} chartLabel={`${t.margin}: ${r.name}`} /> : null),
      });
    return cols;
  }, [format, hasHours, hasTrend, subjectLabel, t, thinBelow]);

  const table = useDataTable({ data: rows as ProfitabilityRow[], columns, getRowId: (r) => r.id, pageSize: 8 });
  const segments: SegmentBarSegment[] = [
    { id: "cost", label: t.cost, value: Math.max(0, totals.cost), color: "var(--nq-warning)" },
    { id: "profit", label: t.profit, value: Math.max(0, totals.profit), color: "var(--nq-success)" },
  ];

  return (
    <section data-slot="profitability-report" className={cn("flex flex-col gap-4", className)} {...props}>
      <StatGrid>
        <StatCard label={t.revenue} value={totals.revenue} format={format} loading={loading} />
        <StatCard label={t.cost} value={totals.cost} format={format} loading={loading} />
        <StatCard label={t.profit} value={totals.profit} format={format} loading={loading} deltaLabel={totals.losing ? t.losing(totals.losing) : undefined} />
        <StatCard label={t.margin} value={totals.margin ?? 0} format={PERCENT} loading={loading} />
      </StatGrid>
      {!loading && totals.revenue > 0 ? <SegmentBar label={t.breakdown} segments={segments} total={totals.revenue} format={format} patterned /> : null}
      <DataTable table={table} label={t.subject} rowLabel={(r) => r.name} rowActions={rowActions} loading={loading} error={error} onRetry={onRetry} empty={t.empty} />
    </section>
  );
}

/* ------------------------------------------------------------------------------------- Employee KPI dashboard */

export interface EmployeeKpi {
  id: string;
  name: string;
  role?: string;
  avatarSrc?: string;
  target: number;
  actual: number;
  /** Extra figures on the card: tasks done, hours, calls. */
  metrics?: readonly { id: string; label: string; value: number; format?: FormatNumberOptions }[];
  /** Actual per period, oldest first. */
  trend?: readonly number[];
  /** Change against the last period as a fraction. */
  delta?: number;
}

export interface EmployeeKpiDashboardProps extends SectionProps {
  employees: readonly EmployeeKpi[];
  /** Intl options for `target` and `actual` (hours, deals, currency). */
  format?: FormatNumberOptions;
  /** What the target measures: "Billable hours". Shown in the summary. */
  measure?: string;
  /** Fraction of the target at which someone counts as on track. Default 0.8. */
  onTrackAt?: number;
  /** Menu for an employee card: context-click, long press, Shift+F10 or the ⋯ button. */
  actions?: (employee: EmployeeKpi) => ContextMenuAction[];
  loading?: boolean;
  labels?: Partial<BusinessReportsLabels>;
}

/**
 * One card per person: a ring for how much of the target is reached, the figures, a trend and a status word (Ahead,
 * On track, Behind), with a team summary above. Cards fill the width and reflow to one column on a phone.
 */
export function EmployeeKpiDashboard({ employees, format, measure, onTrackAt = 0.8, actions, loading, labels, className, ...props }: EmployeeKpiDashboardProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const rows = useMemo(() => employees.map((e) => ({ e, fraction: attainment(e.actual, e.target) })), [employees]);
  const target = employees.reduce((a, e) => a + e.target, 0);
  const actual = employees.reduce((a, e) => a + e.actual, 0);
  const ahead = rows.filter((r) => kpiStatus(r.fraction, onTrackAt) === "ahead").length;
  const behind = rows.filter((r) => kpiStatus(r.fraction, onTrackAt) === "behind").length;

  return (
    <section data-slot="employee-kpi-dashboard" className={cn("flex flex-col gap-4", className)} {...props}>
      <StatGrid>
        <StatCard label={measure ? `${t.kpiTeam}: ${measure}` : t.kpiTeam} value={attainment(actual, target)} format={WHOLE} loading={loading} />
        <StatCard label={t.kpiAhead} value={ahead} loading={loading} />
        <StatCard label={t.kpiBehind} value={behind} loading={loading} />
      </StatGrid>
      {!loading && !employees.length ? <p className="text-body text-muted-foreground">{t.empty}</p> : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ e, fraction }) => {
          const status = kpiStatus(fraction, onTrackAt);
          const list = actions?.(e) ?? [];
          return (
            <ContextMenuActions key={e.id} actions={list} render={<li className="min-w-0" />}>
              <Card className="h-full w-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar name={e.name} src={e.avatarSrc} size="lg" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{e.name}</CardTitle>
                    {e.role ? <p className="truncate text-caption text-muted-foreground">{e.role}</p> : null}
                  </div>
                  {list.length ? (
                    <Button variant="ghost" size="icon-sm" aria-label={t.moreFor(e.name)} onClick={(ev) => openContextMenuAt(ev.currentTarget.closest("li") as HTMLElement)}>
                      <Ellipsis aria-hidden />
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={Math.min(fraction, 1) * 100} tone={statusTone[status]} size={84} label={t.attainment(e.name, `${Math.round(fraction * 100)}%`)} valueText={`${Math.round(fraction * 100)}%`} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Badge variant={statusVariant[status]} className="w-fit">
                        {status === "behind" ? <TriangleAlert aria-hidden /> : <CircleCheck aria-hidden />}
                        {t.kpiStatus[status]}
                      </Badge>
                      <p className="text-body">
                        <Num value={e.actual} format={format} />
                        <span className="text-muted-foreground"> / </span>
                        <Num value={e.target} format={format} />
                      </p>
                      {e.trend?.length ? <TrendCell value="" data={e.trend} variant="bar" highlight={e.trend.length - 1} delta={e.delta} chartLabel={`${t.trend}: ${e.name}`} /> : null}
                    </div>
                  </div>
                  {e.metrics?.length ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-caption">
                      {e.metrics.map((m) => (
                        <div key={m.id} className="flex items-baseline justify-between gap-2">
                          <dt className="truncate text-muted-foreground">{m.label}</dt>
                          <dd className="font-medium">
                            <Num value={m.value} format={m.format} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </CardContent>
              </Card>
            </ContextMenuActions>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------- Pipeline */

export interface PipelineStage extends PipelineStageInput {
  label: string;
}

export interface PipelineReportProps extends SectionProps {
  stages: readonly PipelineStage[];
  /** Intl currency options for the value columns. */
  format: FormatNumberOptions;
  /** "chart" (default) or "table" (controlled). */
  view?: "chart" | "table";
  defaultView?: "chart" | "table";
  onViewChange?: (view: "chart" | "table") => void;
  /** Menu for a stage in the table view. */
  stageActions?: (stage: PipelineStage) => DataTableRowAction[];
  loading?: boolean;
  labels?: Partial<BusinessReportsLabels>;
}

/**
 * The sales pipeline stage by stage. The chart view is a funnel with the conversion between stages; the table view has
 * the same figures with value and average deal. Both are one toggle apart and read from the same data.
 */
export function PipelineReport({ stages, format, view: viewProp, defaultView = "chart", onViewChange, stageActions, loading, labels, className, ...props }: PipelineReportProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [inner, setInner] = useState<"chart" | "table">(defaultView);
  const view = viewProp ?? inner;
  const rows = useMemo(() => pipelineRows(stages), [stages]);
  const open = stages[0]?.value ?? 0;
  const wonStage = stages.find((s) => s.won);

  const columns = useMemo<DataTableColumn<(typeof rows)[number]>[]>(
    () => [
      { id: "stage", header: t.stage, cell: (r) => r.stage.label, sortValue: (r) => stages.findIndex((s) => s.id === r.stage.id) },
      { id: "count", header: t.deals, align: "end", cell: (r) => <Num value={r.stage.count} />, sortValue: (r) => r.stage.count },
      { id: "value", header: t.value, align: "end", cell: (r) => <Num value={r.stage.value} format={format} />, sortValue: (r) => r.stage.value },
      { id: "average", header: t.average, align: "end", cell: (r) => <Num value={r.average} format={format} />, sortValue: (r) => r.average },
      { id: "prev", header: t.fromPrevious, align: "end", cell: (r) => <Num value={r.fromPrevious} format={WHOLE} />, sortValue: (r) => r.fromPrevious },
      { id: "first", header: t.fromFirst, align: "end", cell: (r) => <Num value={r.fromFirst} format={WHOLE} />, sortValue: (r) => r.fromFirst },
    ],
    [format, stages, t],
  );
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.stage.id });
  const change = (v: "chart" | "table") => {
    if (viewProp === undefined) setInner(v);
    onViewChange?.(v);
  };

  return (
    <section data-slot="pipeline-report" className={cn("flex flex-col gap-4", className)} {...props}>
      <StatGrid>
        <StatCard label={t.pipelineValue} value={open} format={format} loading={loading} />
        <StatCard label={t.winRate} value={winRate(stages)} format={PERCENT} loading={loading} />
        <StatCard label={t.won} value={wonStage?.value ?? 0} format={format} loading={loading} />
      </StatGrid>
      <div className="flex items-center justify-end gap-2">
        <span id="pipeline-view-label" className="text-caption text-muted-foreground">
          {t.view}
        </span>
        <ToggleGroup aria-labelledby="pipeline-view-label" value={[view]} onValueChange={(v) => v[0] && change(v[0] as "chart" | "table")}>
          <Toggle value="chart">{t.chart}</Toggle>
          <Toggle value="table">{t.table}</Toggle>
        </ToggleGroup>
      </div>
      {view === "chart" ? (
        <Card className="w-full">
          <CardContent className="pt-4">
            <FunnelSteps label={t.deals} steps={stages.map((s) => ({ id: s.id, label: s.label, count: s.count }))} />
          </CardContent>
        </Card>
      ) : (
        <DataTable table={table} label={t.deals} rowLabel={(r) => r.stage.label} rowActions={stageActions ? (r) => stageActions(r.stage) : undefined} loading={loading} empty={t.empty} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------- Support */

export interface SupportSummary {
  open: number;
  /** Median minutes to the first reply. */
  firstResponseMinutes: number;
  /** Median minutes to resolve. */
  resolutionMinutes: number;
  /** Satisfaction as a fraction 0 to 1. */
  csat: number;
  /** Share answered within the objective, 0 to 1. */
  slaRate: number;
  /** Change against the last period as fractions, for each figure. */
  deltas?: Partial<Record<"open" | "firstResponse" | "resolution" | "csat" | "sla", number>>;
}

export interface SupportAgentRow {
  id: string;
  name: string;
  assigned: number;
  resolved: number;
  firstResponseMinutes: number;
  csat: number;
  /** Resolved per period, oldest first. */
  trend?: readonly number[];
}

export interface SupportStatsReportProps extends SectionProps {
  summary: SupportSummary;
  /** One point per day with `created` and `resolved` counts. */
  volume: readonly TimeSeriesPoint[];
  previousVolume?: readonly TimeSeriesPoint[];
  byStatus: readonly SegmentBarSegment[];
  agents: readonly SupportAgentRow[];
  /** Menu for an agent row. */
  agentActions?: (agent: SupportAgentRow) => DataTableRowAction[];
  loading?: boolean;
  labels?: Partial<BusinessReportsLabels>;
}

/** The inbox at a glance: response and resolution times, satisfaction and SLA, volume over time, status mix and a table of agents. */
export function SupportStatsReport({ summary, volume, previousVolume, byStatus, agents, agentActions, loading, labels, className, ...props }: SupportStatsReportProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const d = summary.deltas ?? {};
  const first = durationFormat(summary.firstResponseMinutes);
  const res = durationFormat(summary.resolutionMinutes);
  const metrics = useMemo<TimeSeriesMetric[]>(
    () => [
      { id: "created", label: t.created, color: "var(--nq-info)" },
      { id: "resolved", label: t.resolved, color: "var(--nq-success)" },
    ],
    [t],
  );
  const columns = useMemo<DataTableColumn<SupportAgentRow>[]>(
    () => [
      { id: "name", header: t.agent, cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
      { id: "assigned", header: t.assigned, align: "end", cell: (r) => <Num value={r.assigned} />, sortValue: (r) => r.assigned },
      { id: "resolved", header: t.resolvedShort, align: "end", cell: (r) => <TrendCell value={r.resolved} data={r.trend} chartLabel={`${t.resolvedShort}: ${r.name}`} />, sortValue: (r) => r.resolved },
      { id: "first", header: t.firstResponse, align: "end", cell: (r) => <Duration minutes={r.firstResponseMinutes} />, sortValue: (r) => r.firstResponseMinutes },
      { id: "csat", header: t.csat, align: "end", cell: (r) => <Num value={r.csat} format={WHOLE} />, sortValue: (r) => r.csat },
    ],
    [t],
  );
  const table = useDataTable({ data: agents as SupportAgentRow[], columns, getRowId: (r) => r.id, pageSize: 8 });

  return (
    <section data-slot="support-stats-report" className={cn("flex flex-col gap-4", className)} {...props}>
      <StatGrid>
        <StatCard label={t.open} value={summary.open} delta={d.open} invert loading={loading} />
        <StatCard label={t.firstResponse} value={first.value} format={first.format} delta={d.firstResponse} invert loading={loading} />
        <StatCard label={t.resolution} value={res.value} format={res.format} delta={d.resolution} invert loading={loading} />
        <StatCard label={t.csat} value={summary.csat} format={WHOLE} delta={d.csat} loading={loading} />
        <StatCard label={t.sla} value={summary.slaRate} format={WHOLE} delta={d.sla} loading={loading} />
      </StatGrid>
      <TimeSeriesPanel title={t.volume} metrics={metrics} data={volume} previousData={previousVolume} defaultMetric="created" loading={loading} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t.byStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            <SegmentBar label={t.byStatus} segments={byStatus} patterned />
          </CardContent>
        </Card>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-label font-medium">{t.agents}</h3>
          <DataTable table={table} label={t.agents} rowLabel={(r) => r.name} rowActions={agentActions} loading={loading} empty={t.empty} />
        </div>
      </div>
    </section>
  );
}
