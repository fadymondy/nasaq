<script setup lang="ts">
import { AlertTriangle, Banknote, PackageX, Percent, Receipt, Repeat, ShoppingBag, Store, Users } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqBreakdownTable } from "../breakdown-table";
import { NqButton } from "../button";
import { CHART_COLORS } from "../chart";
import { NqSegmentBar } from "../chart-extras";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDashboardBoard, type BoardItem, type DashboardWidgetDef } from "../dashboard-board";
import { NqFunnelChart } from "../funnel-chart";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqPrice } from "../price";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState, NqErrorState } from "../states";
import { NqTimeSeriesPanel, type TimeSeriesMetric } from "../time-series-panel";
import StoreRecentOrders from "./StoreRecentOrders.vue";
import StoreThumb from "./StoreThumb.vue";
import {
  storeFunnelCounts,
  storeKpis,
  storeLowStock,
  storeSafeDivide,
  storeToMajor,
  storeTopN,
  STORE_LOW_STOCK_DEFAULT,
  type StoreLowStockItem,
  type StorePeriodTotals,
  type StoreSalesPoint,
} from "./store-dashboard-math";
import type { CommerceOrder, CommerceProduct } from "./store-commerce";
import { STRINGS, type StoreDashboardLabels } from "./strings";
import { STORE_DASHBOARD_LAYOUT, type StoreBreakdownRow, type StoreLiveVisitors, type StoreTopProduct } from "./types";

// The home screen of a store admin: five KPIs with the change against the previous period and live visitors, then a board
// of widgets (sales over time, conversion funnel, top products and categories, sales by channel and city, low stock and
// recent orders) that the owner can rearrange. Presentational: pass the numbers for the period, it does the ratios.
const props = withDefaults(
  defineProps<{
    /** ISO 4217 code of the store. Every money figure is integer minor units in it. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    totals: StorePeriodTotals;
    /** The comparison period. Without it the KPIs show no change. */
    previousTotals?: StorePeriodTotals;
    series: readonly StoreSalesPoint[];
    previousSeries?: readonly StoreSalesPoint[];
    topProducts: readonly StoreTopProduct[];
    categories: readonly StoreBreakdownRow[];
    channels: readonly StoreBreakdownRow[];
    cities: readonly StoreBreakdownRow[];
    /** Catalogue to scan for low stock. */
    products: readonly CommerceProduct[];
    lowStockThreshold?: number;
    recentOrders: readonly CommerceOrder[];
    liveVisitors?: StoreLiveVisitors;
    /** Text after each change, for example "vs the previous 30 days". Default "vs previous period". */
    comparisonLabel?: string;
    onOpenOrder?: (order: CommerceOrder) => void;
    onOpenProduct?: (productId: string) => void;
    /** Adds a Restock button to every low-stock row and to its menu. */
    onRestock?: (item: StoreLowStockItem) => void;
    /** The board layout (controlled). Default STORE_DASHBOARD_LAYOUT. */
    layout?: readonly BoardItem[];
    onLayoutChange?: (layout: BoardItem[]) => void | Promise<void>;
    rowHeight?: number;
    loading?: boolean;
    /** Show the "no sales yet" state. Default: no orders, no sessions and no series. */
    empty?: boolean;
    error?: boolean | string;
    onRetry?: () => void;
    labels?: Partial<StoreDashboardLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    currency: undefined,
    previousTotals: undefined,
    previousSeries: undefined,
    lowStockThreshold: STORE_LOW_STOCK_DEFAULT,
    liveVisitors: undefined,
    comparisonLabel: undefined,
    onOpenOrder: undefined,
    onOpenProduct: undefined,
    onRestock: undefined,
    layout: undefined,
    onLayoutChange: undefined,
    rowHeight: 160,
    loading: false,
    empty: undefined,
    error: undefined,
    onRetry: undefined,
    labels: undefined,
  },
);
defineSlots<{
  /** Period and filter controls above the figures: a report filter bar or time range picker. */
  toolbar?: () => unknown;
}>();

const currency = useCurrency(() => props.currency);
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const innerLayout = ref<readonly BoardItem[]>(STORE_DASHBOARD_LAYOUT);
const boardLayout = computed(() => props.layout ?? innerLayout.value);

const kpis = computed(() => storeKpis(props.totals, props.previousTotals));
const money = computed(() => ({ style: "currency" as const, currency: currency.value, maximumFractionDigits: 0 }));
const major = (minor: number) => storeToMajor(minor, currency.value);
const isEmpty = computed(() => props.empty ?? (props.series.length === 0 && props.totals.orders === 0 && props.totals.sessions === 0));
const vs = computed(() => props.comparisonLabel ?? t.value.vsPrevious);
const funnel = computed(() => storeFunnelCounts(props.totals));
const lowStock = computed(() => storeLowStock(props.products, props.lowStockThreshold));
const sparks = computed(() => ({
  sales: props.series.map((p) => p.sales),
  orders: props.series.map((p) => p.orders),
  aov: props.series.map((p) => Math.round(storeSafeDivide(p.sales, p.orders))),
  conversion: props.series.map((p) => storeSafeDivide(p.orders, p.sessions)),
}));

const metrics = computed<TimeSeriesMetric[]>(() => [
  { id: "sales", label: t.value.metrics.sales, format: money.value },
  { id: "orders", label: t.value.metrics.orders, color: "var(--nq-tag-teal)" },
  { id: "sessions", label: t.value.metrics.sessions, color: "var(--nq-tag-violet)" },
]);
const pointRows = (list: readonly StoreSalesPoint[]) => list.map((p) => ({ date: p.date, sales: major(p.sales), orders: p.orders, sessions: p.sessions }));
const breakdown = (list: readonly StoreBreakdownRow[]) =>
  list.map((r) => ({ id: r.id, label: r.label, value: major(r.value), previous: r.previous === undefined ? undefined : major(r.previous) }));
const channelRows = computed(() =>
  storeTopN(
    props.channels.map((c) => ({ ...c })),
    props.channels.length,
  ),
);
const color = (i: number) => CHART_COLORS[i % CHART_COLORS.length];
const productMenu = (id: string): ContextMenuAction[] => (props.onOpenProduct ? [{ id: "open", label: t.value.openProduct, onSelect: () => props.onOpenProduct?.(id) }] : []);
const stockMenu = (item: StoreLowStockItem): ContextMenuAction[] => [
  ...(props.onRestock ? [{ id: "restock", label: t.value.restock, onSelect: () => props.onRestock?.(item), group: "stock" }] : []),
  ...(props.onOpenProduct ? [{ id: "open", label: t.value.openProduct, onSelect: () => props.onOpenProduct?.(item.productId), group: "open" }] : []),
];
const topList = (limit: unknown) =>
  storeTopN(
    props.topProducts.map((p) => ({ ...p, value: p.revenue })),
    Number(limit ?? 5),
  );
const changeOf = (value: number, previous?: number) => {
  if (previous === undefined || previous === 0) return undefined;
  const change = (value - previous) / Math.abs(previous);
  return Number.isFinite(change) && change !== 0 ? change : undefined;
};
// The small change figure beside a revenue number.
const Pill = (p: { value: number; previous?: number }) => {
  const change = changeOf(p.value, p.previous);
  if (change === undefined) return null;
  return h("span", { class: cn("text-caption tabular-nums", change > 0 ? "text-nq-success-text" : "text-nq-danger-text") }, [
    h(NqNum, { value: change, format: { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" } }),
  ]);
};

// Widget definitions without `render`: the board calls the `widget` slot below for each one.
const widgets = computed<DashboardWidgetDef[]>(() => [
  { type: "sales", title: t.value.widgets.sales, description: t.value.widgetHints.sales, unique: true, minCols: 2, minRows: 3, defaultCols: 4, defaultRows: 3 },
  { type: "funnel", title: t.value.widgets.funnel, description: t.value.widgetHints.funnel, unique: true, minCols: 2, minRows: 4, defaultCols: 2, defaultRows: 4 },
  {
    type: "top-products",
    title: t.value.widgets.topProducts,
    description: t.value.widgetHints.topProducts,
    minCols: 1,
    minRows: 2,
    defaultCols: 2,
    defaultRows: 2,
    fields: [{ key: "limit", label: t.value.widgets.topProducts, type: "number", min: 3, max: 10 }],
    defaultSettings: { limit: 5 },
  },
  { type: "categories", title: t.value.widgets.categories, description: t.value.widgetHints.categories, minCols: 1, minRows: 2, defaultCols: 2, defaultRows: 2 },
  { type: "channels", title: t.value.widgets.channels, description: t.value.widgetHints.channels, minCols: 1, minRows: 2, defaultCols: 2, defaultRows: 2 },
  { type: "cities", title: t.value.widgets.cities, description: t.value.widgetHints.cities, minCols: 1, minRows: 2, defaultCols: 2, defaultRows: 2 },
  { type: "low-stock", title: t.value.widgets.lowStock, description: t.value.widgetHints.lowStock, unique: true, minCols: 1, minRows: 2, defaultCols: 2, defaultRows: 2 },
  { type: "recent-orders", title: t.value.widgets.recentOrders, description: t.value.widgetHints.recentOrders, unique: true, minCols: 2, minRows: 2, defaultCols: 2, defaultRows: 2 },
]);

const FLAT = "h-full border-0 py-0 shadow-none";
const FUNNEL_CHROME = "[&_[data-slot=card-header]]:hidden [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card-content]]:px-0";
const funnelSteps = computed(() => [
  { id: "sessions", label: t.value.funnelSteps.sessions, count: funnel.value.sessions, detail: "session_start" },
  { id: "cart", label: t.value.funnelSteps.addToCart, count: funnel.value.addToCart, detail: "add_to_cart" },
  { id: "checkout", label: t.value.funnelSteps.checkout, count: funnel.value.checkout, detail: "begin_checkout" },
  { id: "purchase", label: t.value.funnelSteps.purchase, count: funnel.value.purchase, detail: "purchase" },
]);
const save = (next: BoardItem[]) => {
  if (props.onLayoutChange) return props.onLayoutChange(next);
  innerLayout.value = next;
};
const showSpark = (s: readonly number[] | undefined) => (s && s.length > 1 ? s : undefined);
const tiles = computed(() => [
  { key: "sales" as const, label: t.value.sales, icon: Banknote, value: major(kpis.value.sales.value), format: money.value, spark: showSpark(sparks.value.sales) },
  { key: "orders" as const, label: t.value.orders, icon: ShoppingBag, value: kpis.value.orders.value, format: undefined, spark: showSpark(sparks.value.orders) },
  { key: "aov" as const, label: t.value.aov, icon: Receipt, value: major(kpis.value.aov.value), format: money.value, spark: showSpark(sparks.value.aov) },
  {
    key: "conversion" as const,
    label: t.value.conversion,
    icon: Percent,
    value: kpis.value.conversion.value,
    format: { style: "percent" as const, maximumFractionDigits: 1 },
    spark: showSpark(sparks.value.conversion),
  },
  { key: "returning" as const, label: t.value.returning, icon: Repeat, value: kpis.value.returning.value, format: { style: "percent" as const, maximumFractionDigits: 0 }, spark: undefined },
]);
</script>

<template>
  <section v-if="error" data-slot="store-dashboard" :aria-label="t.region" :class="cn('flex w-full min-w-0 flex-col gap-4', props.class)">
    <slot name="toolbar" />
    <NqErrorState :title="typeof error === 'string' ? error : t.errorTitle">
      <template v-if="onRetry" #actions><NqButton @click="onRetry()">{{ t.retry }}</NqButton></template>
    </NqErrorState>
  </section>
  <section v-else data-slot="store-dashboard" :aria-label="t.region" :aria-busy="loading || undefined" :class="cn('flex w-full min-w-0 flex-col gap-4', props.class)">
    <slot name="toolbar" />
    <NqEmptyState v-if="isEmpty && !loading" :icon="Store" :title="t.emptyTitle" :description="t.emptyBody" />
    <template v-else>
      <NqStatGrid role="group" :aria-label="t.kpis" data-slot="store-dashboard-kpis" class="grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
        <NqStatCard
          v-for="tile in tiles"
          :key="tile.key"
          :label="tile.label"
          :value="tile.value"
          :format="tile.format"
          :delta="kpis[tile.key].change"
          :delta-label="kpis[tile.key].change === undefined ? undefined : vs"
          :sparkline="tile.spark"
          :sparkline-label="tile.spark ? t.salesSpark(tile.label) : undefined"
          :loading="loading"
        >
          <template #icon><component :is="tile.icon" /></template>
        </NqStatCard>
        <NqStatCard
          v-if="liveVisitors"
          data-slot="store-dashboard-live"
          :sparkline="liveVisitors.history && liveVisitors.history.length > 1 ? liveVisitors.history : undefined"
          :sparkline-label="t.live"
          :loading="loading"
        >
          <template #icon><Users /></template>
          <template #label>
            <span class="flex items-center gap-2">
              {{ t.live }}
              <NqBadge variant="success">
                <span aria-hidden="true" class="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                {{ t.liveBadge }}
              </NqBadge>
            </span>
          </template>
          <template #value>
            <span class="flex flex-col">
              <NqNum :value="liveVisitors.count" />
              <span class="text-caption font-normal text-muted-foreground">{{ t.liveHint }}</span>
            </span>
          </template>
        </NqStatCard>
      </NqStatGrid>
      <NqDashboardBoard :widgets="widgets" :layout="boardLayout" :row-height="rowHeight" :loading="loading" :on-save="save" :default-layout="STORE_DASHBOARD_LAYOUT">
        <template #widget="{ def, ctx }">
          <NqTimeSeriesPanel
            v-if="def.type === 'sales'"
            :class="FLAT"
            :metrics="metrics"
            :data="pointRows(series)"
            :previous-data="previousSeries ? pointRows(previousSeries) : undefined"
            chart-class-name="h-56"
            :labels="{ compare: vs }"
          />
          <div v-else-if="def.type === 'funnel'" :class="FUNNEL_CHROME">
            <NqFunnelChart :steps="funnelSteps" />
          </div>
          <template v-else-if="def.type === 'top-products'">
            <p v-if="topList(ctx.settings.limit).length === 0" class="py-6 text-center text-body-sm text-muted-foreground">{{ t.noRows }}</p>
            <ol v-else data-slot="store-dashboard-top-products" class="flex flex-col divide-y divide-border">
              <NqContextMenuActions v-for="p in topList(ctx.settings.limit)" :key="p.id" as="li" :actions="productMenu(p.id)" class="flex items-center gap-3 py-2">
                <StoreThumb :src="p.image" />
                <div class="min-w-0 flex-1">
                  <button
                    v-if="onOpenProduct"
                    type="button"
                    dir="auto"
                    class="block max-w-full truncate rounded-control text-start text-label text-foreground outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
                    @click="onOpenProduct(p.id)"
                  >
                    {{ p.name }}
                  </button>
                  <span v-else dir="auto" class="block truncate text-label text-foreground">{{ p.name }}</span>
                  <span class="text-caption text-muted-foreground">{{ t.units(p.units) }}</span>
                </div>
                <div class="flex shrink-0 flex-col items-end">
                  <NqPrice :amount="major(p.revenue)" :currency="currency" :fraction-digits="0" size="sm" />
                  <Pill :value="p.revenue" :previous="p.previousRevenue" />
                </div>
              </NqContextMenuActions>
            </ol>
          </template>
          <NqBreakdownTable
            v-else-if="def.type === 'categories'"
            :class="FLAT"
            :rows="breakdown(categories)"
            :dimension-label="t.dimension.category"
            :value-label="t.revenue"
            :format="money"
            :limit="5"
            :label="t.widgets.categories"
            :labels="{ empty: t.noRows }"
          />
          <div v-else-if="def.type === 'channels'" class="flex flex-col gap-3">
            <NqSegmentBar
              v-if="channelRows.length > 0"
              :legend="false"
              :inline-labels="false"
              size="md"
              :segments="channelRows.map((c, i) => ({ id: c.id, label: c.label, value: c.value, color: color(i) }))"
            />
            <NqBreakdownTable
              :class="FLAT"
              :rows="breakdown(channelRows)"
              :dimension-label="t.dimension.channel"
              :value-label="t.sales"
              :format="money"
              :limit="6"
              :label="t.widgets.channels"
              :labels="{ empty: t.noRows }"
            >
              <template #label="{ row }">
                <span class="flex items-center gap-2">
                  <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" :style="{ backgroundColor: color(channelRows.findIndex((c) => c.id === row.id)) }" />
                  <span dir="auto" class="truncate">{{ row.label }}</span>
                </span>
              </template>
            </NqBreakdownTable>
          </div>
          <NqBreakdownTable
            v-else-if="def.type === 'cities'"
            :class="FLAT"
            :rows="breakdown(cities)"
            :dimension-label="t.dimension.city"
            :value-label="t.sales"
            :format="money"
            :limit="6"
            :label="t.widgets.cities"
            :labels="{ empty: t.noRows }"
          />
          <template v-else-if="def.type === 'low-stock'">
            <NqEmptyState v-if="lowStock.length === 0" class="border-0 py-6" :title="t.noLowStock" :description="t.noLowStockHint(lowStockThreshold)" />
            <ul v-else data-slot="store-dashboard-low-stock" class="flex flex-col divide-y divide-border">
              <NqContextMenuActions v-for="item in lowStock" :key="item.variantId" as="li" :actions="stockMenu(item)" class="flex items-center gap-3 py-2">
                <StoreThumb :src="item.image" />
                <div class="min-w-0 flex-1">
                  <span dir="auto" class="block truncate text-label text-foreground">{{ item.productName }}</span>
                  <span class="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                    <span v-if="item.variantLabel" dir="auto" class="truncate">{{ item.variantLabel }}</span>
                    <bdi v-if="item.sku" dir="ltr" class="shrink-0 tabular-nums">{{ item.sku }}</bdi>
                  </span>
                </div>
                <NqBadge :variant="item.level === 'out' ? 'danger' : 'warning'">
                  <PackageX v-if="item.level === 'out'" aria-hidden="true" />
                  <AlertTriangle v-else aria-hidden="true" />
                  {{ item.level === "out" ? t.outOfStock : t.left(item.stock) }}
                </NqBadge>
                <NqButton v-if="onRestock" size="sm" variant="secondary" :aria-label="t.restockItem(item.productName)" @click="onRestock(item)">{{ t.restock }}</NqButton>
              </NqContextMenuActions>
            </ul>
          </template>
          <StoreRecentOrders v-else-if="def.type === 'recent-orders'" :orders="recentOrders" :currency="currency" :to-major="major" :t="t" :on-open-order="onOpenOrder" />
        </template>
      </NqDashboardBoard>
    </template>
  </section>
</template>
