"use client";

import { CircleAlert, ExternalLink, ListChecks, RefreshCw, Send, TriangleAlert, Info } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "../collapsible";
import {
  type DataTableColumn,
  type DataTableRowAction,
  DataTable,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { DateTime, Num } from "../numeric";
import { Meter } from "../progress";
import { Status } from "../status";
import { EmptyState } from "../states";
import { formatVital } from "../web-vital-gauge/web-vital-gauge";
import { type VitalRating, type WebVitalId, rateVital } from "../web-vital-gauge/web-vitals-math";
import { SEO_ISSUE_CATALOG, type SeoIssueKind } from "./seo-issue-catalog";
import { type ScoreBand, type SeoIndexStatus, type SeoIssue, type SeoSeverity, issueCounts, scoreBand, seoScore, sortIssues } from "./seo-pages-math";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

export { SEO_ISSUE_CATALOG } from "./seo-issue-catalog";
export type { SeoIssueKind, SeoIssueText } from "./seo-issue-catalog";
export { SEVERITY_WEIGHT, issueCounts, openIssues, scoreBand, seoScore, siteScore, sortIssues } from "./seo-pages-math";
export type { IssueCounts, ScoreBand, SeoIndexStatus, SeoIssue, SeoSeverity } from "./seo-pages-math";

const STRINGS = {
  en: {
    pagesTitle: "Pages",
    pagesDescription: "Every crawled page with its SEO score, open issues, index status and Core Web Vitals.",
    page: "Page",
    score: "Score",
    issues: "Issues",
    index: "Index status",
    vitals: "Vitals",
    crawled: "Last crawled",
    filter: "Filter pages…",
    empty: "No pages crawled yet",
    noIssues: "No issues",
    indexed: "Indexed",
    "not-indexed": "Not indexed",
    blocked: "Blocked",
    pending: "Pending",
    viewIssues: "View issues",
    recrawl: "Crawl again",
    requestIndexing: "Request indexing",
    openPage: "Open page",
    actionsFailed: "Could not complete this. Try again.",
    errors: (n: number) => (n === 1 ? "1 error" : `${n} errors`),
    warnings: (n: number) => (n === 1 ? "1 warning" : `${n} warnings`),
    notices: (n: number) => (n === 1 ? "1 notice" : `${n} notices`),
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    scoreOf: (n: number) => `SEO score ${n} of 100`,
    checklistTitle: "Issues to fix",
    checklistDescription: (n: number) => (n === 0 ? "Everything on this page is fixed." : n === 1 ? "1 issue is open." : `${n} issues are open.`),
    severity: { error: "Error", warning: "Warning", info: "Notice" } as Record<SeoSeverity, string>,
    fixed: "Fixed",
    markFixed: (title: string) => `Mark "${title}" as fixed`,
    why: "Why it matters",
    howToFix: "How to fix",
    allFixed: "Nothing to fix",
    allFixedBody: "This page has no open issues.",
    vital: { LCP: "LCP", INP: "INP", CLS: "CLS", FCP: "FCP", TTFB: "TTFB" } as Record<WebVitalId, string>,
    rating: { good: "good", "needs-improvement": "needs improvement", poor: "poor" } as Record<VitalRating, string>,
    noVitals: "No field data",
  },
  ar: {
    pagesTitle: "الصفحات",
    pagesDescription: "كل صفحة تم زحفها مع درجة SEO والمشكلات المفتوحة وحالة الفهرسة ومؤشرات الويب الأساسية.",
    page: "الصفحة",
    score: "الدرجة",
    issues: "المشكلات",
    index: "حالة الفهرسة",
    vitals: "المؤشرات",
    crawled: "آخر زحف",
    filter: "تصفية الصفحات…",
    empty: "لم يتم زحف أي صفحة بعد",
    noIssues: "لا مشكلات",
    indexed: "مفهرسة",
    "not-indexed": "غير مفهرسة",
    blocked: "محجوبة",
    pending: "قيد الانتظار",
    viewIssues: "عرض المشكلات",
    recrawl: "زحف مرة أخرى",
    requestIndexing: "طلب الفهرسة",
    openPage: "فتح الصفحة",
    actionsFailed: "تعذّر إكمال هذا. حاول مرة أخرى.",
    errors: (n: number) => (n === 1 ? "خطأ واحد" : `${n} أخطاء`),
    warnings: (n: number) => (n === 1 ? "تحذير واحد" : `${n} تحذيرات`),
    notices: (n: number) => (n === 1 ? "ملاحظة واحدة" : `${n} ملاحظات`),
    good: "جيدة",
    fair: "مقبولة",
    poor: "ضعيفة",
    scoreOf: (n: number) => `درجة SEO ${n} من 100`,
    checklistTitle: "مشكلات للإصلاح",
    checklistDescription: (n: number) => (n === 0 ? "تم إصلاح كل شيء في هذه الصفحة." : n === 1 ? "مشكلة واحدة مفتوحة." : `${n} مشكلات مفتوحة.`),
    severity: { error: "خطأ", warning: "تحذير", info: "ملاحظة" } as Record<SeoSeverity, string>,
    fixed: "تم الإصلاح",
    markFixed: (title: string) => `تعليم «${title}» كمُصلَح`,
    why: "لماذا يهم",
    howToFix: "كيف تصلحها",
    allFixed: "لا شيء للإصلاح",
    allFixedBody: "لا توجد مشكلات مفتوحة في هذه الصفحة.",
    vital: { LCP: "LCP", INP: "INP", CLS: "CLS", FCP: "FCP", TTFB: "TTFB" } as Record<WebVitalId, string>,
    rating: { good: "جيد", "needs-improvement": "يحتاج تحسينًا", poor: "ضعيف" } as Record<VitalRating, string>,
    noVitals: "لا بيانات ميدانية",
  },
};

export type SeoPagesLabels = typeof STRINGS.en;

export interface SeoPageRow {
  id: string;
  /** The page URL. Shown left-to-right. */
  url: string;
  /** The page's title tag, when it has one. */
  title?: string;
  indexStatus: SeoIndexStatus;
  issues: readonly SeoIssue[];
  /** 75th percentile field data: LCP and INP in milliseconds, CLS unitless. */
  vitals?: Partial<Record<"LCP" | "INP" | "CLS", number>>;
  lastCrawled?: string | number | Date;
}

type Result = void | { error?: string };

const INDEX_TONE: Record<SeoIndexStatus, "success" | "warning" | "danger" | "info"> = { indexed: "success", "not-indexed": "warning", blocked: "danger", pending: "info" };
const BAND_TEXT: Record<ScoreBand, string> = { good: "text-nq-success-text", fair: "text-nq-warning-text", poor: "text-nq-danger-text" };
const BAND_TONE: Record<ScoreBand, "success" | "warning" | "danger"> = { good: "success", fair: "warning", poor: "danger" };
const RATING_VARIANT: Record<VitalRating, "success" | "warning" | "danger"> = { good: "success", "needs-improvement": "warning", poor: "danger" };
const SEVERITY_ICON = { error: CircleAlert, warning: TriangleAlert, info: Info } as const;
const SEVERITY_VARIANT: Record<SeoSeverity, "danger" | "warning" | "info"> = { error: "danger", warning: "warning", info: "info" };

function useIssueText(catalog?: Record<string, SeoIssueKind>) {
  const ar = useAnalyticsAr();
  const all = catalog ? { ...SEO_ISSUE_CATALOG, ...catalog } : SEO_ISSUE_CATALOG;
  return (code: string) => {
    const kind = all[code];
    return kind ? kind[ar ? "ar" : "en"] : { title: code, why: "", fix: "" };
  };
}

/* ------------------------------------------------------------------ score */

/** A page's score: the number toned by its band, with the bar under it. */
function ScoreCell({ score, t }: { score: number; t: SeoPagesLabels }) {
  const band = scoreBand(score);
  return (
    <div className="flex w-24 flex-col gap-1" data-band={band}>
      <span className={cn("text-label font-semibold", BAND_TEXT[band])}>
        <Num value={score} /> <span className="text-caption font-normal text-muted-foreground">{t[band]}</span>
      </span>
      <Meter value={score} max={100} tone={BAND_TONE[band]} size="sm" aria-label={t.scoreOf(score)} showValue={false} />
    </div>
  );
}

/* ------------------------------------------------------------------ pages list */

export interface SeoPageListProps {
  pages: readonly SeoPageRow[];
  /** Open a page's issue checklist. Also the row's first context action. */
  onOpen?: (page: SeoPageRow) => void;
  onRecrawl?: (page: SeoPageRow) => Promise<Result>;
  onRequestIndexing?: (page: SeoPageRow) => Promise<Result>;
  /** Extra or replaced issue texts, by code. */
  catalog?: Record<string, SeoIssueKind>;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<SeoPagesLabels>;
}

/**
 * The SEO pages table: score, open issues by severity, index status and Core Web Vitals per page, sortable and
 * filterable by index status. Row actions (also on context-click) open the checklist, crawl again and request indexing.
 */
export function SeoPageList({ pages, onOpen, onRecrawl, onRequestIndexing, title, description, pageSize = 8, loading, error, onRetry, className, labels }: SeoPageListProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<Result>) => {
    setBusy((b) => new Set(b).add(key));
    setFailed(null);
    try {
      const out = await fn();
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.actionsFailed);
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(key);
        return n;
      });
    }
  };

  const columns = useMemo<DataTableColumn<SeoPageRow>[]>(
    () => [
      {
        id: "page",
        header: t.page,
        label: t.page,
        hideable: false,
        sortValue: (p) => p.url,
        searchValue: (p) => `${p.url} ${p.title ?? ""}`,
        cell: (p) => (
          <div className="flex min-w-0 max-w-[32ch] flex-col sm:max-w-[44ch]">
            {p.title ? (
              <span dir="auto" className="truncate text-label text-foreground">
                {p.title}
              </span>
            ) : null}
            <bdi dir="ltr" className="block truncate text-caption text-muted-foreground">
              {p.url}
            </bdi>
          </div>
        ),
      },
      { id: "score", header: t.score, label: t.score, sortValue: (p) => seoScore(p.issues), cell: (p) => <ScoreCell score={seoScore(p.issues)} t={t} /> },
      {
        id: "issues",
        header: t.issues,
        label: t.issues,
        sortValue: (p) => issueCounts(p.issues).total,
        cell: (p) => {
          const c = issueCounts(p.issues);
          if (c.total === 0) return <Status tone="success">{t.noIssues}</Status>;
          return (
            <div className="flex flex-wrap gap-1">
              {c.error > 0 ? <Badge variant="danger">{t.errors(c.error)}</Badge> : null}
              {c.warning > 0 ? <Badge variant="warning">{t.warnings(c.warning)}</Badge> : null}
              {c.info > 0 ? <Badge variant="info">{t.notices(c.info)}</Badge> : null}
            </div>
          );
        },
      },
      {
        id: "index",
        header: t.index,
        label: t.index,
        sortValue: (p) => p.indexStatus,
        filterValue: (p) => p.indexStatus,
        cell: (p) => <Status tone={INDEX_TONE[p.indexStatus]}>{t[p.indexStatus]}</Status>,
      },
      {
        id: "vitals",
        header: t.vitals,
        label: t.vitals,
        defaultHidden: false,
        cell: (p) => {
          const entries = (["LCP", "INP", "CLS"] as const).filter((m) => p.vitals?.[m] !== undefined);
          if (entries.length === 0) return <span className="text-caption text-muted-foreground">{t.noVitals}</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {entries.map((m) => {
                const rating = rateVital(m, p.vitals![m]!);
                return (
                  <Badge key={m} variant={RATING_VARIANT[rating]} title={`${t.vital[m]}: ${t.rating[rating]}`}>
                    <bdi>
                      {t.vital[m]} {formatVital(m, p.vitals![m]!, locale)}
                    </bdi>
                  </Badge>
                );
              })}
            </div>
          );
        },
      },
      {
        id: "crawled",
        header: t.crawled,
        label: t.crawled,
        align: "end",
        sortValue: (p) => (p.lastCrawled === undefined ? null : new Date(p.lastCrawled)),
        cell: (p) => (p.lastCrawled === undefined ? null : <DateTime value={p.lastCrawled} relative className="text-caption text-muted-foreground" />),
      },
    ],
    [t, locale],
  );

  const table = useDataTable({ data: [...pages], columns, getRowId: (p) => p.id, pageSize, defaultSort: { id: "score", direction: "asc" } });

  const rowActions = (p: SeoPageRow): DataTableRowAction[] => [
    ...(onOpen ? [{ id: "issues", label: t.viewIssues, icon: ListChecks, onSelect: () => onOpen(p), group: "open" }] : []),
    { id: "open", label: t.openPage, icon: ExternalLink, onSelect: () => window.open(p.url, "_blank", "noopener,noreferrer"), group: "open" },
    ...(onRecrawl ? [{ id: "recrawl", label: t.recrawl, icon: RefreshCw, disabled: busy.has(`c-${p.id}`), onSelect: () => void run(`c-${p.id}`, () => onRecrawl(p)), group: "crawl" }] : []),
    ...(onRequestIndexing && p.indexStatus !== "indexed" && p.indexStatus !== "blocked"
      ? [{ id: "index", label: t.requestIndexing, icon: Send, disabled: busy.has(`i-${p.id}`), onSelect: () => void run(`i-${p.id}`, () => onRequestIndexing(p)), group: "crawl" }]
      : []),
  ];

  return (
    <Card data-slot="seo-page-list" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.pagesTitle}</CardTitle>
        <CardDescription>{description ?? t.pagesDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.filter} />
          <DataTableFacetFilter
            table={table}
            column="index"
            title={t.index}
            options={(["indexed", "pending", "not-indexed", "blocked"] as const).map((v) => ({ value: v, label: t[v] }))}
          />
        </DataTableToolbar>
        {failed ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {failed}
          </p>
        ) : null}
        <DataTable
          table={table}
          label={t.pagesTitle}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={t.empty}
          rowActions={rowActions}
          onRowClick={onOpen}
        />
        {pages.length > pageSize ? <DataTablePagination table={table} /> : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ issue checklist */

export interface SeoIssueChecklistProps {
  issues: readonly SeoIssue[];
  /** The page these issues belong to, shown under the title. */
  url?: string;
  /** Mark an issue fixed or open again. The checkbox shows the new state while this is pending. */
  onToggleFixed?: (issue: SeoIssue, fixed: boolean) => Promise<Result>;
  catalog?: Record<string, SeoIssueKind>;
  title?: ReactNode;
  className?: string;
  labels?: Partial<SeoPagesLabels>;
}

/**
 * The issues of one page as a checklist, most severe first. Each has what is wrong, why it matters and how to fix it
 * (expandable), and a checkbox to mark it fixed. The score and counts update with the checkboxes.
 */
export function SeoIssueChecklist({ issues, url, onToggleFixed, catalog, title, className, labels }: SeoIssueChecklistProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const text = useIssueText(catalog);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const shown = issues.map((i) => (i.id in pending ? { ...i, fixed: pending[i.id] } : i));
  const score = seoScore(shown);
  const band = scoreBand(score);
  const open = issueCounts(shown).total;

  const toggle = async (issue: SeoIssue, fixed: boolean) => {
    if (!onToggleFixed) return;
    setPending((p) => ({ ...p, [issue.id]: fixed }));
    setFailed(null);
    let out: Result = undefined;
    try {
      out = await onToggleFixed(issue, fixed);
    } catch {
      out = { error: t.actionsFailed };
    }
    setPending((p) => {
      const { [issue.id]: _drop, ...rest } = p;
      return rest;
    });
    if (out && out.error) setFailed(out.error);
  };

  return (
    <Card data-slot="seo-issue-checklist" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.checklistTitle}</CardTitle>
        <CardDescription>
          {url ? (
            <bdi dir="ltr" className="block truncate">
              {url}
            </bdi>
          ) : null}
          {t.checklistDescription(open)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3" data-band={band}>
          <span className={cn("text-h3 font-semibold tabular-nums", BAND_TEXT[band])}>
            <Num value={score} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-caption text-muted-foreground">{t.scoreOf(score)}</span>
            <Meter value={score} max={100} tone={BAND_TONE[band]} size="sm" aria-label={t.scoreOf(score)} showValue={false} />
          </div>
        </div>
        {failed ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {failed}
          </p>
        ) : null}
        {shown.length === 0 ? (
          <EmptyState icon={ListChecks} title={t.allFixed} description={t.allFixedBody} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
            {sortIssues(shown).map((issue) => {
              const info = text(issue.code);
              const Icon = SEVERITY_ICON[issue.severity];
              return (
                <li key={issue.id} data-severity={issue.severity} data-fixed={issue.fixed ? "" : undefined} className="flex flex-col gap-2 p-3">
                  <Collapsible>
                    <div className="flex items-start gap-3">
                      <Checkbox className="mt-0.5" checked={!!issue.fixed} disabled={!onToggleFixed} onCheckedChange={(v) => void toggle(issue, !!v)} aria-label={t.markFixed(info.title)} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span dir="auto" className={cn("text-label text-foreground", issue.fixed && "text-muted-foreground line-through")}>
                            {info.title}
                          </span>
                          <Badge variant={issue.fixed ? "success" : SEVERITY_VARIANT[issue.severity]}>
                            <Icon aria-hidden />
                            {issue.fixed ? t.fixed : t.severity[issue.severity]}
                          </Badge>
                        </div>
                        {issue.detail ? (
                          <p dir="auto" className="text-body-sm text-muted-foreground">
                            {issue.detail}
                          </p>
                        ) : null}
                        <CollapsibleTrigger className="w-fit text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground">{t.howToFix}</CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsiblePanel>
                      <dl className="mt-2 flex flex-col gap-2 ps-7 text-body-sm">
                        <div>
                          <dt className="text-caption font-medium text-muted-foreground">{t.why}</dt>
                          <dd dir="auto" className="text-foreground">
                            {info.why}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-caption font-medium text-muted-foreground">{t.howToFix}</dt>
                          <dd dir="auto" className="text-foreground">
                            {info.fix}
                          </dd>
                        </div>
                      </dl>
                    </CollapsiblePanel>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
