---
name: funnel-chart
title: FunnelChart
category: analytics
status: beta
summary: "A marketing funnel chart with stages, counts, conversion and drop-off between steps, a breakdown by source or segment, and a list of saved funnels. Bars grow from the inline start, so it reads right to left in Arabic."
exports: [FunnelChartLabels, FunnelStep, FunnelSegment, FunnelChartProps, FunnelChart, barWidth, biggestDropIndex, funnelRows, insertStep, moveStep, overallConversion, removeStep, windowKey, windowMs, FunnelList]
related: [funnel-builder, breakdown-table, metric-tiles, data-table]
story: components-analytics-funnel-chart
base-ui: []
keywords: [funnel, conversion, drop-off, marketing, steps, segments, attribution]
---

# FunnelChart

FunnelChart draws one bar per step, sized against the first step. Each row shows the count, the conversion from the previous step, the share of the first step that got this far and how many people dropped out. The step with the biggest drop is flagged. Pass `segments` to add a breakdown by source or segment underneath. FunnelList is the table of saved funnels with entrants, conversion and its trend.

## When to use

- Signup, checkout or campaign funnels.
- Comparing which source converts best.

## When not to use

- Time trends: use [`TimeSeriesPanel`](../time-series-panel/README.md).
- Creating or editing a funnel: use [`FunnelBuilder`](../funnel-builder/README.md).

## Import

```tsx
import { FunnelChart, FunnelList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { FunnelChart } from "@fadymondy/nasaq/web";

<FunnelChart
  steps={[
    { id: "visit", label: "Visit", count: 12000 },
    { id: "signup", label: "Sign up", count: 3100 },
    { id: "paid", label: "Paid", count: 420 },
  ]}
/>;
```

## Anatomy

```
FunnelChart          data-slot="funnel-chart"
  header             title, description, action (for example a window select)
  step               label, detail, bar (inline-size), count, conversion, drop-off
  segments           BreakdownTable: segment, entered, converted, rate
FunnelList           data-slot="funnel-list"   (DataTable)
```

## API

### FunnelChart

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `FunnelStep[]` | required | `{ id, label, count, detail? }`, in order. `detail` is an event name or path. |
| `title / description` | `ReactNode` | built-in | Header. |
| `segments` | `FunnelSegment[]` | none | `{ id, label, entered, converted }`. |
| `segmentLabel` | `ReactNode` | "Segment" | Heading of the segment column, for example "Source". |
| `action` | `ReactNode` | none | Header end slot. |
| `loading` | `boolean` | `false` | Skeleton. |
| `className / labels` | | none | Classes; `Partial<FunnelChartLabels>` strings. |

### FunnelList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `funnels` | `FunnelSummary[]` | required | `{ id, name, steps, entered, conversion (0 to 1), window, updatedAt, previousConversion? }`. |
| `onOpen / onEdit` | `(id) => void` | none | Row click and actions. |
| `onCreate` | `() => void` | none | Shows a New funnel button. |
| `onDuplicate / onDelete` | `(id) => Promise<void \| { error?: string }>` | none | Row actions. |
| `title / description / pageSize / loading / error / onRetry / className / labels` | | | As in the other lists. |

### Helpers

`funnelRows(steps)` gives conversion from previous and first, dropped count and rate per step (never negative, safe with zeros). `overallConversion`, `biggestDropIndex` (-1 when nothing drops), `barWidth(count, max)` (0 to 1 with a small visible minimum), `windowMs`, `windowKey` (`7d`, `24h`, `2w`) and `moveStep`, `insertStep`, `removeStep`, which return new arrays.

## Examples

By source:

```tsx
import { FunnelChart } from "@fadymondy/nasaq/web";

<FunnelChart steps={steps} segmentLabel="Source" segments={[{ id: "g", label: "Google", entered: 6000, converted: 210 }, { id: "x", label: "Direct", entered: 2000, converted: 120 }]} />;
```

Saved funnels:

```tsx
import { FunnelList } from "@fadymondy/nasaq/web";

<FunnelList funnels={funnels} onOpen={(id) => navigate(`/funnels/${id}`)} onCreate={() => navigate("/funnels/new")} />;
```

## Accessibility

Each step is a list item that reads as "Step 2, Sign up, 3,100 people, 26% of the previous step, 8,900 dropped". The bar is decorative. The flagged drop has a text label, not only a colour.

## RTL & i18n

Bars use `inline-size` and start at the inline start, so in Arabic they grow from the right. Numbers use Latin digits. Event names and paths stay left-to-right. Built-in English and Arabic strings.

## Styling & tokens

Bars use the primary token with decreasing emphasis; the biggest drop uses the warning token. No hard-coded colours.

## Do / Don't

- Do keep steps in the order people actually go through them.
- Do state the time window next to the chart.
- Don't mix people and sessions in the same funnel.

## Related

- [FunnelBuilder](../funnel-builder/README.md)
- [BreakdownTable](../breakdown-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-analytics-funnel-chart--docs
