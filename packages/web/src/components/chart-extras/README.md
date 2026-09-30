---
name: chart-extras
title: SegmentBar
category: charts
status: beta
summary: Small charts that Recharts does not give you, a proportion bar with a legend of values, a progress ring, a centred funnel with step conversion and a table-row trend cell with a sparkline or mini bar.
exports: [ChartExtrasLabels, SegmentBarSegment, SegmentBarProps, SegmentBar, ProgressRingProps, ProgressRing, FunnelStepsStep, FunnelStepsProps, FunnelSteps, TrendCellProps, TrendCell]
related: [chart, funnel-chart, stat-card, progress, data-table, usage-meter]
story: components-charts-extra-charts
base-ui: []
keywords: [segment bar, proportion, stacked bar, legend, progress ring, donut, funnel, conversion, sparkline, mini bar, trend cell, table cell]
---

# SegmentBar, ProgressRing, FunnelSteps and TrendCell

Four small charts built next to [`ChartContainer`](../chart/README.md). They are HTML and SVG, not Recharts, because they have no axes: a bar cut into shares,
a ring, a funnel and a row cell. `TrendCell` reuses the existing `Sparkline` and `MiniBar` and adds the figure and its change beside them.

Every one of them carries its meaning in text as well as colour: the legend of `SegmentBar` lists each value and share, the ring prints its percentage, `FunnelSteps`
writes the conversion between steps, and `TrendCell` shows an arrow and a signed figure.

## When to use

- `SegmentBar`: how a whole splits (channels, plan mix, ticket status, storage by type), or how much of a capacity is used.
- `ProgressRing`: one completion or utilisation figure in a card, a list row or a table.
- `FunnelSteps`: a short funnel with the conversion between steps in a card. Use `FunnelChart` for a segment comparison or a saved funnel list.
- `TrendCell`: a table column that needs a figure, its change and a mini trend.

## When not to use

- Time series with axes and tooltips: use [`ChartContainer`](../chart/README.md).
- A limit with warning thresholds and a hint: use [`UsageMeter`](../usage-meter/README.md).
- A single KPI with a delta: use [`StatCard`](../stat-card/README.md).

## Import

```tsx
import { SegmentBar, ProgressRing, FunnelSteps, TrendCell } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ProgressRing, SegmentBar } from "@fadymondy/nasaq/web";

export function Overview() {
  return (
    <div className="flex items-center gap-6">
      <ProgressRing value={72} label="Onboarding" caption="of 25 steps" />
      <SegmentBar
        className="flex-1"
        segments={[
          { id: "organic", label: "Organic", value: 4200 },
          { id: "paid", label: "Paid", value: 2100 },
          { id: "referral", label: "Referral", value: 900 },
        ]}
      />
    </div>
  );
}
```

## Anatomy

```
SegmentBar               data-slot="segment-bar"
├─ bar (role="img")      the segments; data-slot="segment-bar-segment" on each
└─ ul                    data-slot="segment-bar-legend": swatch, label, value, share
ProgressRing             data-slot="progress-ring" data-tone role="progressbar"
FunnelSteps              data-slot="funnel-steps"
├─ funnel-steps-step     label, count, share of the first step, the bar
├─ funnel-steps-link     conversion and people lost between two steps, the biggest drop badge
└─ funnel-steps-summary  overall conversion
TrendCell                data-slot="trend-cell" data-trend="up|down|flat"
```

## API

### SegmentBar

`div` props plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | `{ id, label, value, color? }[]` | required | Parts of the whole. Zero and negative values draw nothing but stay in the legend. |
| `total` | `number` | sum of values | The whole. Larger than the sum leaves an empty track (6 of 10 seats). |
| `format` | `FormatNumberOptions` | plain number | Intl options for legend values. |
| `legend` | `boolean` | `true` | Legend with value and share per segment. |
| `inlineLabels` | `boolean` | `true` | Share inside segments of at least 10%. |
| `patterned` | `boolean` | `false` | Hatch patterns over the fills, so segments differ by more than colour. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Bar thickness. |
| `label` | `string` | shares summary | Accessible name of the bar. |
| `restLabel` | `ReactNode` | none | Legend row for the empty track. |
| `labels` | `Partial<ChartExtrasLabels>` | en / ar | Text overrides. |

### ProgressRing

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | Current value. |
| `max` / `min` | `number` | `100` / `0` | The range that fills the ring. |
| `tone` | `"default" \| "info" \| "success" \| "warning" \| "danger" \| "auto"` | `"default"` | `"auto"` turns warning at `warnAt` and danger at `dangerAt` of the range. |
| `warnAt` / `dangerAt` | `number` | `0.8` / `0.95` | Fractions for `tone="auto"`. |
| `size` | `number` | `96` | Diameter in px. |
| `thickness` | `number` | `8` | Stroke width in a 100 unit box. |
| `children` | `ReactNode` | the percentage | The middle figure. |
| `caption` | `ReactNode` | none | Small text under it. |
| `label` | `string` | required | What is measured (accessible name). |
| `valueText` | `string` | "<n>% complete" | Spoken value. |

### FunnelSteps

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `{ id, label, count, detail? }[]` | required | In order, first step is the widest. |
| `format` | `FormatNumberOptions` | plain number | Intl options for counts. |
| `summary` | `boolean` | `true` | Overall conversion line. |
| `label` | `string` | "Funnel steps" | Accessible name. |

### TrendCell

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number \| ReactNode` | required | The figure. |
| `format` | `FormatNumberOptions` | none | For a numeric `value`. |
| `data` | `readonly number[]` | none | Values for the small chart, oldest first. |
| `variant` | `"line" \| "bar"` | `"line"` | `Sparkline` or `MiniBar`. |
| `delta` | `number` | none | Change as a fraction (0.124 is +12.4%). |
| `invert` | `boolean` | `false` | Down is good. |
| `highlight` | `number` | last bar | Bar to emphasise. |
| `chartLabel` | `string` | none | Spoken summary of the small chart. |

### Helpers

`segmentShares(segments, total?)`, `ringFraction(value, max, min)`, `ringGeometry(fraction, strokeWidth)`, `ringToneFor(fraction, warnAt, dangerAt)`, `funnelBarShare(count, first, min)`. Pure functions.

## Examples

A capacity bar:

```tsx
import { SegmentBar } from "@fadymondy/nasaq/web";

export const Seats = () => (
  <SegmentBar
    total={20}
    restLabel="Free"
    segments={[
      { id: "admin", label: "Admins", value: 3 },
      { id: "member", label: "Members", value: 11 },
    ]}
  />
);
```

Usage ring that warns:

```tsx
import { ProgressRing } from "@fadymondy/nasaq/web";

export const Storage = () => (
  <ProgressRing value={92} tone="auto" label="Storage used" caption="46 of 50 GB" />
);
```

A table column:

```tsx
import { TrendCell, type DataTableColumn } from "@fadymondy/nasaq/web";

type Row = { id: string; revenue: number; change: number; weeks: number[] };
export const column: DataTableColumn<Row> = {
  id: "revenue",
  header: "Revenue",
  align: "end",
  cell: (r) => <TrendCell value={r.revenue} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={r.change} data={r.weeks} chartLabel="Revenue, last 8 weeks" />,
  sortValue: (r) => r.revenue,
};
```

Arabic:

```tsx
import { FunnelSteps } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <FunnelSteps
    steps={[
      { id: "visit", label: "زيارة", count: 12000 },
      { id: "cart", label: "إضافة للسلة", count: 3400 },
      { id: "paid", label: "دفع", count: 910 },
    ]}
  />
);
```

## Accessibility

There is no keyboard interaction. The `SegmentBar` bar is `role="img"` with a summary of shares (or your `label`) and the legend is a real list. `ProgressRing` is a
`progressbar` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext`. Each `FunnelSteps` step is announced "Step 2 of 4", and the
biggest drop is a badge with an icon and text. `TrendCell` has a visually hidden "up / down / no change" next to its arrow. Localise `label`, `chartLabel`, segment labels and `labels`.

## RTL & i18n

- Bars grow from the inline start, so `SegmentBar` reads right to left in Arabic; the ring fills the opposite way and the middle text is not mirrored.
- `TrendCell` charts run right to left (they reuse `Sparkline` and `MiniBar`).
- Numbers and percentages use the active locale with Western digits, and are bidi-isolated (`Num`).

## Styling & tokens

- Colours are the chart palette (`CHART_COLORS`), `--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-info`, `--nq-surface-soft`. Pass token strings in `color`.
- Target `[data-slot="segment-bar-segment"]`, `[data-slot="progress-ring"][data-tone="danger"]`, `[data-slot="trend-cell"][data-trend="down"]`; extend with `className`.

## Do / Don't

- Do keep segment counts under about six; group the tail as "Other".
- Do keep the legend on. It is what makes the bar readable without colour.
- Don't use a ring for something that is not a share of a whole or of a target.
- Don't put more than one `ProgressRing` tone meaning on a page without a caption saying what it means.

## Related

- [`ChartContainer`](../chart/README.md)
- [`FunnelChart`](../funnel-chart/README.md)
- [`UsageMeter`](../usage-meter/README.md)
- [`StatCard`](../stat-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-charts-extra-charts--docs
