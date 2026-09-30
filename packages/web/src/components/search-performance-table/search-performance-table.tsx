"use client";

import { type ReactNode, useMemo } from "react";
import { cn } from "../../lib/cn";
import { changeRatio, clickThroughRate, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, DataTable, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Num } from "../numeric";

const STRINGS = {
  en: {
    query: "Query",
    page: "Page",
    clicks: "Clicks",
    impressions: "Impressions",
    ctr: "CTR",
    position: "Position",
    searchQueries: "Search queries",
    searchPages: "Search pages",
    filterQueries: "Filter queries…",
    filterPages: "Filter pages…",
    empty: "No search data for this period",
    lowerIsBetter: "Lower is better",
  },
  ar: {
    query: "عبارة البحث",
    page: "الصفحة",
    clicks: "النقرات",
    impressions: "مرات الظهور",
    ctr: "نسبة النقر",
    position: "الترتيب",
    searchQueries: "عبارات البحث",
    searchPages: "صفحات البحث",
    filterQueries: "تصفية العبارات…",
    filterPages: "تصفية الصفحات…",
    empty: "لا بيانات بحث لهذه الفترة",
    lowerIsBetter: "الأقل أفضل",
  },
};

export type SearchPerformanceTableLabels = typeof STRINGS.en;

export interface SearchPerformanceRow {
  id: string;
  /** The query text or the page URL. */
  label: string;
  clicks: number;
  impressions: number;
  /** Click-through rate as a fraction. Default: clicks divided by impressions. */
  ctr?: number;
  /** Average position in the results, 1 is the top. */
  position: number;
  /** Clicks in the previous period. Shows the change under the clicks. */
  previousClicks?: number;
  /** Average position in the previous period. A lower number is an improvement. */
  previousPosition?: number;
}

export interface SearchPerformanceTableProps {
  rows: readonly SearchPerformanceRow[];
  /** "query" for search terms, "page" for URLs (shown left-to-right, with a "Page" heading). Default "query". */
  kind?: "query" | "page";
  title?: ReactNode;
  description?: ReactNode;
  /** Rows per page. Default 10. */
  pageSize?: number;
  /** Open a row: for example the query or page report. */
  onRowClick?: (row: SearchPerformanceRow) => void;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<SearchPerformanceTableLabels>;
}

const tone = (good: boolean | undefined) => (good === undefined ? "text-muted-foreground" : good ? "text-nq-success-text" : "text-nq-danger-text");

/**
 * The Search Console performance table: a query or page with clicks, impressions, CTR and average position, sortable and
 * searchable, each with its change against the previous period. Position is "lower is better" and toned that way.
 */
export function SearchPerformanceTable({ rows, kind = "query", title, description, pageSize = 10, onRowClick, loading, error, onRetry, className, labels }: SearchPerformanceTableProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const columns = useMemo<DataTableColumn<SearchPerformanceRow>[]>(
    () => [
      {
        id: "label",
        header: kind === "query" ? t.query : t.page,
        label: kind === "query" ? t.query : t.page,
        cell: (r) =>
          kind === "page" ? (
            <bdi dir="ltr" className="block max-w-[28ch] truncate sm:max-w-[48ch]">
              {r.label}
            </bdi>
          ) : (
            <span className="block max-w-[28ch] truncate sm:max-w-[40ch]" dir="auto">
              {r.label}
            </span>
          ),
        sortValue: (r) => r.label,
        searchValue: (r) => r.label,
      },
      {
        id: "clicks",
        header: t.clicks,
        label: t.clicks,
        align: "end",
        sortValue: (r) => r.clicks,
        cell: (r) => {
          const d = changeRatio(r.clicks, r.previousClicks);
          return (
            <div className="flex flex-col items-end">
              <Num value={r.clicks} />
              {d !== undefined ? <Num value={d} format={{ style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }} className={cn("text-caption", tone(d === 0 ? undefined : d > 0))} /> : null}
            </div>
          );
        },
      },
      { id: "impressions", header: t.impressions, label: t.impressions, align: "end", sortValue: (r) => r.impressions, cell: (r) => <Num value={r.impressions} /> },
      {
        id: "ctr",
        header: t.ctr,
        label: t.ctr,
        align: "end",
        sortValue: (r) => r.ctr ?? clickThroughRate(r.clicks, r.impressions),
        cell: (r) => <Num value={r.ctr ?? clickThroughRate(r.clicks, r.impressions)} format={{ style: "percent", maximumFractionDigits: 1 }} />,
      },
      {
        id: "position",
        header: t.position,
        label: t.position,
        align: "end",
        sortValue: (r) => r.position,
        cell: (r) => {
          const diff = r.previousPosition === undefined ? undefined : r.position - r.previousPosition;
          return (
            <div className="flex flex-col items-end" title={t.lowerIsBetter}>
              <Num value={r.position} format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }} />
              {diff !== undefined && Math.abs(diff) >= 0.05 ? (
                <Num value={diff} format={{ maximumFractionDigits: 1, signDisplay: "exceptZero" }} className={cn("text-caption", tone(diff < 0))} />
              ) : null}
            </div>
          );
        },
      },
    ],
    [kind, t],
  );

  const table = useDataTable({
    data: [...rows],
    columns,
    getRowId: (r) => r.id,
    pageSize,
    defaultSort: { id: "clicks", direction: "desc" },
  });

  return (
    <Card data-slot="search-performance-table" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? (kind === "query" ? t.searchQueries : t.searchPages)}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={kind === "query" ? t.filterQueries : t.filterPages} />
        </DataTableToolbar>
        <DataTable
          table={table}
          label={kind === "query" ? t.searchQueries : t.searchPages}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={t.empty}
          onRowClick={onRowClick}
        />
        {pageSize && rows.length > pageSize ? <DataTablePagination table={table} /> : null}
      </CardContent>
    </Card>
  );
}
