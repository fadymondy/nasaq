---
name: search-performance-table
title: SearchPerformanceTable
category: seo
status: beta
summary: Queries or pages with clicks, impressions, CTR and average position, sortable, filterable and paginated, with change against the previous period.
exports: [SearchPerformanceTable, SearchPerformanceTableProps, SearchPerformanceRow, SearchPerformanceTableLabels]
related: [data-table, breakdown-table, search-console-page]
story: components-seo-search-performance-table
base-ui: []
keywords: [search console, queries, pages, clicks, impressions, ctr, position, seo]
---

# SearchPerformanceTable

SearchPerformanceTable is the Queries and Pages report of Search Console, built on `DataTable`. Each row has clicks, impressions, CTR and average position. CTR is computed from clicks and impressions when you do not give it. Position is lower-is-better, so a fall in position is shown as an improvement.

## When to use

- Search queries and landing pages with SEO metrics.
- Any table of clicks, impressions, CTR and position.

## When not to use

- One measure ranked: use [`BreakdownTable`](../breakdown-table/README.md).
- Arbitrary columns: use [`DataTable`](../data-table/README.md).

## Import

```tsx
import { SearchPerformanceTable } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { SearchPerformanceTable } from "@fadymondy/nasaq/web";

export function Queries() {
  return (
    <SearchPerformanceTable
      rows={[{ id: "q1", label: "rtl react components", clicks: 420, impressions: 9800, position: 4.2, previousClicks: 380, previousPosition: 5.1 }]}
    />
  );
}
```

## Anatomy

```
SearchPerformanceTable  data-slot="search-performance-table"  (a Card)
  DataTableToolbar      filter box
  DataTable             label, clicks, impressions, CTR, position
  DataTablePagination
```

## API

### SearchPerformanceTable

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `readonly SearchPerformanceRow[]` | required | `{ id, label, clicks, impressions, ctr?, position, previousClicks?, previousPosition? }`. |
| `kind` | `"query" \| "page"` | `query` | Picks the first column's heading, the filter placeholder and left-to-right labels for pages. |
| `title / description` | `ReactNode` | none | Card header; defaults to "Search queries" or "Search pages". |
| `pageSize` | `number` | `10` | Rows per page. |
| `onRowClick` | `(row) => void` | none | Makes rows clickable. |
| `loading` | `boolean` | `false` | Skeleton. |
| `error / onRetry` | `ReactNode / () => void` | none | Error state with a retry button. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<SearchPerformanceTableLabels>` | none | Replace any built-in English or Arabic string. |

## Examples

Pages:

```tsx
import { SearchPerformanceTable } from "@fadymondy/nasaq/web";

export const Pages = () => <SearchPerformanceTable kind="page" rows={[{ id: "p1", label: "https://nasaq.dev/docs", clicks: 900, impressions: 21000, position: 3.4 }]} />;
```

Row click opens details:

```tsx
import { SearchPerformanceTable } from "@fadymondy/nasaq/web";

export const Clickable = () => <SearchPerformanceTable onRowClick={(row) => console.log(row.id)} rows={[{ id: "q", label: "hijri date picker", clicks: 90, impressions: 4200, position: 7.8 }]} />;
```

## Accessibility

Built on `DataTable`: a real table, sortable headers with `aria-sort`, a labelled filter input and paginated rows. Clickable rows are focusable and respond to Enter. Position change is a signed number with an arrow, not colour alone.

## RTL & i18n

- Query text follows its own direction (`dir="auto"`); URLs stay left-to-right.
- Numbers, CTR and position are bidi-isolated.
- The filter box and pagination mirror.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Improvements use `--nq-success-text`, declines `--nq-danger-text`.

## Do / Don't

- Do treat position as lower-is-better.
- Don't show CTR you calculated from rounded numbers; pass the API's `ctr`.

## Related

- [`data-table`](../data-table/README.md)
- [`breakdown-table`](../breakdown-table/README.md)
- [`search-console-page`](../search-console-page/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-seo-search-performance-table--docs
