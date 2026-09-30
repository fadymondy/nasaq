---
name: time-series-panel
title: TimeSeriesPanel
category: analytics
status: beta
summary: A chart card for one metric at a time, with a previous-period comparison line, a metric switcher and threshold lines. Also exports PeriodToggle.
exports: [TimeSeriesPanel, TimeSeriesPanelProps, TimeSeriesMetric, TimeSeriesPoint, TimeSeriesReferenceLine, TimeSeriesPanelLabels, PeriodToggle, PeriodToggleProps]
related: [chart, metric-tiles, stat-card, web-vital-gauge]
story: components-analytics-time-series-panel
base-ui: []
keywords: [chart, time series, period comparison, trend, analytics, area chart]
---

# TimeSeriesPanel

TimeSeriesPanel is the traffic chart of an analytics page. It draws the selected metric as a filled line, can overlay the previous period as a dashed line, shows the total or average with its change, and draws reference lines such as Google's "good" and "poor" limits. It is built on `ChartContainer`, so tooltips, colours and RTL axis handling match the rest of the charts. `PeriodToggle` is the matching 7 / 28 / 90 days control.

## When to use

- Traffic, clicks, views, latency or any metric over days or hours.
- Comparing this period with the last one.
- Showing a metric against fixed thresholds.

## When not to use

- A single small trend: use `Sparkline` from [`chart`](../chart/README.md).
- Share of a total: use [`BreakdownTable`](../breakdown-table/README.md).
- Several unrelated charts: compose [`ChartContainer`](../chart/README.md) directly.

## Import

```tsx
import { TimeSeriesPanel, PeriodToggle } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TimeSeriesPanel } from "@fadymondy/nasaq/web";

export function Traffic() {
  return (
    <TimeSeriesPanel
      title="Traffic"
      metrics={[
        { id: "users", label: "Users" },
        { id: "sessions", label: "Sessions" },
      ]}
      data={[
        { date: "2026-09-27", users: 2100, sessions: 2700 },
        { date: "2026-09-28", users: 2240, sessions: 2890 },
      ]}
      previousData={[
        { date: "2026-08-30", users: 1900, sessions: 2450 },
        { date: "2026-08-31", users: 2010, sessions: 2600 },
      ]}
    />
  );
}
```

## Anatomy

```
TimeSeriesPanel        data-slot="time-series-panel"  (a Card)
  CardHeader           title, description, action
  metric switcher      toggle buttons when there is more than one metric
  compare switch       when previousData is set
  summary              total or average, and its change
  ChartContainer       the area chart, previous line and reference lines
PeriodToggle           data-slot="toggle-group"
```

## API

### TimeSeriesPanel

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `metrics` | `readonly TimeSeriesMetric[]` | required | The metrics the panel can show. |
| `data` | `readonly TimeSeriesPoint[]` | required | One row per day or hour: `date` plus a number per metric id. |
| `previousData` | `readonly TimeSeriesPoint[]` | none | The comparison period, index-aligned with `data`. |
| `title` | `ReactNode` | none | Card title. |
| `description` | `ReactNode` | none | Card description. |
| `metric / defaultMetric / onMetricChange` | `string / string / (id) => void` | `first metric` | Selected metric, controlled or not. |
| `compare / defaultCompare / onCompareChange` | `boolean / boolean / (on) => void` | `false` | Whether the comparison line shows. |
| `referenceLines` | `readonly TimeSeriesReferenceLine[]` | none | Horizontal lines with a label and a tone. |
| `dateFormat` | `FormatDateOptions` | `month and day` | How axis and tooltip dates are written. |
| `chartClassName` | `string` | none | Classes on the chart, to change its height. |
| `action` | `ReactNode` | none | Content at the header's inline end, usually a `PeriodToggle`. |
| `loading` | `boolean` | `false` | Skeleton. |
| `error` | `ReactNode` | none | Shows an error with a retry button instead of the chart. |
| `onRetry` | `() => void` | none | Called by the retry button. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<TimeSeriesPanelLabels>` | none | Replace any built-in English or Arabic string. |

### TimeSeriesMetric

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Key in each data row. |
| `label` | `string` | required | Name in the switcher, tooltip and summary. |
| `format` | `FormatNumberOptions` | none | Intl options for values. |
| `color` | `string` | `var(--primary)` | A token such as `var(--nq-tag-teal)`. |
| `aggregate` | `"sum" \| "avg"` | `sum` | How the summary combines the period; use `avg` for rates and positions. |
| `lowerIsBetter` | `boolean` | `false` | Tones the change: down is good. |

### PeriodToggle

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `readonly number[]` | `[7, 28, 90]` | Period lengths. |
| `value` | `number` | required | Selected length. |
| `onValueChange` | `(days: number) => void` | required | Called with the new length. |
| `labels` | `{ period?, lastDays? }` | none | `lastDays` is `(n) => string`; the APM page uses it for hours. |
| `className` | `string` | none | Extra classes on the root. |

## Examples

Against Google's LCP thresholds:

```tsx
import { TimeSeriesPanel } from "@fadymondy/nasaq/web";

export const Lcp = ({ data }: { data: { date: string; lcp: number }[] }) => (
  <TimeSeriesPanel
    title="LCP (p75)"
    metrics={[{ id: "lcp", label: "LCP (ms)", aggregate: "avg", lowerIsBetter: true }]}
    data={data}
    referenceLines={[
      { value: 2500, label: "Good 2.5 s", tone: "success" },
      { value: 4000, label: "Poor 4 s", tone: "danger" },
    ]}
  />
);
```

Period control in the header:

```tsx
import { PeriodToggle, TimeSeriesPanel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Panel({ data }: { data: { date: string; clicks: number }[] }) {
  const [days, setDays] = useState(28);
  return <TimeSeriesPanel title="Clicks" metrics={[{ id: "clicks", label: "Clicks" }]} data={data.slice(-days)} action={<PeriodToggle value={days} onValueChange={setDays} />} />;
}
```

Hourly data:

```tsx
import { TimeSeriesPanel } from "@fadymondy/nasaq/web";

export const Rpm = () => <TimeSeriesPanel metrics={[{ id: "rpm", label: "Requests per minute", aggregate: "avg" }]} data={[{ date: "2026-09-29T09:00", rpm: 1180 }, { date: "2026-09-29T10:00", rpm: 1260 }]} />;
```

## Accessibility

The chart has a text alternative naming the metric and range, and the switcher and comparison switch are ordinary buttons reachable with Tab. Tooltips also show on keyboard focus of the chart. Localise metric labels, `title` and the `labels` you override.

## RTL & i18n

- `useChartAxis` reverses the x axis and moves the y axis to the inline end in RTL, so time runs right to left.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.
- Dates are formatted with the locale and Western digits; day strings ("2026-09-29") are read as local days, so they never shift.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Colours per metric come from `TimeSeriesMetric.color`; the comparison line uses `--muted-foreground`.

## Do / Don't

- Do index-align `previousData` with `data` (day 1 against day 1).
- Do set `aggregate: "avg"` for rates, positions and percentiles.
- Don't put more than about four metrics in one switcher.
- Don't use it for unordered categories.

## Related

- [`chart`](../chart/README.md)
- [`metric-tiles`](../metric-tiles/README.md)
- [`stat-card`](../stat-card/README.md)
- [`web-vital-gauge`](../web-vital-gauge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-time-series-panel--docs
