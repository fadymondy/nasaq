---
name: stat-card
title: StatCard
category: data-display
status: beta
summary: KPI tile with a label, a large tabular figure, a good/bad delta, an optional sparkline and icon, a loading skeleton, and a responsive StatGrid.
exports: [StatCard, StatCardProps, StatGrid, StatTrend, StatTone]
related: [chart, card, numeric, data-table]
story: components-data-display-stat-card
base-ui: []
keywords: [stat, kpi, metric, delta, trend, sparkline, dashboard, tile]
---

# StatCard

A single metric on a `Card`: what it is, its value, how it changed since the last period, and optionally a trend line. The value
is a `Num` (tabular digits, locale formatting). The delta is toned by whether the change is good: up is good by default; set
`invert` for cost-style metrics where down is good. The tone is shown with an arrow and a sign as well as colour.

## When to use

- Headline numbers at the top of a dashboard or report.
- A metric that needs its change over time next to it.

## When not to use

- A series of values: use [`ChartContainer`](../chart/README.md).
- Many exact rows: use [`DataTable`](../data-table/README.md).
- A generic container: use [`Card`](../card/README.md).

## Import

```tsx
import { StatCard, StatGrid } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { StatCard, StatGrid } from "@fadymondy/nasaq/web";
import { Wallet } from "lucide-react";

export function Kpis() {
  return (
    <StatGrid>
      <StatCard
        icon={<Wallet />}
        label="Revenue"
        value={48210}
        format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }}
        delta={0.124}
        deltaLabel="vs last month"
        sparkline={[4, 6, 5, 9, 8, 12]}
      />
      <StatCard label="Cloud cost" value={9120} delta={-0.06} invert deltaLabel="vs last month" />
    </StatGrid>
  );
}
```

## Anatomy

```
StatCard                data-slot="stat-card"  data-trend="up|down|flat"  data-tone="positive|negative|neutral"
  stat-card-icon        data-slot="stat-card-icon"    (optional)
  stat-card-label       data-slot="stat-card-label"
  stat-card-value       data-slot="stat-card-value"
  stat-card-delta       data-slot="stat-card-delta"   (when delta is set)
  Sparkline             data-slot="sparkline"         (when sparkline is set)
  stat-card-skeleton    data-slot="stat-card-skeleton" (when loading)
StatGrid                data-slot="stat-grid"
```

## API

### StatCard

Extends `Card` props (except `children`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `ReactNode` | required | What is measured. Localise it. |
| `value` | `number \| ReactNode` | required | A number is rendered with `Num`; a node is rendered as is. |
| `format` | `FormatNumberOptions` | none | Intl options for a numeric `value`. |
| `delta` | `number` | none | Change as a fraction: `0.124` is +12.4%. `0` shows a flat state. |
| `deltaFormat` | `FormatNumberOptions` | percent, 1 decimal, explicit sign | Override the delta format. |
| `deltaLabel` | `ReactNode` | none | Text after the delta ("vs last month"). Localise it. |
| `invert` | `boolean` | `false` | Down is good, up is bad (costs, churn, errors). |
| `sparkline` | `readonly number[]` | none | Trend line values; coloured by the delta tone. |
| `sparklineLabel` | `string` | none | Screen-reader summary of the sparkline; without it, it is decorative. |
| `icon` | `ReactNode` | none | Glyph in a soft tile, for example `<Wallet />`. |
| `loading` | `boolean` | `false` | Skeleton with the same layout; sets `aria-busy`. |

### StatGrid

`div` props. A grid of equal columns, each at least 14rem wide; use `className` to cap the width or change the gap.

## Examples

Cost metric (down is good):

```tsx
import { StatCard } from "@fadymondy/nasaq/web";

export const Cost = () => <StatCard label="Refund rate" value={0.032} format={{ style: "percent", minimumFractionDigits: 1 }} delta={-0.4} invert />;
```

Loading:

```tsx
import { StatCard, StatGrid } from "@fadymondy/nasaq/web";

export const Loading = ({ ready }: { ready: boolean }) => (
  <StatGrid>
    <StatCard label="Users" value={3204} loading={!ready} />
  </StatGrid>
);
```

Arabic:

```tsx
import { StatCard } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <StatCard label="الإيرادات" value={48210} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={0.124} deltaLabel="مقارنة بالشهر الماضي" />
);
```

## Accessibility

The card is a plain group of text; there is no keyboard interaction. Wrap it in a link or button yourself if it navigates.
Trend is conveyed by the arrow, the explicit sign and the tone colour together. `loading` sets `aria-busy` and the skeleton
is `aria-hidden`. Localise `label`, `deltaLabel` and `sparklineLabel`.

## RTL & i18n

- Everything uses logical properties; the layout mirrors in RTL and the trend arrow flips.
- Figures use the active locale with Western digits and are bidi-isolated (`Num`), so "+12.4%" keeps its order.
- The sparkline runs right to left in RTL.

## Styling & tokens

- Tone: `--nq-success-text` / `--nq-danger-text` for the delta, `--nq-success` / `--nq-danger` / `--primary` for the sparkline.
- Target `[data-slot="stat-card"][data-tone="negative"]` for state styling; extend with `className`.

## Do / Don't

- Do set `invert` for metrics where lower is better.
- Do give a `deltaLabel` so the comparison period is clear.
- Don't put more than about six StatCards in one row of a dashboard.
- Don't pass a percentage as `12.4`; pass the fraction `0.124`.

## Related

- [`ChartContainer`](../chart/README.md)
- [`Card`](../card/README.md)
- [`Num`](../numeric/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-stat-card--docs
