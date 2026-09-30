"use client";

import { AlertTriangle, Banknote, ImageOff, PackageX, Percent, Receipt, Repeat, ShoppingBag, Store, Users } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder, CommerceOrderStatus, CommerceProduct } from "../../lib/commerce";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { BreakdownTable } from "../breakdown-table";
import { Button } from "../button";
import { CHART_COLORS } from "../chart";
import { SegmentBar } from "../chart-extras";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { type BoardItem, DashboardBoard, type DashboardWidgetDef } from "../dashboard-board";
import { DataTable, type DataTableColumn, useDataTable } from "../data-table";
import { FunnelChart } from "../funnel-chart";
import { DateTime, Num } from "../numeric";
import { Price } from "../price";
import { StatCard, StatGrid } from "../stat-card";
import { EmptyState, ErrorState } from "../states";
import { TimeSeriesPanel, type TimeSeriesMetric } from "../time-series-panel";
import {
  STORE_LOW_STOCK_DEFAULT,
  type StoreFunnelCounts,
  type StoreLowStockItem,
  type StorePeriodTotals,
  type StoreSalesPoint,
  storeFunnelCounts,
  storeKpis,
  storeLowStock,
  storeSafeDivide,
  storeToMajor,
  storeTopN,
} from "./store-dashboard-math";

const ORDER_STATUS_EN: Record<CommerceOrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  "partially-fulfilled": "Partly fulfilled",
  fulfilled: "Fulfilled",
  shipped: "Shipped",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  "partially-refunded": "Partly refunded",
  returned: "Returned",
};

const ORDER_STATUS_AR: Record<CommerceOrderStatus, string> = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  processing: "قيد التجهيز",
  "partially-fulfilled": "منفّذ جزئيًا",
  fulfilled: "تم التجهيز",
  shipped: "تم الشحن",
  "out-for-delivery": "خرج للتوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  refunded: "مُسترد",
  "partially-refunded": "مُسترد جزئيًا",
  returned: "مُرتجع",
};

const ORDER_STATUS_VARIANT: Record<CommerceOrderStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  paid: "info",
  processing: "info",
  "partially-fulfilled": "info",
  fulfilled: "success",
  shipped: "info",
  "out-for-delivery": "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "neutral",
  "partially-refunded": "neutral",
  returned: "neutral",
};

const STRINGS = {
  en: {
    region: "Store dashboard",
    kpis: "Key figures",
    sales: "Sales",
    orders: "Orders",
    aov: "Average order value",
    conversion: "Conversion rate",
    returning: "Returning customers",
    live: "Live visitors",
    liveHint: "on the site right now",
    liveBadge: "Live",
    vsPrevious: "vs previous period",
    salesSpark: (label: string) => `${label}, trend over the period`,
    widgets: {
      sales: "Sales over time",
      funnel: "Conversion funnel",
      topProducts: "Top products",
      categories: "Top categories",
      channels: "Sales by channel",
      cities: "Sales by city",
      lowStock: "Low stock",
      recentOrders: "Recent orders",
    },
    widgetHints: {
      sales: "Sales, orders and sessions with the previous period behind them",
      funnel: "Sessions to purchase, and where shoppers leave",
      topProducts: "Best sellers by revenue",
      categories: "Revenue by product category",
      channels: "Where the sales came from",
      cities: "Where the orders were delivered",
      lowStock: "Variants at or under the stock threshold",
      recentOrders: "The latest orders placed",
    },
    metrics: { sales: "Sales", orders: "Orders", sessions: "Sessions" },
    funnelSteps: { sessions: "Sessions", addToCart: "Added to cart", checkout: "Started checkout", purchase: "Purchased" },
    dimension: { category: "Category", channel: "Channel", city: "City" },
    revenue: "Revenue",
    units: (n: number) => (n === 1 ? "1 sold" : `${n} sold`),
    outOfStock: "Out of stock",
    left: (n: number) => `${n} left`,
    restock: "Restock",
    restockItem: (name: string) => `Restock ${name}`,
    openProduct: "Open product",
    openOrder: "Open order",
    noLowStock: "Every variant is well stocked",
    noLowStockHint: (n: number) => `Nothing at ${n} or fewer.`,
    noOrders: "No orders yet",
    noRows: "No data for this period",
    order: "Order",
    customer: "Customer",
    status: "Status",
    total: "Total",
    placed: "Placed",
    ordersTable: "Recent orders",
    orderStatus: ORDER_STATUS_EN,
    emptyTitle: "No sales in this period",
    emptyBody: "When customers start ordering, your figures, top sellers and funnel show up here.",
    errorTitle: "The dashboard could not be loaded.",
    retry: "Try again",
    productImage: "No image",
  },
  ar: {
    region: "لوحة المتجر",
    kpis: "الأرقام الرئيسية",
    sales: "المبيعات",
    orders: "الطلبات",
    aov: "متوسط قيمة الطلب",
    conversion: "معدل التحويل",
    returning: "العملاء العائدون",
    live: "الزوار الآن",
    liveHint: "على المتجر في هذه اللحظة",
    liveBadge: "مباشر",
    vsPrevious: "مقارنة بالفترة السابقة",
    salesSpark: (label: string) => `${label}، الاتجاه خلال الفترة`,
    widgets: {
      sales: "المبيعات عبر الزمن",
      funnel: "قمع التحويل",
      topProducts: "أفضل المنتجات",
      categories: "أفضل الأقسام",
      channels: "المبيعات حسب القناة",
      cities: "المبيعات حسب المدينة",
      lowStock: "مخزون منخفض",
      recentOrders: "أحدث الطلبات",
    },
    widgetHints: {
      sales: "المبيعات والطلبات والجلسات مع الفترة السابقة خلفها",
      funnel: "من الزيارة إلى الشراء، وأين يغادر المتسوقون",
      topProducts: "الأكثر مبيعًا حسب الإيراد",
      categories: "الإيراد حسب قسم المنتج",
      channels: "من أين جاءت المبيعات",
      cities: "إلى أين وصلت الطلبات",
      lowStock: "الأصناف التي وصلت إلى حد المخزون أو أقل",
      recentOrders: "آخر الطلبات الواردة",
    },
    metrics: { sales: "المبيعات", orders: "الطلبات", sessions: "الجلسات" },
    funnelSteps: { sessions: "الجلسات", addToCart: "أضافوا إلى السلة", checkout: "بدأوا الدفع", purchase: "أتمّوا الشراء" },
    dimension: { category: "القسم", channel: "القناة", city: "المدينة" },
    revenue: "الإيراد",
    units: (n: number) => (n === 1 ? "بيعت قطعة" : n === 2 ? "بيعت قطعتان" : n <= 10 ? `بيعت ${n} قطع` : `بيعت ${n} قطعة`),
    outOfStock: "نفد المخزون",
    left: (n: number) => (n === 1 ? "بقيت قطعة" : n === 2 ? "بقيت قطعتان" : `بقيت ${n} قطع`),
    restock: "إعادة التوريد",
    restockItem: (name: string) => `إعادة توريد ${name}`,
    openProduct: "فتح المنتج",
    openOrder: "فتح الطلب",
    noLowStock: "كل الأصناف بمخزون جيد",
    noLowStockHint: (n: number) => `لا شيء عند ${n} أو أقل.`,
    noOrders: "لا توجد طلبات بعد",
    noRows: "لا بيانات لهذه الفترة",
    order: "الطلب",
    customer: "العميل",
    status: "الحالة",
    total: "الإجمالي",
    placed: "وقت الطلب",
    ordersTable: "أحدث الطلبات",
    orderStatus: ORDER_STATUS_AR,
    emptyTitle: "لا مبيعات في هذه الفترة",
    emptyBody: "عندما يبدأ العملاء بالطلب ستظهر هنا أرقامك وأكثر المنتجات مبيعًا وقمع التحويل.",
    errorTitle: "تعذّر تحميل اللوحة.",
    retry: "حاول مرة أخرى",
    productImage: "بلا صورة",
  },
};

export type StoreDashboardLabels = typeof STRINGS.en;

/** One row of a sales breakdown (category, channel, city). `value` is sales in minor units. */
export interface StoreBreakdownRow {
  id: string;
  /** Localised name. */
  label: string;
  value: number;
  /** The same figure for the previous period, minor units. Adds the change column. */
  previous?: number;
}

export interface StoreTopProduct {
  id: string;
  name: string;
  /** Lab or CDN image URL. A neutral placeholder shows when it is missing or fails to load. */
  image?: string;
  units: number;
  /** Revenue in minor units. */
  revenue: number;
  previousRevenue?: number;
}

export interface StoreLiveVisitors {
  count: number;
  /** Visitors per minute, oldest first, for the trend line. */
  history?: readonly number[];
}

export interface StoreDashboardProps {
  /** ISO 4217 code of the store. Every money figure is integer minor units in it. */
  currency: string;
  /** What the period adds up to. */
  totals: StorePeriodTotals;
  /** The comparison period. Without it the KPIs show no change. */
  previousTotals?: StorePeriodTotals;
  /** One point per day (or hour) for the chart and the KPI trend lines. */
  series: readonly StoreSalesPoint[];
  /** The comparison period, index-aligned with `series`. */
  previousSeries?: readonly StoreSalesPoint[];
  topProducts: readonly StoreTopProduct[];
  categories: readonly StoreBreakdownRow[];
  channels: readonly StoreBreakdownRow[];
  cities: readonly StoreBreakdownRow[];
  /** Catalogue to scan for low stock (a variant with `stock` at or under `lowStockThreshold`). */
  products: readonly CommerceProduct[];
  /** Default 5. */
  lowStockThreshold?: number;
  recentOrders: readonly CommerceOrder[];
  liveVisitors?: StoreLiveVisitors;
  /** Period and filter controls above the figures: a ReportFilterBar or TimeRangePicker. */
  toolbar?: ReactNode;
  /** Text after each change, for example "vs the previous 30 days". Default: "vs previous period". */
  comparisonLabel?: ReactNode;
  onOpenOrder?: (order: CommerceOrder) => void;
  onOpenProduct?: (productId: string) => void;
  /** Adds a Restock button to every low-stock row and to its menu. */
  onRestock?: (item: StoreLowStockItem) => void;
  /** The board layout (controlled). Default: STORE_DASHBOARD_LAYOUT. */
  layout?: readonly BoardItem[];
  onLayoutChange?: (layout: BoardItem[]) => void | Promise<void>;
  /** Height of one board row in pixels. Default 160. */
  rowHeight?: number;
  loading?: boolean;
  /** Show the "no sales yet" state. Default: no orders, no sessions and no series. */
  empty?: boolean;
  /** Message for the error state, or true for the default. */
  error?: boolean | string;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<StoreDashboardLabels>;
}

/** The board a store starts with: the chart across, then funnel and top lists, then stock and orders. */
export const STORE_DASHBOARD_LAYOUT: readonly BoardItem[] = [
  { id: "sales", type: "sales", cols: 4, rows: 3 },
  { id: "funnel", type: "funnel", cols: 2, rows: 4 },
  { id: "top-products", type: "top-products", cols: 2, rows: 2 },
  { id: "categories", type: "categories", cols: 2, rows: 2 },
  { id: "channels", type: "channels", cols: 2, rows: 2 },
  { id: "cities", type: "cities", cols: 2, rows: 2 },
  { id: "low-stock", type: "low-stock", cols: 2, rows: 2 },
  { id: "recent-orders", type: "recent-orders", cols: 2, rows: 2 },
];

/* Inside a board card the widget is the content: drop the nested card chrome. */
const FLAT = "h-full border-0 py-0 shadow-none";

function Thumb({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span data-slot="store-dashboard-thumb" className={cn("grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-muted text-muted-foreground", className)}>
      {src && !failed ? (
        <img src={src} alt="" width={40} height={40} loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <ImageOff aria-hidden className="size-4" />
      )}
    </span>
  );
}

function ChangePill({ value, previous, invert = false }: { value: number; previous?: number; invert?: boolean }) {
  if (previous === undefined || previous === 0) return null;
  const change = (value - previous) / Math.abs(previous);
  if (!Number.isFinite(change) || change === 0) return null;
  const good = change > 0 !== invert;
  return (
    <span className={cn("text-caption tabular-nums", good ? "text-nq-success-text" : "text-nq-danger-text")}>
      <Num value={change} format={{ style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }} />
    </span>
  );
}

function MenuRow({ actions, children, className }: { actions: ContextMenuAction[]; children: ReactNode; className?: string }) {
  return (
    <ContextMenuActions actions={actions} render={<li className={className} />}>
      {children}
    </ContextMenuActions>
  );
}

/**
 * The home screen of a store admin: five KPIs with the change against the previous period and live visitors, then a board
 * of widgets (sales over time, conversion funnel, top products and categories, sales by channel and city, low stock and
 * recent orders) that the owner can rearrange. Presentational: pass the numbers for the period, it does the ratios.
 */
export function StoreDashboard({
  currency,
  totals,
  previousTotals,
  series,
  previousSeries,
  topProducts,
  categories,
  channels,
  cities,
  products,
  lowStockThreshold = STORE_LOW_STOCK_DEFAULT,
  recentOrders,
  liveVisitors,
  toolbar,
  comparisonLabel,
  onOpenOrder,
  onOpenProduct,
  onRestock,
  layout,
  onLayoutChange,
  rowHeight = 160,
  loading = false,
  empty,
  error,
  onRetry,
  className,
  labels,
}: StoreDashboardProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [innerLayout, setInnerLayout] = useState<readonly BoardItem[]>(STORE_DASHBOARD_LAYOUT);
  const boardLayout = layout ?? innerLayout;

  const kpis = useMemo(() => storeKpis(totals, previousTotals), [totals, previousTotals]);
  const money = useMemo(() => ({ style: "currency" as const, currency, maximumFractionDigits: 0 }), [currency]);
  const major = (minor: number) => storeToMajor(minor, currency);
  const isEmpty = empty ?? (series.length === 0 && totals.orders === 0 && totals.sessions === 0);
  const vs = comparisonLabel ?? t.vsPrevious;

  const funnel: StoreFunnelCounts = useMemo(() => storeFunnelCounts(totals), [totals]);
  const lowStock = useMemo(() => storeLowStock(products, lowStockThreshold), [products, lowStockThreshold]);

  const sparks = useMemo(
    () => ({
      sales: series.map((p) => p.sales),
      orders: series.map((p) => p.orders),
      aov: series.map((p) => Math.round(storeSafeDivide(p.sales, p.orders))),
      conversion: series.map((p) => storeSafeDivide(p.orders, p.sessions)),
    }),
    [series],
  );

  const widgets = useMemo((): DashboardWidgetDef[] => {
    const metrics: TimeSeriesMetric[] = [
      { id: "sales", label: t.metrics.sales, format: money },
      { id: "orders", label: t.metrics.orders, color: "var(--nq-tag-teal)" },
      { id: "sessions", label: t.metrics.sessions, color: "var(--nq-tag-violet)" },
    ];
    const rows = (list: readonly StoreSalesPoint[]) => list.map((p) => ({ date: p.date, sales: major(p.sales), orders: p.orders, sessions: p.sessions }));
    const breakdown = (list: readonly StoreBreakdownRow[]) =>
      list.map((r) => ({ id: r.id, label: r.label, value: major(r.value), previous: r.previous === undefined ? undefined : major(r.previous) }));

    const productMenu = (id: string): ContextMenuAction[] => (onOpenProduct ? [{ id: "open", label: t.openProduct, onSelect: () => onOpenProduct(id) }] : []);

    const orderColumns: DataTableColumn<CommerceOrder>[] = [
      {
        id: "number",
        header: t.order,
        cell: (o) => (
          <bdi dir="ltr" className="text-label tabular-nums">
            {o.number}
          </bdi>
        ),
        sortValue: (o) => o.placedAt,
        searchValue: (o) => o.number,
      },
      { id: "customer", header: t.customer, cell: (o) => <span className="block max-w-40 truncate">{o.customer.name}</span> },
      {
        id: "status",
        header: t.status,
        cell: (o) => <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{t.orderStatus[o.status]}</Badge>,
        defaultHidden: false,
      },
      { id: "total", header: t.total, align: "end", cell: (o) => <Price amount={major(o.totals.total)} currency={currency} size="sm" /> },
      {
        id: "placed",
        header: t.placed,
        cell: (o) => <DateTime value={o.placedAt} format={{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} className="text-body-sm text-muted-foreground" />,
        className: "hidden sm:table-cell",
        headerClassName: "hidden sm:table-cell",
      },
    ];

    return [
      {
        type: "sales",
        title: t.widgets.sales,
        description: t.widgetHints.sales,
        unique: true,
        minCols: 2,
        minRows: 3,
        defaultCols: 4,
        defaultRows: 3,
        render: () => (
          <TimeSeriesPanel
            className={FLAT}
            metrics={metrics}
            data={rows(series)}
            previousData={previousSeries ? rows(previousSeries) : undefined}
            chartClassName="h-56"
            labels={{ compare: typeof vs === "string" ? vs : t.vsPrevious }}
          />
        ),
      },
      {
        type: "funnel",
        title: t.widgets.funnel,
        description: t.widgetHints.funnel,
        unique: true,
        minCols: 2,
        minRows: 4,
        defaultCols: 2,
        defaultRows: 4,
        render: () => (
          <div className="[&_[data-slot=card-header]]:hidden [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card-content]]:px-0">
            <FunnelChart
              steps={[
                { id: "sessions", label: t.funnelSteps.sessions, count: funnel.sessions, detail: "session_start" },
                { id: "cart", label: t.funnelSteps.addToCart, count: funnel.addToCart, detail: "add_to_cart" },
                { id: "checkout", label: t.funnelSteps.checkout, count: funnel.checkout, detail: "begin_checkout" },
                { id: "purchase", label: t.funnelSteps.purchase, count: funnel.purchase, detail: "purchase" },
              ]}
            />
          </div>
        ),
      },
      {
        type: "top-products",
        title: t.widgets.topProducts,
        description: t.widgetHints.topProducts,
        minCols: 1,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        fields: [{ key: "limit", label: t.widgets.topProducts, type: "number", min: 3, max: 10 }],
        defaultSettings: { limit: 5 },
        render: ({ settings }) => {
          const top = storeTopN(
            topProducts.map((p) => ({ ...p, value: p.revenue })),
            Number(settings.limit ?? 5),
          );
          if (top.length === 0) return <p className="py-6 text-center text-body-sm text-muted-foreground">{t.noRows}</p>;
          return (
            <ol data-slot="store-dashboard-top-products" className="flex flex-col divide-y divide-border">
              {top.map((p) => (
                <MenuRow key={p.id} actions={productMenu(p.id)} className="flex items-center gap-3 py-2">
                  <Thumb src={p.image} />
                  <div className="min-w-0 flex-1">
                    {onOpenProduct ? (
                      <button type="button" onClick={() => onOpenProduct(p.id)} dir="auto" className="block max-w-full truncate rounded-control text-start text-label text-foreground outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">
                        {p.name}
                      </button>
                    ) : (
                      <span dir="auto" className="block truncate text-label text-foreground">
                        {p.name}
                      </span>
                    )}
                    <span className="text-caption text-muted-foreground">{t.units(p.units)}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <Price amount={major(p.revenue)} currency={currency} fractionDigits={0} size="sm" />
                    <ChangePill value={p.revenue} previous={p.previousRevenue} />
                  </div>
                </MenuRow>
              ))}
            </ol>
          );
        },
      },
      {
        type: "categories",
        title: t.widgets.categories,
        description: t.widgetHints.categories,
        minCols: 1,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        render: () => (
          <BreakdownTable className={FLAT} rows={breakdown(categories)} dimensionLabel={t.dimension.category} valueLabel={t.revenue} format={money} limit={5} label={t.widgets.categories} labels={{ empty: t.noRows }} />
        ),
      },
      {
        type: "channels",
        title: t.widgets.channels,
        description: t.widgetHints.channels,
        minCols: 1,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        render: () => {
          const sorted = storeTopN(
            channels.map((c) => ({ ...c })),
            channels.length,
          );
          return (
            <div className="flex flex-col gap-3">
              {sorted.length > 0 ? (
                <SegmentBar
                  legend={false}
                  inlineLabels={false}
                  size="md"
                  segments={sorted.map((c, i) => ({ id: c.id, label: c.label, value: c.value, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                />
              ) : null}
              <BreakdownTable
                className={FLAT}
                rows={sorted.map((c, i) => ({
                  id: c.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span dir="auto" className="truncate">
                        {c.label}
                      </span>
                    </span>
                  ),
                  value: major(c.value),
                  previous: c.previous === undefined ? undefined : major(c.previous),
                }))}
                dimensionLabel={t.dimension.channel}
                valueLabel={t.sales}
                format={money}
                limit={6}
                label={t.widgets.channels}
                labels={{ empty: t.noRows }}
              />
            </div>
          );
        },
      },
      {
        type: "cities",
        title: t.widgets.cities,
        description: t.widgetHints.cities,
        minCols: 1,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        render: () => (
          <BreakdownTable className={FLAT} rows={breakdown(cities)} dimensionLabel={t.dimension.city} valueLabel={t.sales} format={money} limit={6} label={t.widgets.cities} labels={{ empty: t.noRows }} />
        ),
      },
      {
        type: "low-stock",
        title: t.widgets.lowStock,
        description: t.widgetHints.lowStock,
        unique: true,
        minCols: 1,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        render: () => {
          if (lowStock.length === 0) {
            return <EmptyState className="border-0 py-6" title={t.noLowStock} description={t.noLowStockHint(lowStockThreshold)} />;
          }
          return (
            <ul data-slot="store-dashboard-low-stock" className="flex flex-col divide-y divide-border">
              {lowStock.map((item) => {
                const actions: ContextMenuAction[] = [
                  ...(onRestock ? [{ id: "restock", label: t.restock, onSelect: () => onRestock(item), group: "stock" }] : []),
                  ...(onOpenProduct ? [{ id: "open", label: t.openProduct, onSelect: () => onOpenProduct(item.productId), group: "open" }] : []),
                ];
                const out = item.level === "out";
                return (
                  <MenuRow key={item.variantId} actions={actions} className="flex items-center gap-3 py-2">
                    <Thumb src={item.image} />
                    <div className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-label text-foreground">
                        {item.productName}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                        {item.variantLabel ? <span dir="auto" className="truncate">{item.variantLabel}</span> : null}
                        {item.sku ? (
                          <bdi dir="ltr" className="shrink-0 tabular-nums">
                            {item.sku}
                          </bdi>
                        ) : null}
                      </span>
                    </div>
                    <Badge variant={out ? "danger" : "warning"}>
                      {out ? <PackageX aria-hidden /> : <AlertTriangle aria-hidden />}
                      {out ? t.outOfStock : t.left(item.stock)}
                    </Badge>
                    {onRestock ? (
                      <Button size="sm" variant="secondary" aria-label={t.restockItem(item.productName)} onClick={() => onRestock(item)}>
                        {t.restock}
                      </Button>
                    ) : null}
                  </MenuRow>
                );
              })}
            </ul>
          );
        },
      },
      {
        type: "recent-orders",
        title: t.widgets.recentOrders,
        description: t.widgetHints.recentOrders,
        unique: true,
        minCols: 2,
        minRows: 2,
        defaultCols: 2,
        defaultRows: 2,
        render: () => (
          <RecentOrders orders={recentOrders} columns={orderColumns} label={t.ordersTable} empty={t.noOrders} openLabel={t.openOrder} onOpenOrder={onOpenOrder} />
        ),
      },
    ];
    // The widget definitions close over the data on purpose: the board re-renders them when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, money, currency, series, previousSeries, funnel, topProducts, categories, channels, cities, lowStock, lowStockThreshold, recentOrders, onOpenOrder, onOpenProduct, onRestock, vs]);

  const tile = (
    key: keyof typeof kpis,
    label: string,
    icon: ReactNode,
    value: number,
    format: Parameters<typeof Num>[0]["format"],
    spark?: readonly number[],
    invert = false,
  ) => (
    <StatCard
      key={key}
      icon={icon}
      label={label}
      value={value}
      format={format}
      delta={kpis[key].change}
      deltaLabel={kpis[key].change === undefined ? undefined : vs}
      invert={invert}
      sparkline={spark && spark.length > 1 ? spark : undefined}
      sparklineLabel={spark && spark.length > 1 ? t.salesSpark(label) : undefined}
      loading={loading}
    />
  );

  if (error) {
    return (
      <section data-slot="store-dashboard" aria-label={t.region} className={cn("flex w-full min-w-0 flex-col gap-4", className)}>
        {toolbar}
        <ErrorState title={typeof error === "string" ? error : t.errorTitle} actions={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} />
      </section>
    );
  }

  return (
    <section data-slot="store-dashboard" aria-label={t.region} aria-busy={loading || undefined} className={cn("flex w-full min-w-0 flex-col gap-4", className)}>
      {toolbar}
      {isEmpty && !loading ? (
        <EmptyState icon={Store} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <>
          <StatGrid role="group" aria-label={t.kpis} data-slot="store-dashboard-kpis" className="grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
            {tile("sales", t.sales, <Banknote />, major(kpis.sales.value), money, sparks.sales)}
            {tile("orders", t.orders, <ShoppingBag />, kpis.orders.value, undefined, sparks.orders)}
            {tile("aov", t.aov, <Receipt />, major(kpis.aov.value), money, sparks.aov)}
            {tile("conversion", t.conversion, <Percent />, kpis.conversion.value, { style: "percent", maximumFractionDigits: 1 }, sparks.conversion)}
            {tile("returning", t.returning, <Repeat />, kpis.returning.value, { style: "percent", maximumFractionDigits: 0 })}
            {liveVisitors ? (
              <StatCard
                data-slot="store-dashboard-live"
                icon={<Users />}
                label={
                  <span className="flex items-center gap-2">
                    {t.live}
                    <Badge variant="success">
                      <span aria-hidden className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                      {t.liveBadge}
                    </Badge>
                  </span>
                }
                value={
                  <span className="flex flex-col">
                    <Num value={liveVisitors.count} />
                    <span className="text-caption font-normal text-muted-foreground">{t.liveHint}</span>
                  </span>
                }
                sparkline={liveVisitors.history && liveVisitors.history.length > 1 ? liveVisitors.history : undefined}
                sparklineLabel={t.live}
                loading={loading}
              />
            ) : null}
          </StatGrid>
          <DashboardBoard widgets={widgets} layout={boardLayout} rowHeight={rowHeight} loading={loading} onSave={(next) => (onLayoutChange ? onLayoutChange(next) : setInnerLayout(next))} defaultLayout={STORE_DASHBOARD_LAYOUT} />
        </>
      )}
    </section>
  );
}

interface RecentOrdersProps {
  orders: readonly CommerceOrder[];
  columns: DataTableColumn<CommerceOrder>[];
  label: string;
  empty: string;
  openLabel: string;
  onOpenOrder?: (order: CommerceOrder) => void;
}

function RecentOrders({ orders, columns, label, empty, openLabel, onOpenOrder }: RecentOrdersProps) {
  const table = useDataTable<CommerceOrder>({ data: [...orders], columns, getRowId: (o) => o.id, defaultSort: { id: "number", direction: "desc" } });
  return (
    <DataTable
      table={table}
      label={label}
      rowLabel={(o) => o.number}
      empty={empty}
      onRowClick={onOpenOrder}
      rowActions={onOpenOrder ? (o) => [{ id: "open", label: openLabel, onSelect: () => onOpenOrder(o) }] : undefined}
    />
  );
}
