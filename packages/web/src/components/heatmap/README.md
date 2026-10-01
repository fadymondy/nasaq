---
name: heatmap
title: Heatmap
category: charts
status: beta
summary: GitHub-style contribution grid. One cell per day, one column per week, five intensity levels of a token colour, a tooltip per day and a legend. Time runs right to left in RTL.
exports: [Heatmap, HeatmapProps, HeatmapDatum, heatmapLevel, parseHeatmapDay]
related: [chart, calendar, tooltip, stat-card]
story: components-charts-maps-heatmap
base-ui: [tooltip]
keywords: [heatmap, contributions, activity, calendar heatmap, streak, grid]
---

# Heatmap

Shows how much happened on each day of a range: commits, orders, logins. Days are cells, weeks are columns and the
cell's shade is its count relative to the busiest day. Labels for months and weekdays come from `Intl`, and the week
starts on the locale's first day. Each cell opens a tooltip with the localized date and the count.

## When to use

- A year (or a few months) of activity where the pattern matters more than exact values.
- A compact "streak" view on a profile or dashboard.

## When not to use

- Exact values or trends: use a [`Chart`](../chart/README.md).
- Picking a date: use a [`Calendar`](../calendar/README.md) or `DatePicker`.

## Import

```tsx
import { Heatmap } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Heatmap } from "@fadymondy/nasaq/web";

const data = [
  { date: "2026-09-27", count: 3 },
  { date: "2026-09-28", count: 8 },
  { date: "2026-09-29", count: 1 },
];

export function Activity() {
  return <Heatmap data={data} to="2026-09-29" label="Commits by day" />;
}
```

## Anatomy

```
Heatmap                       data-slot="heatmap"; sets dir and lang
├─ weekday labels             aria-hidden, every second row
├─ grid                       role="grid" (one tab stop)
│  └─ week column
│     ├─ month label          aria-hidden, on the week containing the 1st
│     └─ row                  role="row"
│        └─ cell              role="gridcell" data-date data-level, a Tooltip trigger
└─ legend                     Less, five levels, More     data-slot="heatmap-legend"
```

## API

### `Heatmap`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `readonly HeatmapDatum[]` | required | `{ date, count }` entries. Several entries for one day are summed. |
| `from?` | `Date \| string` | 52 weeks before `to` | First day of the range. |
| `to?` | `Date \| string` | today | Last day of the range. |
| `color?` | `string` | `"var(--primary)"` | Any CSS colour, normally a token such as `var(--nq-tag-teal)`. |
| `thresholds?` | `[number, number, number, number]` | quarters of the max | Smallest counts of levels 1 to 4, ascending. |
| `cellSize?` | `number` | `12` | Cell size in px. |
| `gap?` | `number` | `3` | Gap in px. |
| `weekStartsOn?` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | from the locale | 0 is Sunday. |
| `legend?` | `boolean` | `true` | Show the "Less ... More" legend. |
| `formatCount?` | `(count: number) => string` | English or Arabic plural text | Text of a count in the tooltip and accessible name, for example `"5 orders"`. |
| `label?` | `string` | "Activity by day" | Accessible name of the grid. Localise it. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for isolated demos. |
| `className?` | `string` | none | Merged onto the root. |

### `HeatmapDatum`

`{ date: Date | string; count: number }`. A string is a local day, `"2026-09-29"`; it is never read as UTC, so the day does not shift.

### Helpers

| Export | Description |
| --- | --- |
| `heatmapLevel(count, max, thresholds?)` | Level `0` to `4`. 0 for no activity, otherwise `ceil(count / max * 4)` or the level from `thresholds`. |
| `parseHeatmapDay(value)` | The local `Date` (midnight) for a `Date` or `"YYYY-MM-DD"`. |

## Examples

### Custom range, colour and unit

```tsx
import { Heatmap } from "@fadymondy/nasaq/web";

export function Orders({ data }: { data: { date: string; count: number }[] }) {
  return (
    <Heatmap
      data={data}
      from="2026-07-01"
      to="2026-09-29"
      color="var(--nq-tag-teal)"
      cellSize={16}
      gap={4}
      thresholds={[1, 4, 8, 12]}
      label="Orders by day"
      formatCount={(n) => `${n} orders`}
    />
  );
}
```

### Arabic

```tsx
import { Heatmap, NasaqProvider } from "@fadymondy/nasaq/web";

export function ActivityAr({ data }: { data: { date: string; count: number }[] }) {
  return (
    <NasaqProvider locale="ar" target="scope">
      <Heatmap data={data} to="2026-09-29" label="الالتزامات حسب اليوم" />
    </NasaqProvider>
  );
}
```

## Accessibility

The grid is `role="grid"` with weeks as `row`s and days as `gridcell`s. Every cell has an accessible name such as
"Sep 29, 2026: 3 contributions", so the value never depends on colour alone. There is one tab stop: the focused day
(the last day at first). Cells are tooltip triggers, so the tooltip shows on focus as well as hover.

| Key | Action |
| --- | --- |
| `Tab` | Enters and leaves the grid. |
| `Up` / `Down` | Previous / next day. |
| `Right` / `Left` | Next / previous week. In RTL the two swap, because time runs right to left. |

- Month names, weekday names and the legend are `aria-hidden`; the cells carry the full date.
- Caller must localise `label` and `formatCount`. Defaults exist for English and Arabic.

## RTL & i18n

- The week columns are a plain flex row under `dir`, so the oldest week is at the start edge: at the left in English and at the right in Arabic. Weekday labels sit at the start edge too.
- The week start comes from `Intl.Locale` (Saturday for `ar`, Sunday for `en-US`); `weekStartsOn` overrides it.
- Dates go through `DateTime` and `formatDate`, so digits are Western by default like the rest of Nasaq.
- The count text uses Arabic plural forms (zero, one, two, few, many).

## Styling & tokens

- The colour is one token, set as `--heat` on the root. The five levels are `color-mix(in oklab, var(--heat) N%, transparent)` with N of 9, 35, 55, 78 and 100. No hex.
- Cells use `data-level` (0 to 4) and `data-date`. Focus uses `nq-focus`.
- Size with `cellSize` and `gap`; extend the root with `className`. Never override colours with raw hex.

## Do / Don't

- **Do** pass a `formatCount` with the real unit ("orders", "logins").
- **Do** pick a colour with enough contrast against the surface in light and dark; tag tokens do.
- **Don't** show it for very short ranges; use a list or a chart.
- **Don't** read colour alone for values; the tooltip and cell names carry the number.

## Related

- [Chart](../chart/README.md) · [Calendar](../calendar/README.md) · [Tooltip](../tooltip/README.md) · [StatCard](../stat-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-charts-maps-heatmap--docs
