<script setup lang="ts">
import { ExternalLink, ListChecks, RefreshCw, Send } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime, NqNum } from "../numeric";
import { NqMeter } from "../progress";
import { useNasaq } from "../../provider";
import { NqStatus } from "../status";
import { formatVital, rateVital, type VitalRating } from "../web-vital-gauge";
import { SEO_PAGES_STRINGS, type SeoPagesLabels } from "./seo-labels";
import { issueCounts, scoreBand, seoScore, type ScoreBand, type SeoIndexStatus, type SeoIssue } from "./seo-pages-math";
import type { SeoIssueKind } from "./seo-issue-catalog";

// The SEO pages table: score, open issues by severity, index status and Core Web Vitals per page, sortable and filterable by
// index status. Row actions (also on context-click) open the checklist, crawl again and request indexing.

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

const props = withDefaults(
  defineProps<{
    pages: readonly SeoPageRow[];
    /** Open a page's issue checklist. Also the row's first context action. */
    onOpen?: (page: SeoPageRow) => void;
    onRecrawl?: (page: SeoPageRow) => Promise<Result>;
    onRequestIndexing?: (page: SeoPageRow) => Promise<Result>;
    /** Accepted for symmetry with the checklist; the list only counts issues. */
    catalog?: Record<string, SeoIssueKind>;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<SeoPagesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onOpen: undefined, onRecrawl: undefined, onRequestIndexing: undefined, catalog: undefined, title: undefined, description: undefined, pageSize: 8, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(SEO_PAGES_STRINGS, () => props.labels);
const nq = useNasaq();
const busy = ref<Set<string>>(new Set());
const failed = ref<string | null>(null);

async function run(key: string, fn: () => Promise<Result>) {
  busy.value = new Set(busy.value).add(key);
  failed.value = null;
  try {
    const out = await fn();
    if (out && out.error) failed.value = out.error;
  } catch {
    failed.value = t.value.actionsFailed;
  } finally {
    const n = new Set(busy.value);
    n.delete(key);
    busy.value = n;
  }
}

function scoreCell(score: number) {
  const band = scoreBand(score);
  const tt = t.value;
  return h("div", { class: "flex w-24 flex-col gap-1", "data-band": band }, [
    h("span", { class: cn("text-label font-semibold", BAND_TEXT[band]) }, [h(NqNum, { value: score }), " ", h("span", { class: "text-caption font-normal text-muted-foreground" }, tt[band])]),
    h(NqMeter, { value: score, max: 100, tone: BAND_TONE[band], size: "sm", "aria-label": tt.scoreOf(score), showValue: false }),
  ]);
}

const columns = computed<DataTableColumn<SeoPageRow>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "page",
      header: tt.page,
      label: tt.page,
      hideable: false,
      sortValue: (p) => p.url,
      searchValue: (p) => `${p.url} ${p.title ?? ""}`,
      cell: (p) =>
        h("div", { class: "flex min-w-0 max-w-[32ch] flex-col sm:max-w-[44ch]" }, [
          p.title ? h("span", { dir: "auto", class: "truncate text-label text-foreground" }, p.title) : null,
          h("bdi", { dir: "ltr", class: "block truncate text-caption text-muted-foreground" }, p.url),
        ]),
    },
    { id: "score", header: tt.score, label: tt.score, sortValue: (p) => seoScore(p.issues), cell: (p) => scoreCell(seoScore(p.issues)) },
    {
      id: "issues",
      header: tt.issues,
      label: tt.issues,
      sortValue: (p) => issueCounts(p.issues).total,
      cell: (p) => {
        const c = issueCounts(p.issues);
        if (c.total === 0) return h(NqStatus, { tone: "success" }, () => tt.noIssues);
        return h("div", { class: "flex flex-wrap gap-1" }, [
          c.error > 0 ? h(NqBadge, { variant: "danger" }, () => tt.errors(c.error)) : null,
          c.warning > 0 ? h(NqBadge, { variant: "warning" }, () => tt.warnings(c.warning)) : null,
          c.info > 0 ? h(NqBadge, { variant: "info" }, () => tt.notices(c.info)) : null,
        ]);
      },
    },
    {
      id: "index",
      header: tt.index,
      label: tt.index,
      sortValue: (p) => p.indexStatus,
      filterValue: (p) => p.indexStatus,
      cell: (p) => h(NqStatus, { tone: INDEX_TONE[p.indexStatus] }, () => tt[p.indexStatus]),
    },
    {
      id: "vitals",
      header: tt.vitals,
      label: tt.vitals,
      cell: (p) => {
        const entries = (["LCP", "INP", "CLS"] as const).filter((m) => p.vitals?.[m] !== undefined);
        if (entries.length === 0) return h("span", { class: "text-caption text-muted-foreground" }, tt.noVitals);
        return h(
          "div",
          { class: "flex flex-wrap gap-1" },
          entries.map((m) => {
            const rating = rateVital(m, p.vitals![m]!);
            return h(NqBadge, { key: m, variant: RATING_VARIANT[rating], title: `${tt.vital[m]}: ${tt.rating[rating]}` }, () => h("bdi", `${tt.vital[m]} ${formatVital(m, p.vitals![m]!, nq.locale.value)}`));
          }),
        );
      },
    },
    {
      id: "crawled",
      header: tt.crawled,
      label: tt.crawled,
      align: "end",
      sortValue: (p) => (p.lastCrawled === undefined ? null : new Date(p.lastCrawled)),
      cell: (p) => (p.lastCrawled === undefined ? null : h(NqDateTime, { value: p.lastCrawled, relative: true, class: "text-caption text-muted-foreground" })),
    },
  ];
});

const table = useDataTable<SeoPageRow>({
  data: () => [...props.pages],
  columns,
  getRowId: (p) => p.id,
  pageSize: props.pageSize,
  defaultSort: { id: "score", direction: "asc" },
});

function rowActions(p: SeoPageRow): DataTableRowAction[] {
  const tt = t.value;
  return [
    ...(props.onOpen ? [{ id: "issues", label: tt.viewIssues, icon: ListChecks, onSelect: () => props.onOpen!(p), group: "open" }] : []),
    { id: "open", label: tt.openPage, icon: ExternalLink, onSelect: () => window.open(p.url, "_blank", "noopener,noreferrer"), group: "open" },
    ...(props.onRecrawl ? [{ id: "recrawl", label: tt.recrawl, icon: RefreshCw, disabled: busy.value.has(`c-${p.id}`), onSelect: () => void run(`c-${p.id}`, () => props.onRecrawl!(p)), group: "crawl" }] : []),
    ...(props.onRequestIndexing && p.indexStatus !== "indexed" && p.indexStatus !== "blocked"
      ? [{ id: "index", label: tt.requestIndexing, icon: Send, disabled: busy.value.has(`i-${p.id}`), onSelect: () => void run(`i-${p.id}`, () => props.onRequestIndexing!(p)), group: "crawl" }]
      : []),
  ];
}
</script>

<template>
  <NqCard data-slot="seo-page-list" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3"><slot name="title">{{ props.title ?? t.pagesTitle }}</slot></NqCardTitle>
      <NqCardDescription><slot name="description">{{ props.description ?? t.pagesDescription }}</slot></NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.filter" />
        <NqDataTableFacetFilter
          :table="table"
          column="index"
          :title="t.index"
          :options="[
            { value: 'indexed', label: t.indexed },
            { value: 'pending', label: t.pending },
            { value: 'not-indexed', label: t['not-indexed'] },
            { value: 'blocked', label: t.blocked },
          ]"
        />
      </NqDataTableToolbar>
      <NqAlert v-if="failed" tone="danger">{{ failed }}</NqAlert>
      <NqDataTable
        :table="table"
        :label="t.pagesTitle"
        :row-label="(p: SeoPageRow) => p.title ?? p.url"
        :loading="props.loading"
        :error="props.error"
        :on-retry="props.onRetry"
        :labels="{ empty: t.empty }"
        :row-actions="rowActions"
        :on-row-click="props.onOpen"
      />
      <NqDataTablePagination v-if="props.pages.length > props.pageSize" :table="table" />
    </NqCardContent>
  </NqCard>
</template>
