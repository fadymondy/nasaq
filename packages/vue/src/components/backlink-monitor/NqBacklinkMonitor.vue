<script setup lang="ts">
import { ShieldCheck, ShieldOff } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqMetricTiles } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatus } from "../status";
import { NqTimeSeriesPanel } from "../time-series-panel";
import { backlinkStatus, dailyLinkSeries, domainOf, isToxic, summarizeBacklinks, type BacklinkStatus } from "./backlink-math";

// Backlink monitor: tiles for referring domains, live, new, lost and toxic links, a gained-versus-lost chart, and a table
// you can filter by status or toxicity. Toxic links get "Disavow" and "Mark as safe" row actions (also the context menu).

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

const props = withDefaults(
  defineProps<{
    links: readonly Backlink[];
    /** Tells search engines to ignore these links. Without it the action is hidden. */
    onDisavow?: (ids: string[]) => Promise<Result>;
    /** Marks a flagged link as safe (clears the toxic flag). Without it the action is hidden. */
    onMarkSafe?: (id: string) => Promise<Result>;
    /** "Now" for the new-this-week and chart windows. Default: the current time. Pass a fixed value in tests and demos. */
    now?: number;
    /** Days on the gained/lost chart. Default 30. */
    days?: number;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<BacklinkMonitorLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onDisavow: undefined, onMarkSafe: undefined, now: undefined, days: 30, title: undefined, description: undefined, pageSize: 8, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const failed = ref<string | null>(null);
const clock = computed(() => props.now ?? Date.now());

const summary = computed(() => summarizeBacklinks(props.links, clock.value));
const series = computed(() => dailyLinkSeries(props.links, props.days, clock.value).map((d) => ({ date: d.date, gained: d.gained, lost: d.lost })));

async function run(fn: () => Promise<Result>) {
  failed.value = null;
  try {
    const out = await fn();
    if (out && out.error) failed.value = out.error;
  } catch {
    failed.value = t.value.failed;
  }
}

const statusLabel = computed<Record<BacklinkStatus, string>>(() => ({ new: t.value.statusNew, lost: t.value.statusLost, active: t.value.statusActive }));
const flag = (l: Backlink): string => (l.lostAt ? "lost" : isToxic(l) ? "toxic" : backlinkStatus(l, clock.value));

const columns = computed<DataTableColumn<Backlink>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "source",
      header: tt.source,
      label: tt.source,
      hideable: false,
      sortValue: (l) => domainOf(l.sourceUrl),
      searchValue: (l) => `${l.sourceUrl} ${l.anchor} ${l.targetUrl}`,
      cell: (l) =>
        h("span", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "block max-w-[26ch] truncate text-label text-foreground" }, domainOf(l.sourceUrl)),
          h("bdi", { dir: "ltr", class: "block max-w-[26ch] truncate text-caption text-muted-foreground" }, l.sourceUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"),
        ]),
    },
    {
      id: "anchor",
      header: tt.anchor,
      label: tt.anchor,
      sortValue: (l) => l.anchor,
      cell: (l) => h("span", { dir: "auto", class: "block max-w-[18ch] truncate text-body-sm" }, l.anchor || tt.noAnchor),
    },
    {
      id: "target",
      header: tt.target,
      label: tt.target,
      sortValue: (l) => l.targetUrl,
      cell: (l) => h("bdi", { dir: "ltr", class: "block max-w-[18ch] truncate text-caption text-muted-foreground" }, l.targetUrl),
    },
    { id: "rating", header: tt.rating, label: tt.rating, align: "end", sortValue: (l) => l.domainRating, cell: (l) => h(NqNum, { value: l.domainRating }) },
    { id: "spam", header: tt.spam, label: tt.spam, align: "end", sortValue: (l) => l.spamScore, cell: (l) => h(NqNum, { value: l.spamScore }) },
    {
      id: "seen",
      header: tt.seen,
      label: tt.seen,
      sortValue: (l) => l.firstSeen,
      cell: (l) => h(NqDateTime, { value: l.firstSeen, format: { month: "short", day: "numeric", year: "numeric" } }),
    },
    {
      id: "status",
      header: tt.status,
      label: tt.status,
      sortValue: (l) => flag(l),
      filterValue: (l) => flag(l),
      cell: (l) => {
        const s = backlinkStatus(l, clock.value);
        return h("span", { class: "flex flex-wrap items-center gap-1" }, [
          h(NqStatus, { tone: s === "lost" ? "danger" : s === "new" ? "success" : "neutral" }, () => statusLabel.value[s]),
          l.disavowed ? h(NqBadge, { variant: "outline" }, () => tt.disavowed) : isToxic(l) && !l.lostAt ? h(NqBadge, { variant: "danger" }, () => tt.toxic) : null,
          l.followed === false ? h(NqBadge, { variant: "outline" }, () => tt.nofollow) : null,
        ]);
      },
    },
  ];
});

const table = useDataTable<Backlink>({
  data: () => [...props.links],
  columns,
  getRowId: (l) => l.id,
  pageSize: props.pageSize,
  defaultSort: { id: "seen", direction: "desc" },
});

function rowActions(l: Backlink): DataTableRowAction[] {
  return [
    ...(props.onDisavow && !l.disavowed ? [{ id: "disavow", label: t.value.disavow, icon: ShieldOff, danger: true, onSelect: () => void run(() => props.onDisavow!([l.id])) }] : []),
    ...(props.onMarkSafe && isToxic(l) ? [{ id: "safe", label: t.value.markSafe, icon: ShieldCheck, onSelect: () => void run(() => props.onMarkSafe!(l.id)) }] : []),
  ];
}
</script>

<template>
  <div data-slot="backlink-monitor" :class="cn('flex w-full flex-col gap-6', props.class)">
    <NqMetricTiles
      :metrics="[
        { id: 'domains', label: t.domains, value: summary.domains },
        { id: 'active', label: t.activeLinks, value: summary.active },
        { id: 'new', label: t.newLinks, value: summary.new },
        { id: 'lost', label: t.lostLinks, value: summary.lost, invert: true },
        { id: 'toxic', label: t.toxicLinks, value: summary.toxic, invert: true },
      ]"
      :comparison-label="t.comparison"
      :loading="props.loading"
    />
    <NqTimeSeriesPanel
      :title="t.chartTitle"
      :metrics="[
        { id: 'gained', label: t.gained, color: 'var(--nq-success)' },
        { id: 'lost', label: t.lost, color: 'var(--nq-danger)' },
      ]"
      :data="series"
      default-metric="gained"
      :default-compare="false"
      :loading="props.loading"
      chart-class-name="h-48"
    />
    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3"><slot name="title">{{ props.title ?? t.title }}</slot></NqCardTitle>
        <NqCardDescription><slot name="description">{{ props.description ?? t.description }}</slot></NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqDataTableToolbar>
          <NqDataTableSearch :table="table" :placeholder="t.filter" />
          <NqDataTableFacetFilter
            :table="table"
            column="status"
            :title="t.status"
            :options="[
              { value: 'new', label: t.statusNew },
              { value: 'active', label: t.statusActive },
              { value: 'lost', label: t.statusLost },
              { value: 'toxic', label: t.toxic },
            ]"
          />
        </NqDataTableToolbar>
        <NqAlert v-if="failed" tone="danger">{{ failed }}</NqAlert>
        <NqDataTable
          :table="table"
          :label="t.tableLabel"
          :row-label="(l: Backlink) => domainOf(l.sourceUrl)"
          :row-actions="rowActions"
          :loading="props.loading"
          :error="props.error"
          :on-retry="props.onRetry"
          :labels="{ empty: t.empty }"
        />
        <NqDataTablePagination v-if="props.links.length > props.pageSize" :table="table" />
      </NqCardContent>
    </NqCard>
  </div>
</template>
