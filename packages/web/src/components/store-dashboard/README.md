---
name: store-dashboard
title: StoreDashboard
category: analytics
status: beta
summary: Store admin home with sales, orders, average order value, conversion and returning customers against the previous period, a sales chart, conversion funnel, top products, categories, channels and cities, low stock alerts, recent orders and live visitors on a customisable board.
exports: [StoreDashboardLabels, StoreBreakdownRow, StoreTopProduct, StoreLiveVisitors, StoreDashboardProps, STORE_DASHBOARD_LAYOUT, StoreDashboard]
related: [stat-card, charts, funnel-chart, time-range-picker, dashboard-board, report-filter-bar, chart-extras]
story: components-commerce-store-dashboard
base-ui: []
keywords: [store, dashboard, sales, orders, aov, conversion, funnel, low stock, live visitors, ecommerce]
---

# StoreDashboard

The first screen of a store admin. Five KPI tiles (sales, orders, average order value, conversion, returning customers) each show the change against the previous period, then a `DashboardBoard` holds the sales chart, the conversion funnel, top products, categories, sales by channel and by city, low stock alerts and recent orders. Live visitors sit beside the KPIs. It is presentational: you pass totals and series in minor units, it does the maths and the layout.

The KPI maths is a pure module, also exported: `storeSafeDivide`, `storePeriodChange`, `storeAverageOrderValue`, `storeConversionRate`, `storeReturningRate`, `storeKpis`, `storeSeriesTotals`, `storeFunnelCounts`, `storeLowStock`, `storeTopN`, `storeMinorFactor`, `storeToMajor`.

## When to use

- The home page of a store or marketplace admin.

## When not to use

- A single deep report: use `report-filter-bar` with the charts directly.
- Storefront pages: this is for the merchant.

## Import

```tsx
import { StoreDashboard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StoreDashboard } from "@fadymondy/nasaq/web";

<StoreDashboard
  currency="EGP"
  totals={totals}
  previousTotals={previousTotals}
  series={series}
  previousSeries={previousSeries}
  topProducts={topProducts}
  categories={categories}
  channels={channels}
  cities={cities}
  products={products}
  recentOrders={orders}
  liveVisitors={{ count: 74, history }}
  toolbar={<ReportFilterBar {...filters} comparison />}
/>
```

## Anatomy

```
StoreDashboard
├─ toolbar                    your ReportFilterBar
├─ StatGrid                   sales, orders, AOV, conversion, returning, live visitors
└─ DashboardBoard             Customise, drag, resize, reset
   ├─ sales                   TimeSeriesPanel with compare
   ├─ funnel                  FunnelChart: sessions, add to cart, checkout, purchase
   ├─ top-products            image, units, revenue, change
   ├─ categories, cities      BreakdownTable
   ├─ channels                SegmentBar and BreakdownTable
   ├─ low-stock               Badge and Restock button
   └─ recent-orders           DataTable
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `currency` | `string` | `required` | ISO code. Money is in minor units. |
| `totals, previousTotals` | `StorePeriodTotals` | `required, none` | Sales, orders, sessions, customers, returning, add to cart, checkouts. No previous means no change shown. |
| `series, previousSeries` | `StoreSalesPoint[]` | `required, none` | Date, sales, orders and sessions per point. |
| `topProducts` | `StoreTopProduct[]` | `required` | With units, revenue and previous revenue. |
| `categories, channels, cities` | `StoreBreakdownRow[]` | `required` | Value and previous value in minor units. |
| `products, lowStockThreshold` | `CommerceProduct[], number` | `required, 5` | Low stock is worked out from tracked, active variants. |
| `recentOrders` | `CommerceOrder[]` | `required` | Latest orders. |
| `liveVisitors` | `StoreLiveVisitors` |  | Count and a per minute history. |
| `toolbar, comparisonLabel` | `ReactNode, string` |  | Filter bar; the words next to each change. |
| `onOpenOrder, onOpenProduct, onRestock` | `callbacks` |  | Row clicks and the Restock button. |
| `layout, onLayoutChange, rowHeight` | `BoardItem[]` | `default, none, 160` | Saved board layout. |
| `loading, empty, error, onRetry` |  |  | Skeletons, empty state, error state with retry. |
| `labels` | `Partial<StoreDashboardLabels>` |  | Replace any string. |

## Examples

**Save the board layout**

```tsx
<StoreDashboard {...data} layout={saved} onLayoutChange={(next) => save(next)} />
```

## Accessibility

- A change is shown with an arrow and a signed number, never by colour alone.
- Stock status is a word ("Out of stock", "3 left"), not just a colour.
- Chart data is also in the tables beside it; decorative product thumbnails have empty alt text because the name is next to them.
- Row actions are in a context menu and a visible button, so they work with the keyboard.

## RTL & i18n

- The board mirrors. Numbers use the active locale's digits; order numbers and SKUs stay left to right.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; charts use `CHART_COLORS`.
- Target `[data-slot="store-dashboard"]` if present, and the inner parts of the reused components.

## Do / Don't

- Do send money as integer minor units and the ISO currency.
- Do pass `previousTotals` only when you have them: a missing comparison hides the change instead of showing +Infinity.
- Don't fetch in the component; pass data and callbacks.
- Don't pass different period lengths for current and previous and expect a fair comparison.

## Related

- [`stat-card`](../stat-card/README.md)
- [`funnel-chart`](../funnel-chart/README.md)
- [`dashboard-board`](../dashboard-board/README.md)
- [`report-filter-bar`](../report-filter-bar/README.md)
- [`time-range-picker`](../time-range-picker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-store-dashboard--docs
