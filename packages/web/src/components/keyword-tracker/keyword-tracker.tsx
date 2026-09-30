"use client";

import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Sparkline } from "../chart";
import {
  type DataTableColumn,
  type DataTableRowAction,
  DataTable,
  DataTableActions,
  DataTableBulkActions,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { Button } from "../button";
import { MetricTiles } from "../metric-tiles";
import { Num } from "../numeric";
import { Status } from "../status";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import type { AddKeywordsInput, KeywordCompetitor, KeywordLocation, KeywordResult, TrackedKeyword } from "./keyword-types";
import { AddKeywordsDialog, CompetitorComparison, RankChange, RankDistribution } from "./rank-parts";
import { averagePosition, bestPosition, difficultyBand, rankDistribution, topMovers, visibilityShare } from "./rank-math";

export { AddKeywordsDialog, CompetitorComparison, RankChange, RankDistribution } from "./rank-parts";
export type { AddKeywordsDialogProps, CompetitorComparisonProps, RankChangeProps, RankDistributionProps } from "./rank-parts";
export { KEYWORD_STRINGS } from "./keyword-labels";
export type { KeywordTrackerLabels, SerpFeature } from "./keyword-labels";
export type { AddKeywordsInput, KeywordCompetitor, KeywordDevice, KeywordLocation, KeywordResult, TrackedKeyword } from "./keyword-types";
export { RANK_BUCKETS, averagePosition, bestPosition, competitorStats, ctrForPosition, difficultyBand, parseKeywordList, rankBucket, rankChange, rankDistribution, topMovers, visibilityShare } from "./rank-math";
export type { CompetitorStats, RankBucket, RankDirection, RankMovement, RankPosition } from "./rank-math";

const DIFFICULTY_VARIANT = { easy: "success", medium: "warning", hard: "danger" } as const;

export interface KeywordTrackerProps {
  keywords: readonly TrackedKeyword[];
  /** Daily figures for the history chart: `date`, `position` (average) and `top10` (count). */
  positionHistory?: readonly TimeSeriesPoint[];
  competitors?: readonly KeywordCompetitor[];
  /** Locations offered when adding keywords. Without any the add button is hidden. */
  locations?: readonly KeywordLocation[];
  defaultLocation?: string;
  onAddKeywords?: (input: AddKeywordsInput) => Promise<KeywordResult>;
  onRemoveKeywords?: (ids: string[]) => Promise<KeywordResult>;
  /** Check now: every keyword when `ids` is empty. */
  onRefresh?: (ids: string[]) => Promise<KeywordResult>;
  /** Saves an edit of the ranking URL in the table. Without it the URL is read only. */
  onUpdateKeyword?: (id: string, patch: { url: string }) => Promise<KeywordResult>;
  /** Open a keyword's results page, or its report. */
  onOpenKeyword?: (keyword: TrackedKeyword) => void;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<KeywordTrackerLabels>;
}

/**
 * Rank tracking: tiles for tracked keywords, average position, top 10 and visibility; the ranking distribution and the
 * position history; the biggest movers; a keyword table with change arrows, best, trend, ranking URL (editable),
 * volume, difficulty and SERP features; and a competitor comparison. Position is lower-is-better everywhere.
 */
export function KeywordTracker({
  keywords,
  positionHistory,
  competitors,
  locations,
  defaultLocation,
  onAddKeywords,
  onRemoveKeywords,
  onRefresh,
  onUpdateKeyword,
  onOpenKeyword,
  pageSize = 8,
  loading,
  error,
  onRetry,
  className,
  labels,
}: KeywordTrackerProps) {
  const t = useAnalyticsLabels(KEYWORD_STRINGS, labels);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [tab, setTab] = useState("keywords");

  const run = async (fn: () => Promise<KeywordResult>) => {
    setBusy(true);
    setFailed(null);
    try {
      const out = await fn();
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const now = keywords.map((k) => k.position);
    const before = keywords.map((k) => (k.previousPosition === undefined ? k.position : k.previousPosition));
    const hasPrev = keywords.some((k) => k.previousPosition !== undefined);
    const top10 = (ps: (number | null)[]) => ps.filter((p) => p !== null && p <= 10).length;
    return {
      distribution: rankDistribution(now),
      avg: averagePosition(now),
      avgPrev: hasPrev ? averagePosition(before) : undefined,
      top10: top10(now),
      top10Prev: hasPrev ? top10(before) : undefined,
      visibility: visibilityShare(keywords),
      visibilityPrev: hasPrev ? visibilityShare(keywords.map((k) => ({ volume: k.volume, position: k.previousPosition === undefined ? k.position : k.previousPosition }))) : undefined,
      movers: topMovers(keywords, 3),
    };
  }, [keywords]);

  const columns = useMemo<DataTableColumn<TrackedKeyword>[]>(
    () => [
      {
        id: "keyword",
        header: t.keyword,
        label: t.keyword,
        hideable: false,
        sortValue: (k) => k.keyword,
        searchValue: (k) => k.keyword,
        cell: (k) => (
          <span dir="auto" className="block max-w-[26ch] truncate text-label text-foreground">
            {k.keyword}
          </span>
        ),
      },
      {
        id: "position",
        header: t.position,
        label: t.position,
        align: "end",
        sortValue: (k) => k.position,
        cell: (k) => (
          <span className="inline-flex items-center justify-end gap-2">
            {k.position === null ? <span className="text-caption text-muted-foreground">{t.notRanking}</span> : <Num value={k.position} className="text-label font-semibold text-foreground" />}
            <RankChange current={k.position} previous={k.previousPosition} labels={labels} />
          </span>
        ),
      },
      {
        id: "best",
        header: t.best,
        label: t.best,
        align: "end",
        sortValue: (k) => k.best ?? bestPosition([...(k.history ?? []), k.position]),
        cell: (k) => {
          const b = k.best ?? bestPosition([...(k.history ?? []), k.position]);
          return b === null ? "-" : <Num value={b} />;
        },
      },
      {
        id: "trend",
        header: t.trend,
        label: t.trend,
        cell: (k) =>
          k.history && k.history.length > 1 ? (
            <Sparkline
              className="h-7 w-24"
              // Higher on the chart is a better rank, so the position is negated. A day without a rank sits at the bottom.
              data={k.history.map((p) => -(p ?? 101))}
              color={k.position !== null && k.previousPosition != null && k.position > k.previousPosition ? "var(--nq-danger)" : "var(--nq-success)"}
              label={`${k.keyword}: ${t.trend}`}
            />
          ) : null,
      },
      {
        id: "url",
        header: t.url,
        label: t.url,
        sortValue: (k) => k.url ?? "",
        searchValue: (k) => k.url ?? "",
        edit: onUpdateKeyword ? { type: "text", value: (k) => k.url ?? "", label: t.url, validate: (v) => (String(v).trim() === "" || /^\/|^https?:\/\//i.test(String(v).trim()) ? null : "/path or https://…") } : undefined,
        cell: (k) =>
          k.url ? (
            <bdi dir="ltr" className="block max-w-[22ch] truncate text-caption text-muted-foreground sm:max-w-[30ch]">
              {k.url}
            </bdi>
          ) : (
            <span className="text-caption text-muted-foreground">{t.urlEmpty}</span>
          ),
      },
      {
        id: "volume",
        header: t.volume,
        label: t.volume,
        align: "end",
        sortValue: (k) => k.volume,
        cell: (k) => <Num value={k.volume} format={{ notation: "compact", maximumFractionDigits: 1 }} title={t.volumePerMonth} />,
      },
      {
        id: "difficulty",
        header: t.difficulty,
        label: t.difficulty,
        sortValue: (k) => k.difficulty,
        cell: (k) => {
          const band = difficultyBand(k.difficulty);
          return (
            <Badge variant={DIFFICULTY_VARIANT[band]} title={`${t.difficultyBand[band]}`}>
              <Num value={k.difficulty} /> {t.difficultyBand[band]}
            </Badge>
          );
        },
      },
      {
        id: "features",
        header: t.features,
        label: t.features,
        cell: (k) =>
          k.features && k.features.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {k.features.map((f) => (
                <Badge key={f} variant="outline">
                  {t.feature[f] ?? f}
                </Badge>
              ))}
            </span>
          ) : null,
      },
    ],
    [t, labels, onUpdateKeyword],
  );

  const table = useDataTable({ data: [...keywords], columns, getRowId: (k) => k.id, pageSize, selectable: !!onRemoveKeywords, defaultSort: { id: "position", direction: "asc" } });

  const rowActions = (k: TrackedKeyword): DataTableRowAction[] => [
    ...(onOpenKeyword ? [{ id: "open", label: t.openSerp, icon: ExternalLink, onSelect: () => onOpenKeyword(k), group: "a" }] : []),
    ...(onRefresh ? [{ id: "refresh", label: t.refreshRow, icon: RefreshCw, onSelect: () => void run(() => onRefresh([k.id])), group: "a" }] : []),
    ...(onRemoveKeywords ? [{ id: "remove", label: t.remove, icon: Trash2, danger: true, onSelect: () => setRemoving([k.id]), group: "z" }] : []),
  ];

  const tableActions = [
    ...(onAddKeywords && locations && locations.length > 0 ? [{ id: "add", label: t.add, icon: Plus, primary: true, onSelect: () => setAdding(true) }] : []),
    ...(onRefresh ? [{ id: "refresh", label: t.refresh, icon: RefreshCw, iconOnly: true, loading: busy, onSelect: () => void run(() => onRefresh([])) }] : []),
  ];

  const seriesMetrics = useMemo(
    () => [
      { id: "position", label: t.avgPositionShort, aggregate: "avg" as const, lowerIsBetter: true, format: { minimumFractionDigits: 1, maximumFractionDigits: 1 }, color: "var(--nq-info)" },
      { id: "top10", label: t.inTop10Short, aggregate: "avg" as const, format: { maximumFractionDigits: 0 }, color: "var(--nq-success)" },
    ],
    [t],
  );

  const moverList = (rows: TrackedKeyword[], key: string, title: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-muted-foreground">{title}</span>
      {rows.length === 0 ? (
        <span className="text-caption text-muted-foreground">{t.noMovers}</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((k) => (
            <li key={`${key}-${k.id}`} className="flex items-center justify-between gap-2 text-body-sm">
              <span dir="auto" className="min-w-0 truncate text-foreground">
                {k.keyword}
              </span>
              <RankChange current={k.position} previous={k.previousPosition} labels={labels} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div data-slot="keyword-tracker" className={cn("flex w-full flex-col gap-6", className)}>
      <MetricTiles
        metrics={[
          { id: "tracked", label: t.tracked, value: keywords.length },
          { id: "avg", label: t.avgPosition, value: stats.avg ?? 0, previous: stats.avgPrev ?? undefined, invert: true, format: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
          { id: "top10", label: t.inTop10, value: stats.top10, previous: stats.top10Prev },
          { id: "visibility", label: t.visibility, value: stats.visibility, previous: stats.visibilityPrev, format: { style: "percent", maximumFractionDigits: 1 } },
        ]}
        comparisonLabel={t.comparison}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {positionHistory ? (
          <TimeSeriesPanel
            className="lg:col-span-2"
            title={t.historyTitle}
            description={t.historyDescription}
            metrics={seriesMetrics}
            data={positionHistory}
            defaultMetric="position"
            loading={loading}
            defaultCompare={false}
          />
        ) : null}
        <div className={cn("flex flex-col gap-4", positionHistory ? "" : "lg:col-span-3 lg:grid lg:grid-cols-2")}>
          <RankDistribution distribution={stats.distribution} labels={labels} />
          <Card data-slot="keyword-movers">
            <CardHeader>
              <CardTitle as="h3">{t.moversTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {moverList(stats.movers.gainers, "g", t.gainers)}
              {moverList(stats.movers.losers, "l", t.losers)}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="keywords">{t.tabKeywords}</TabsTab>
          {competitors ? <TabsTab value="competitors">{t.tabCompetitors}</TabsTab> : null}
        </TabsList>
        <TabsPanel value="keywords" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">{t.keywordsTitle}</CardTitle>
              <CardDescription>{t.keywordsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DataTableToolbar>
                <DataTableSearch table={table} placeholder={t.filter} />
                {tableActions.length > 0 ? <DataTableActions actions={tableActions} /> : null}
              </DataTableToolbar>
              {onRemoveKeywords ? (
                <DataTableBulkActions table={table}>
                  <Button size="sm" variant="secondary" onClick={() => setRemoving([...table.selection])}>
                    <Trash2 aria-hidden />
                    {t.remove}
                  </Button>
                </DataTableBulkActions>
              ) : null}
              {failed ? (
                <Status tone="danger" role="alert">
                  {failed}
                </Status>
              ) : null}
              <DataTable
                table={table}
                label={t.keywordsTitle}
                loading={loading}
                error={error}
                onRetry={onRetry}
                empty={t.empty}
                rowActions={rowActions}
                onRowClick={onOpenKeyword}
                onCellEdit={onUpdateKeyword ? (row, _col, value) => onUpdateKeyword(row.id, { url: String(value).trim() }) : undefined}
              />
              {keywords.length > pageSize ? <DataTablePagination table={table} /> : null}
            </CardContent>
          </Card>
        </TabsPanel>
        {competitors ? (
          <TabsPanel value="competitors" className="pt-4">
            <CompetitorComparison keywords={keywords} competitors={competitors} labels={labels} />
          </TabsPanel>
        ) : null}
      </Tabs>

      {locations && onAddKeywords ? <AddKeywordsDialog open={adding} onOpenChange={setAdding} locations={locations} defaultLocation={defaultLocation} onAdd={onAddKeywords} labels={labels} /> : null}

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle(removing?.length ?? 0)}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = removing ?? [];
                setRemoving(null);
                table.setSelection(new Set());
                if (onRemoveKeywords) void run(() => onRemoveKeywords(ids));
              }}
            >
              {t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
