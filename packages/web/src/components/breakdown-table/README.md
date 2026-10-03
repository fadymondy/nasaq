---
name: breakdown-table
title: BreakdownTable
category: analytics
status: beta
summary: A top-N table where each row carries a bar sized against the largest value, with share and change against the previous period.
exports: [BreakdownTable, BreakdownTableProps, BreakdownRow, BreakdownColumn, BreakdownTableLabels]
related: [geo-list, table, data-table, metric-tiles]
story: components-analytics-breakdown-table
base-ui: []
keywords: [top pages, channels, sources, devices, bar, share, analytics, breakdown]
---

# BreakdownTable

BreakdownTable answers "what makes up this number?": traffic channels, source / medium, top pages, devices, traffic sources. Rows are sorted by value, each has a bar sized against the largest, a share of the total and, when `previous` is given, the change. Long lists collapse to `limit` rows with a "Show all" button.

## When to use

- Top-N lists in an analytics report.
- Any single-measure ranking that benefits from a bar.
- Adding extra columns with `columns`.

## When not to use

- Several measures per row that users sort: use [`DataTable`](../data-table/README.md).
- Countries with flags: use [`GeoList`](../geo-list/README.md).
- Search queries with CTR and position: use [`SearchPerformanceTable`](../search-performance-table/README.md).

## Import

```tsx
import { BreakdownTable } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { BreakdownTable } from "@fadymondy/nasaq/web";

export function Channels() {
  return (
    <BreakdownTable
      title="Channels"
      dimensionLabel="Channel"
      valueLabel="Sessions"
      rows={[
        { id: "organic", label: "Organic Search", value: 28100, previous: 24800 },
        { id: "direct", label: "Direct", value: 13400, previous: 14100 },
      ]}
    />
  );
}
```

## Anatomy

```
BreakdownTable         data-slot="breakdown-table"  (a Card)
  Table                label, value, share, change and extra columns
    row bar            data-slot="breakdown-bar"
  Show all button      when there are more than `limit` rows
```

## API

### BreakdownTable

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `readonly BreakdownRow[]` | required | `{ id, label, value, previous?, href? }`. Sorted by value. |
| `dimensionLabel` | `ReactNode` | required | Heading of the first column. |
| `valueLabel` | `ReactNode` | required | Heading of the value column. |
| `title / description / action` | `ReactNode` | none | Card header. |
| `format` | `FormatNumberOptions` | none | Intl options for values. |
| `limit` | `number` | `8` | Rows shown before "Show all". |
| `showShare` | `boolean` | `true` | Share-of-total column (hidden on narrow screens). |
| `invert` | `boolean` | `false` | Down is good for the change column. |
| `color` | `string` | `var(--primary)` | Bar colour, a token. |
| `ltrLabels` | `boolean` | `false` | Keep labels left-to-right in RTL: URLs, paths, source / medium. |
| `columns` | `readonly BreakdownColumn[]` | none | Extra columns: `{ id, header, cell(row), align? }`. |
| `label` | `string` | `title` | Accessible name of the table. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<BreakdownTableLabels>` | none | Replace any built-in English or Arabic string. |

## Examples

URLs stay left-to-right:

```tsx
import { BreakdownTable } from "@fadymondy/nasaq/web";

export const Pages = () => <BreakdownTable title="Top pages" dimensionLabel="Page" valueLabel="Sessions" ltrLabels rows={[{ id: "a", label: "/docs/getting-started", value: 4210, href: "/docs/getting-started" }]} />;
```

An extra column:

```tsx
import { BreakdownTable } from "@fadymondy/nasaq/web";

export const Videos = () => (
  <BreakdownTable
    title="Top videos"
    dimensionLabel="Video"
    valueLabel="Views"
    showShare={false}
    rows={[{ id: "v1", label: "RTL dashboard in 20 minutes", value: 18400 }]}
    columns={[{ id: "watch", header: "Watch time (h)", align: "end", cell: () => "612" }]}
  />
);
```

Arabic:

```tsx
import { BreakdownTable } from "@fadymondy/nasaq/web";

export const Ar = () => <BreakdownTable title="القنوات" dimensionLabel="القناة" valueLabel="الجلسات" rows={[{ id: "o", label: "البحث المجاني", value: 28100, previous: 24800 }]} />;
```

## Accessibility

A real `table` with column headers and a name from `label` or `title`. Bars are decorative (`aria-hidden`); the values and shares are text. The change is a signed percentage, toned green or red, never colour alone. Links are ordinary anchors.

## RTL & i18n

- Columns and bars run from the inline start; the value columns align to the end.
- Set `ltrLabels` for URLs and source / medium so they are not reordered.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Bar track uses `--nq-surface-soft`; up and down use `--nq-success-text` and `--nq-danger-text`.

## Do / Don't

- Do give `previous` so users see movement.
- Do use `ltrLabels` for paths and URLs.
- Don't use it for more than one measure.
- Don't set `limit` above about 15; link to a full report instead.

## Related

- [`geo-list`](../geo-list/README.md)
- [`table`](../table/README.md)
- [`data-table`](../data-table/README.md)
- [`metric-tiles`](../metric-tiles/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-analytics-breakdown-table--docs
