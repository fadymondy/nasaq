"use client";

import { ArrowDown, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { BreakdownTable } from "../breakdown-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Num } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { type FunnelRow, type FunnelStepInput, barWidth, biggestDropIndex, funnelRows, overallConversion } from "./funnel-math";

export { barWidth, biggestDropIndex, funnelRows, insertStep, moveStep, overallConversion, removeStep, windowKey, windowMs } from "./funnel-math";
export { FunnelList } from "./funnel-list";
export type { FunnelListLabels, FunnelListProps, FunnelSummary } from "./funnel-list";
export type { FunnelRow, FunnelStepInput, FunnelWindow, WindowUnit } from "./funnel-math";

const STRINGS = {
  en: {
    title: "Conversion funnel",
    description: "How many people reach each step, and where they leave.",
    overall: "Overall conversion",
    entered: "Entered",
    completed: "Completed",
    ofPrevious: "of previous step",
    ofFirst: "of first step",
    continued: (pct: string) => `${pct} continued`,
    dropped: (n: string, pct: string) => `${n} left (${pct})`,
    biggest: "Biggest drop",
    empty: "No funnel data for this period",
    chart: "Funnel steps",
    segmentsTitle: "Conversion by segment",
    segmentsDescription: "The same funnel split by who came in.",
    segment: "Segment",
    converted: "Converted",
    rate: "Conversion",
    stepCount: (i: number, total: number) => `Step ${i} of ${total}`,
  },
  ar: {
    title: "قمع التحويل",
    description: "كم شخصًا يصل إلى كل خطوة، وأين يغادرون.",
    overall: "التحويل الإجمالي",
    entered: "دخلوا",
    completed: "أتمّوا",
    ofPrevious: "من الخطوة السابقة",
    ofFirst: "من الخطوة الأولى",
    continued: (pct: string) => `تابع ${pct}`,
    dropped: (n: string, pct: string) => `غادر ${n} (${pct})`,
    biggest: "أكبر تسرّب",
    empty: "لا بيانات قمع لهذه الفترة",
    chart: "خطوات القمع",
    segmentsTitle: "التحويل حسب الشريحة",
    segmentsDescription: "القمع نفسه مقسومًا حسب مصدر الزوار.",
    segment: "الشريحة",
    converted: "أتمّوا",
    rate: "التحويل",
    stepCount: (i: number, total: number) => `الخطوة ${i} من ${total}`,
  },
};

export type FunnelChartLabels = typeof STRINGS.en;

export interface FunnelStep extends FunnelStepInput {
  /** Extra line under the label: the event name or page path. Kept left-to-right. */
  detail?: string;
}

export interface FunnelSegment {
  id: string;
  label: ReactNode;
  /** People from this segment that entered the first step. */
  entered: number;
  /** People from this segment that reached the last step. */
  converted: number;
}

export interface FunnelChartProps {
  steps: readonly FunnelStep[];
  title?: ReactNode;
  description?: ReactNode;
  /** Splits of the same funnel by source or segment. Adds a breakdown table under the chart. */
  segments?: readonly FunnelSegment[];
  /** Heading of the segment column, for example "Source". Default "Segment". */
  segmentLabel?: ReactNode;
  /** Right side of the header, for example a window select. */
  action?: ReactNode;
  loading?: boolean;
  className?: string;
  labels?: Partial<FunnelChartLabels>;
}

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

/**
 * A funnel: one bar per step sized against the first, with the count, the conversion from the previous step and from the
 * first, and the drop-off between steps. The step with the biggest drop is flagged. Bars grow from the inline start,
 * so the funnel reads right-to-left in Arabic.
 */
export function FunnelChart({ steps, title, description, segments, segmentLabel, action, loading = false, className, labels }: FunnelChartProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const rows: FunnelRow<FunnelStep>[] = funnelRows(steps);
  const first = steps[0]?.count ?? 0;
  const worst = biggestDropIndex(steps);
  const overall = overallConversion(steps);

  return (
    <div data-slot="funnel-chart" className={cn("flex w-full flex-col gap-4", className)}>
      <Card aria-busy={loading || undefined}>
        <CardHeader>
          <CardTitle as="h3">{title ?? t.title}</CardTitle>
          <CardDescription>{description ?? t.description}</CardDescription>
          {action ? <div className="mt-2">{action}</div> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : steps.length === 0 ? (
            <EmptyState title={t.empty} />
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <div className="flex flex-col">
                  <span className="text-caption text-muted-foreground">{t.overall}</span>
                  <span className="text-heading-sm text-foreground" data-slot="funnel-overall">
                    <Num value={overall} format={{ style: "percent", maximumFractionDigits: 1 }} />
                  </span>
                </div>
                <span className="text-body-sm text-muted-foreground">
                  {t.entered} <Num value={first} /> · {t.completed} <Num value={steps[steps.length - 1]!.count} />
                </span>
              </div>
              <ol aria-label={t.chart} className="flex flex-col">
                {rows.map((r, i) => (
                  <li key={r.step.id} data-slot="funnel-step" className="flex flex-col">
                    {i > 0 ? (
                      <div className="flex items-center gap-2 py-1.5 ps-3 text-caption text-muted-foreground" data-slot="funnel-gap">
                        <ArrowDown className="size-3.5 shrink-0" aria-hidden />
                        <span>{t.continued(pct(r.fromPrevious))}</span>
                        <span aria-hidden>·</span>
                        <span className={cn(worst === i && "text-danger")}>
                          {t.dropped(String(r.dropped.toLocaleString("en")), pct(r.dropRate))}
                        </span>
                        {worst === i ? (
                          <Badge variant="danger">
                            <TriangleAlert aria-hidden />
                            {t.biggest}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-1.5 rounded-card border border-border p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 flex-col">
                          <span dir="auto" className="truncate text-label text-foreground">
                            {r.step.label}
                          </span>
                          {r.step.detail ? (
                            <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                              {r.step.detail}
                            </bdi>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 flex-col items-end">
                          <span className="text-label text-foreground">
                            <Num value={r.step.count} />
                          </span>
                          <span className="text-caption text-muted-foreground">
                            <Num value={r.fromFirst} format={{ style: "percent", maximumFractionDigits: 1 }} /> {t.ofFirst}
                          </span>
                        </span>
                      </div>
                      <div
                        role="img"
                        aria-label={`${r.step.label}: ${r.step.count.toLocaleString("en")} (${pct(r.fromFirst)})`}
                        className="h-3 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div className="h-full rounded-full bg-primary transition-[inline-size]" style={{ inlineSize: `${barWidth(r.step.count, first) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>
      {segments && segments.length > 0 ? (
        <BreakdownTable
          title={t.segmentsTitle}
          description={t.segmentsDescription}
          dimensionLabel={segmentLabel ?? t.segment}
          valueLabel={t.converted}
          rows={segments.map((s) => ({ id: s.id, label: s.label, value: s.converted }))}
          columns={[
            {
              id: "rate",
              header: t.rate,
              align: "end",
              cell: (row) => {
                const s = segments.find((x) => x.id === row.id);
                return <Num value={s && s.entered > 0 ? s.converted / s.entered : 0} format={{ style: "percent", maximumFractionDigits: 1 }} />;
              },
            },
          ]}
          label={t.segmentsTitle}
        />
      ) : null}
    </div>
  );
}
