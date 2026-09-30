---
name: metric-tiles
title: MetricTiles
category: analytics
status: beta
summary: A row of KPI tiles, each with the change against the previous period, a sparkline and optional selection to drive a chart.
exports: [MetricTiles, MetricTilesProps, MetricTileData, MetricTilesLabels]
related: [stat-card, time-series-panel, chart, numeric]
story: components-analytics-metric-tiles
base-ui: []
keywords: [kpi, metric, tiles, comparison, delta, analytics, sparkline]
---

# MetricTiles

MetricTiles lays out `StatCard`s for an analytics report. Give it each metric's value and the value for the comparison period; it works out the change, tones it (up is good unless `invert`), and prints "was 42,980" next to it. With `onSelect` the tiles become a single-choice group that picks which metric a chart below shows, as Google Analytics and Search Console do.

## When to use

- The top of any analytics page: users, sessions, clicks, views, latency.
- Metrics that must be read against the previous period.
- A tile row that also switches a chart's metric.

## When not to use

- One number with no comparison: use [`StatCard`](../stat-card/README.md).
- Many exact rows: use [`DataTable`](../data-table/README.md).
- A series over time: use [`TimeSeriesPanel`](../time-series-panel/README.md).

## Import

```tsx
import { MetricTiles } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { MetricTiles } from "@fadymondy/nasaq/web";

export function Kpis() {
  return (
    <MetricTiles
      metrics={[
        { id: "users", label: "Users", value: 48210, previous: 42980, sparkline: [4, 6, 5, 9, 8, 12] },
        { id: "bounce", label: "Bounce rate", value: 0.388, previous: 0.412, format: { style: "percent", maximumFractionDigits: 1 }, invert: true },
      ]}
    />
  );
}
```

## Anatomy

```
MetricTiles           data-slot="metric-tiles"  (a StatGrid; role="group")
  StatCard            one per metric; a button with aria-pressed when onSelect is set
```

## API

### MetricTiles

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `metrics` | `readonly MetricTileData[]` | required | The tiles, in order. |
| `selected` | `string` | none | Id of the selected tile (controlled). Only used with `onSelect`. |
| `onSelect` | `(id: string) => void` | none | Makes the tiles selectable. |
| `comparisonLabel` | `ReactNode` | `vs previous period` | Text before "was …". Localise it if you override it. |
| `loading` | `boolean` | `false` | Skeleton tiles; with no `metrics` shows `skeletons` of them. |
| `skeletons` | `number` | `4` | How many skeleton tiles to show while loading with no metrics. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<MetricTilesLabels>` | none | Replace any built-in English or Arabic string. |

### MetricTileData

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Stable id, reported by `onSelect`. |
| `label` | `ReactNode` | required | What is measured. |
| `value` | `number` | required | The current value. |
| `previous` | `number` | none | The value for the comparison period. Omit to hide the change. |
| `format` | `FormatNumberOptions` | none | Intl options for `value` and `previous`. |
| `display` | `ReactNode` | none | Replaces the formatted value, for durations such as "1m 38s". |
| `previousDisplay` | `ReactNode` | none | Replaces the formatted previous value. |
| `invert` | `boolean` | `false` | Down is good (bounce rate, latency, error rate). |
| `sparkline` | `readonly number[]` | none | Trend values. |
| `sparklineLabel` | `string` | none | Screen-reader summary of the sparkline. |
| `icon` | `ReactNode` | none | A lucide icon. |

## Examples

Selectable tiles driving a chart:

```tsx
import { MetricTiles, TimeSeriesPanel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Report({ tiles, series }: { tiles: React.ComponentProps<typeof MetricTiles>["metrics"]; series: React.ComponentProps<typeof TimeSeriesPanel>["data"] }) {
  const [metric, setMetric] = useState("clicks");
  return (
    <>
      <MetricTiles metrics={tiles} selected={metric} onSelect={setMetric} />
      <TimeSeriesPanel metrics={[{ id: "clicks", label: "Clicks" }, { id: "impressions", label: "Impressions" }]} data={series} metric={metric} onMetricChange={setMetric} />
    </>
  );
}
```

Duration shown as text:

```tsx
import { MetricTiles } from "@fadymondy/nasaq/web";

export const Time = () => <MetricTiles metrics={[{ id: "t", label: "Avg. engagement time", value: 98, previous: 104, display: "1m 38s", previousDisplay: "1m 44s" }]} />;
```

Arabic:

```tsx
import { MetricTiles } from "@fadymondy/nasaq/web";

export const Ar = () => <MetricTiles comparisonLabel="مقارنة بالفترة السابقة" metrics={[{ id: "u", label: "المستخدمون", value: 48210, previous: 42980 }]} />;
```

## Accessibility

Without `onSelect` the tiles are a labelled group of text. With it, each tile is a button with `aria-pressed`, reachable with Tab and toggled with Enter or Space. The change is shown by an arrow, a sign and a colour together. Localise `label`, `sparklineLabel` and `comparisonLabel`.

## RTL & i18n

- Logical properties throughout; arrows and sparklines mirror.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.
- Built-in strings ("vs previous period", "was") are available in English and Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Target `[data-slot="metric-tiles"]`; extend with `className`.

## Do / Don't

- Do pass `previous` so every tile shows its change.
- Do set `invert` for metrics where lower is better.
- Don't put more than about six tiles in a row.
- Don't pass a percentage as `12.4`; pass the fraction `0.124`.

## Related

- [`stat-card`](../stat-card/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`chart`](../chart/README.md)
- [`numeric`](../numeric/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-metric-tiles--docs
