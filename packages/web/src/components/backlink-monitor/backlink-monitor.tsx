"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { MetricTiles } from "../metric-tiles";
import { DateTime, Num } from "../numeric";
import { Status } from "../status";
import { type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";
import { type BacklinkStatus, backlinkStatus, dailyLinkSeries, domainOf, isToxic, summarizeBacklinks } from "./backlink-math";

export { NEW_LINK_DAYS, TOXIC_SPAM_SCORE, backlinkStatus, dailyLinkSeries, diffBacklinks, domainOf, isToxic, referringDomains, summarizeBacklinks } from "./backlink-math";
export type { BacklinkLike, BacklinkStatus, BacklinkSummary } from "./backlink-math";

const STRINGS = {
  en: {
    title: "Backlink monitor",
    description: "Links pointing at your site: what arrived, what disappeared and what looks harmful.",
    domains: "Referring domains",
    activeLinks: "Live links",
    newLinks: "New this week",
    lostLinks: "Lost links",
    toxicLinks: "Toxic links",
    comparison: "vs previous period",
    chartTitle: "Links gained and lost",
    gained: "Gained",
    lost: "Lost",
    source: "Linking page",
    target: "Your page",
    anchor: "Anchor",
    rating: "Domain rating",
    spam: "Spam score",
    seen: "First seen",
    status: "Status",
    statusNew: "New",
    statusLost: "Lost",
    statusActive: "Live",
    toxic: "Toxic",
    disavowed: "Disavowed",
    follow: "Follow",
    nofollow: "Nofollow",
    filter: "Filter by domain, anchor or page…",
    empty: "No backlinks found yet",
    disavow: "Disavow",
    markSafe: "Mark as safe",
    failed: "Could not save this. Try again.",
    tableLabel: "Backlinks",
    noAnchor: "(no anchor)",
  },
  ar: {
    title: "مراقب الروابط الخلفية",
    description: "الروابط التي تشير إلى موقعك: ما وصل وما اختفى وما يبدو ضارًا.",
    domains: "النطاقات المُحيلة",
    activeLinks: "روابط نشطة",
    newLinks: "جديدة هذا الأسبوع",
    lostLinks: "روابط مفقودة",
    toxicLinks: "روابط سامة",
    comparison: "مقارنة بالفترة السابقة",
    chartTitle: "الروابط المكتسبة والمفقودة",
    gained: "مكتسبة",
    lost: "مفقودة",
    source: "الصفحة المُحيلة",
    target: "صفحتك",
    anchor: "نص الرابط",
    rating: "تقييم النطاق",
    spam: "درجة السبام",
    seen: "أول ظهور",
    status: "الحالة",
    statusNew: "جديد",
    statusLost: "مفقود",
    statusActive: "نشط",
    toxic: "سام",
    disavowed: "مُتبرَّأ منه",
    follow: "متابَع",
    nofollow: "غير متابَع",
    filter: "تصفية بالنطاق أو النص أو الصفحة…",
    empty: "لا روابط خلفية بعد",
    disavow: "التبرؤ من الرابط",
    markSafe: "تعيين كآمن",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    tableLabel: "الروابط الخلفية",
    noAnchor: "(بلا نص)",
  },
};

export type BacklinkMonitorLabels = typeof STRINGS.en;

export interface Backlink {
  id: string;
  /** The full URL of the page that links to you. */
  sourceUrl: string;
  /** The page on your site it points to. */
  targetUrl: string;
  anchor: string;
  /** 0 to 100, higher is a stronger domain. */
  domainRating: number;
  /** 0 to 100, higher is spammier. */
  spamScore: number;
  /** ISO date. */
  firstSeen: string;
  /** ISO date the link was found gone. */
  lostAt?: string;
  /** False for rel="nofollow". Default true. */
  followed?: boolean;
  disavowed?: boolean;
}

type Result = void | { error?: string };

export interface BacklinkMonitorProps {
  links: readonly Backlink[];
  /** Tells search engines to ignore these links. Without it the action is hidden. */
  onDisavow?: (ids: string[]) => Promise<Result>;
  /** Marks a flagged link as safe (clears the toxic flag). Without it the action is hidden. */
  onMarkSafe?: (id: string) => Promise<Result>;
  /** "Now" for the new-this-week and chart windows. Default: the current time. Pass a fixed value in tests and demos. */
  now?: number;
  /** Days on the gained/lost chart. Default 30. */
  days?: number;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<BacklinkMonitorLabels>;
}

/**
 * Backlink monitor: tiles for referring domains, live, new, lost and toxic links, a gained-versus-lost chart, and a
 * table you can filter by status or toxicity. Toxic links get "Disavow" and "Mark as safe" row actions.
 */
export function BacklinkMonitor({ links, onDisavow, onMarkSafe, now: nowProp, days = 30, title, description, pageSize = 8, loading, error, onRetry, className, labels }: BacklinkMonitorProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const now = nowProp ?? Date.now();
  const [failed, setFailed] = useState<string | null>(null);

  const summary = useMemo(() => summarizeBacklinks(links, now), [links, now]);
  const series = useMemo<TimeSeriesPoint[]>(() => dailyLinkSeries(links, days, now).map((d) => ({ date: d.date, gained: d.gained, lost: d.lost })), [links, days, now]);

  const run = async (fn: () => Promise<Result>) => {
    setFailed(null);
    try {
      const out = await fn();
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.failed);
    }
  };

  const statusLabel: Record<BacklinkStatus, string> = { new: t.statusNew, lost: t.statusLost, active: t.statusActive };
  const flag = (l: Backlink): string => (l.lostAt ? "lost" : isToxic(l) ? "toxic" : backlinkStatus(l, now));

  const columns = useMemo<DataTableColumn<Backlink>[]>(
    () => [
      {
        id: "source",
        header: t.source,
        label: t.source,
        hideable: false,
        sortValue: (l) => domainOf(l.sourceUrl),
        searchValue: (l) => `${l.sourceUrl} ${l.anchor} ${l.targetUrl}`,
        cell: (l) => (
          <span className="flex min-w-0 flex-col">
            <bdi dir="ltr" className="block max-w-[26ch] truncate text-label text-foreground">
              {domainOf(l.sourceUrl)}
            </bdi>
            <bdi dir="ltr" className="block max-w-[26ch] truncate text-caption text-muted-foreground">
              {l.sourceUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"}
            </bdi>
          </span>
        ),
      },
      {
        id: "anchor",
        header: t.anchor,
        label: t.anchor,
        sortValue: (l) => l.anchor,
        cell: (l) => (
          <span dir="auto" className="block max-w-[18ch] truncate text-body-sm">
            {l.anchor || t.noAnchor}
          </span>
        ),
      },
      {
        id: "target",
        header: t.target,
        label: t.target,
        sortValue: (l) => l.targetUrl,
        cell: (l) => (
          <bdi dir="ltr" className="block max-w-[18ch] truncate text-caption text-muted-foreground">
            {l.targetUrl}
          </bdi>
        ),
      },
      { id: "rating", header: t.rating, label: t.rating, align: "end", sortValue: (l) => l.domainRating, cell: (l) => <Num value={l.domainRating} /> },
      { id: "spam", header: t.spam, label: t.spam, align: "end", sortValue: (l) => l.spamScore, cell: (l) => <Num value={l.spamScore} /> },
      { id: "seen", header: t.seen, label: t.seen, sortValue: (l) => l.firstSeen, cell: (l) => <DateTime value={l.firstSeen} format={{ month: "short", day: "numeric", year: "numeric" }} /> },
      {
        id: "status",
        header: t.status,
        label: t.status,
        sortValue: (l) => flag(l),
        filterValue: (l) => flag(l),
        cell: (l) => {
          const s = backlinkStatus(l, now);
          return (
            <span className="flex flex-wrap items-center gap-1">
              <Status tone={s === "lost" ? "danger" : s === "new" ? "success" : "neutral"}>{statusLabel[s]}</Status>
              {l.disavowed ? <Badge variant="outline">{t.disavowed}</Badge> : isToxic(l) && !l.lostAt ? <Badge variant="danger">{t.toxic}</Badge> : null}
              {l.followed === false ? <Badge variant="outline">{t.nofollow}</Badge> : null}
            </span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, now],
  );

  const table = useDataTable({ data: [...links], columns, getRowId: (l) => l.id, pageSize, defaultSort: { id: "seen", direction: "desc" } });

  const rowActions = (l: Backlink): DataTableRowAction[] => [
    ...(onDisavow && !l.disavowed ? [{ id: "disavow", label: t.disavow, icon: ShieldOff, danger: true, onSelect: () => void run(() => onDisavow([l.id])) }] : []),
    ...(onMarkSafe && isToxic(l) ? [{ id: "safe", label: t.markSafe, icon: ShieldCheck, onSelect: () => void run(() => onMarkSafe(l.id)) }] : []),
  ];

  return (
    <div data-slot="backlink-monitor" className={className ? `flex w-full flex-col gap-6 ${className}` : "flex w-full flex-col gap-6"}>
      <MetricTiles
        metrics={[
          { id: "domains", label: t.domains, value: summary.domains },
          { id: "active", label: t.activeLinks, value: summary.active },
          { id: "new", label: t.newLinks, value: summary.new },
          { id: "lost", label: t.lostLinks, value: summary.lost, invert: true },
          { id: "toxic", label: t.toxicLinks, value: summary.toxic, invert: true },
        ]}
        comparisonLabel={t.comparison}
        loading={loading}
      />
      <TimeSeriesPanel
        title={t.chartTitle}
        metrics={[
          { id: "gained", label: t.gained, color: "var(--nq-success)" },
          { id: "lost", label: t.lost, color: "var(--nq-danger)" },
        ]}
        data={series}
        defaultMetric="gained"
        defaultCompare={false}
        loading={loading}
        chartClassName="h-48"
      />
      <Card>
        <CardHeader>
          <CardTitle as="h3">{title ?? t.title}</CardTitle>
          <CardDescription>{description ?? t.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataTableToolbar>
            <DataTableSearch table={table} placeholder={t.filter} />
            <DataTableFacetFilter
              table={table}
              column="status"
              title={t.status}
              options={[
                { value: "new", label: t.statusNew },
                { value: "active", label: t.statusActive },
                { value: "lost", label: t.statusLost },
                { value: "toxic", label: t.toxic },
              ]}
            />
          </DataTableToolbar>
          {failed ? (
            <Status tone="danger" role="alert">
              {failed}
            </Status>
          ) : null}
          <DataTable table={table} label={t.tableLabel} loading={loading} error={error} onRetry={onRetry} empty={t.empty} rowActions={rowActions} />
          {links.length > pageSize ? <DataTablePagination table={table} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
