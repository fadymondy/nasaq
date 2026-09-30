"use client";

import { CircleCheck, CircleDot, Clock, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import type { Issue } from "../issue-view/issue-logic";
import { formatDate, formatNumber } from "../numeric";
import { Meter } from "../progress";
import { StatCard, StatGrid } from "../stat-card";
import { EmptyState } from "../states";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import { Timeline, TimelineItem } from "../timeline";
import { addDays, budgetState, burndown, projectTotals, statusCounts } from "./project-logic";

/** One line of the project's recent activity. */
export interface ProjectActivityItem {
  id: string;
  actor?: { name: string; avatar?: string };
  /** What happened, already a sentence: "moved NSQ-14 to Review". */
  title: string;
  description?: string;
  at: Date | string | number;
  /** What kind of event, for the Activity tab filter. Default "other". */
  kind?: "issue" | "comment" | "status" | "member" | "file" | "code" | "time" | "other";
}

export interface ProjectBudget {
  total: number;
  spent: number;
  currency?: string;
}

export interface OverviewText {
  open: string;
  done: string;
  overdue: string;
  progress: string;
  byStatus: string;
  byStatusHint: string;
  burndown: string;
  burndownHint: string;
  remaining: string;
  ideal: string;
  recent: string;
  noActivity: string;
  budget: string;
  budgetHint: string;
  spent: string;
  left: string;
  over: string;
  noBudget: string;
  issues: string;
}

export interface ProjectOverviewProps {
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  activity?: readonly ProjectActivityItem[];
  budget?: ProjectBudget | null;
  /** Burndown range, civil dates. Default: the month up to the latest due date, or 14 days from the first issue. */
  start?: string;
  end?: string;
  /** Civil "today" for overdue and the burndown edge. */
  today: string;
  t: OverviewText;
}

/** Overview tab: counts, open issues by status, burndown, recent activity and budget against spend. */
export function ProjectOverview({ issues, statuses, activity = [], budget, start, end, today, t }: ProjectOverviewProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const { xAxis, yAxis } = useChartAxis();
  const totals = useMemo(() => projectTotals(issues, statuses, today), [issues, statuses, today]);
  const counts = useMemo(() => statusCounts(issues, statuses), [issues, statuses]);

  const range = useMemo(() => {
    if (start && end) return { start, end };
    const dues = issues.map((i) => i.dueDate).filter((d): d is string => Boolean(d)).sort();
    const s = start ?? addDays(today, -13);
    const e = end ?? (dues.length && dues[dues.length - 1]! > today ? dues[dues.length - 1]! : addDays(today, 7));
    return { start: s, end: e };
  }, [issues, start, end, today]);
  const points = useMemo(() => burndown(issues, range.start, range.end, today), [issues, range, today]);

  const day = (key: string) => formatDate(new Date(`${key}T00:00:00`), locale, { day: "numeric", month: "short" });
  const statusData = counts.filter((c) => { const g = statuses.find((x) => x.id === c.statusId)?.stage; return g !== "done" && g !== "canceled"; }).map((c) => {
    const s = statuses.find((x) => x.id === c.statusId);
    return { name: s?.name ?? c.statusId, count: c.count, fill: `var(--nq-tag-${s?.hue ?? "gray"})` };
  });
  const statusCfg: ChartConfig = { count: { label: t.issues, color: "var(--primary)" } };
  const burnCfg: ChartConfig = { remaining: { label: t.remaining, color: "var(--primary)" }, ideal: { label: t.ideal, color: "var(--muted-foreground)" } };
  const burnData = points.map((p) => ({ label: day(p.date), remaining: p.remaining, ideal: p.ideal }));
  const money = (n: number) => formatNumber(n, locale, { style: "currency", currency: budget?.currency ?? "USD", maximumFractionDigits: 0 });
  const b = budget ? budgetState(budget.total, budget.spent) : null;

  return (
    <div data-slot="project-overview" className="@container flex min-w-0 flex-col gap-4">
      <StatGrid>
        <StatCard icon={<CircleDot />} label={t.open} value={totals.open} />
        <StatCard icon={<CircleCheck />} label={t.done} value={totals.done} />
        <StatCard icon={<TriangleAlert />} label={t.overdue} value={totals.overdue} invert />
        <StatCard icon={<Clock />} label={t.progress} value={totals.percent / 100} format={{ style: "percent", maximumFractionDigits: 0 }} />
      </StatGrid>

      <div className="grid min-w-0 gap-4 @3xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h3" className="text-h3">
              {t.byStatus}
            </CardTitle>
            <CardDescription>{t.byStatusHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusCfg} label={`${t.byStatus}. ${statusData.map((d) => `${d.name} ${d.count}`).join(", ")}`} className="aspect-auto h-56">
              <BarChart data={statusData} barCategoryGap={8}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} {...xAxis} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} {...yAxis} />
                <ChartTooltip content={<ChartTooltipContent config={statusCfg} hideLabel={false} />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3" className="text-h3">
              {t.burndown}
            </CardTitle>
            <CardDescription>{t.burndownHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={burnCfg} label={`${t.burndown}. ${range.start} - ${range.end}`} className="aspect-auto h-56">
              <LineChart data={burnData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} {...xAxis} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} {...yAxis} />
                <ChartTooltip content={<ChartTooltipContent config={burnCfg} />} />
                <Line dataKey="ideal" stroke="var(--color-ideal)" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                <Line dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
            <ul className="m-0 mt-2 flex list-none justify-center gap-4 p-0 text-caption text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 bg-primary" />
                {t.remaining}
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="w-4 border-t-2 border-dashed border-muted-foreground" />
                {t.ideal}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3" className="text-h3">
              {t.recent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title={t.noActivity} />
            ) : (
              <Timeline aria-label={t.recent}>
                {activity.slice(0, 6).map((a) => (
                  <TimelineItem key={a.id} actor={a.actor} title={a.title} description={a.description} time={a.at} />
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3" className="text-h3">
              {t.budget}
            </CardTitle>
            <CardDescription>{t.budgetHint}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {budget && b ? (
              <>
                <Meter aria-label={t.budget} value={Math.min(budget.spent, budget.total)} max={budget.total} size="md" showValue={false} />
                <dl className="m-0 grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-caption text-muted-foreground">{t.spent}</dt>
                    <dd className="m-0 text-body font-semibold">
                      <bdi>{money(budget.spent)}</bdi>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{b.over ? t.over : t.left}</dt>
                    <dd className={b.over ? "m-0 text-body font-semibold text-nq-danger-text" : "m-0 text-body font-semibold"}>
                      <bdi>{money(Math.abs(b.remaining))}</bdi>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{t.budget}</dt>
                    <dd className="m-0 text-body font-semibold">
                      <bdi>{money(budget.total)}</bdi>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="m-0 text-body-sm text-muted-foreground">{t.noBudget}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
