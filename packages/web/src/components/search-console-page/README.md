---
name: search-console-page
title: SearchConsolePage
category: seo
status: beta
summary: A Search Console report - clicks, impressions, CTR and position tiles that drive the chart, plus queries, pages, countries and devices.
exports: [SearchConsolePage, SearchConsolePageProps, SearchConsoleData, SearchConsolePageLabels, SearchConsoleTotal]
related: [metric-tiles, time-series-panel, search-performance-table, geo-list, breakdown-table, analytics-connect]
story: components-seo-pages-search-console
base-ui: []
keywords: [search console, seo, clicks, impressions, ctr, position, queries]
---

# SearchConsolePage

The Search Console page shows how a site performs in Google Search. Four `MetricTiles` (clicks, impressions, CTR, average position) select the metric a `TimeSeriesPanel` charts, with the previous period as comparison. Tabs hold `SearchPerformanceTable` for queries and pages, `GeoList` for countries and a devices `BreakdownTable`. Average position is lower-is-better everywhere. Until connected it shows `AnalyticsConnect`; the name is text, not a logo.

## When to use

- SEO reporting for a verified site.
- Any host that reads the Search Analytics API.

## When not to use

- Traffic on your site: use [`GoogleAnalyticsPage`](../google-analytics-page/README.md).
- Rank tracking by keyword over time: compose [`TimeSeriesPanel`](../time-series-panel/README.md).

## Import

```tsx
import { SearchConsolePage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { SearchConsolePage } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Seo({ service, data }: { service: React.ComponentProps<typeof SearchConsolePage>["service"]; data?: React.ComponentProps<typeof SearchConsolePage>["data"] }) {
  const [period, setPeriod] = useState(28);
  return <SearchConsolePage service={service} data={data} site="nasaq.dev" period={period} onPeriodChange={setPeriod} onConnect={async () => {}} onDisconnect={async () => {}} />;
}
```

## Anatomy

```
SearchConsolePage      AnalyticsPageFrame
  MetricTiles          selectable; drives the chart
  TimeSeriesPanel      clicks | impressions | CTR | position
  Tabs (underline)     Queries | Pages | Countries | Devices
```

## API

### SearchConsolePage

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `service` | `IntegrationService` | required | The source and its state; anything but `connected` shows the connect screen. |
| `data` | `…Data` | none | The report. While it is undefined the page shows skeletons. |
| `period / onPeriodChange` | `number / (n) => void` | required | The reporting period in days (hours for the APM page). |
| `loading` | `boolean` | `false` | Skeletons. |
| `error / onRetry` | `ReactNode / () => void` | none | Shows an error with a retry button. |
| `onRefresh / refreshing / updatedAt` | `() => Promise / boolean / date` | none | Refresh button and the updated time. |
| `onConnect / onDisconnect / onSelectAccount` | `async callbacks` | required | OAuth and account picker hooks; the host does the real work. |
| `className` | `string` | none | Extra classes on the root. |
| `site` | `string` | none | The verified site, for the subtitle. |
| `onRowClick` | `(row, kind) => void` | none | Called when a query or page row is chosen. |
| `labels / frameLabels` | `Partial<…>` | none | Page strings and the shared header strings. |

### SearchConsoleData

`summary` (clicks, impressions, ctr as a fraction, position; each `{ value, previous?, trend? }`), `series` (rows of `date`, `clicks`, `impressions`, `ctr`, `position`), `previousSeries?`, `queries`, `pages` (`SearchPerformanceRow[]`), `countries` (`GeoRow[]`) and `devices` (`BreakdownRow[]`).



## Examples

Open a query:

```tsx
import { SearchConsolePage, type IntegrationService } from "@fadymondy/nasaq/web";

export const Drill = ({ service }: { service: IntegrationService }) => (
  <SearchConsolePage service={service} period={28} onPeriodChange={() => {}} onRowClick={(row, kind) => console.log(kind, row.label)} onConnect={async () => {}} onDisconnect={async () => {}} />
);
```

Sign-in expired:

```tsx
import { SearchConsolePage } from "@fadymondy/nasaq/web";

export const Expired = () => (
  <SearchConsolePage
    service={{ id: "gsc", name: "Search Console", scopes: [{ id: "webmasters.readonly", label: "See your Search Console data", required: true }], status: "needs-reauth" }}
    period={28}
    onPeriodChange={() => {}}
    onConnect={async () => {}}
    onDisconnect={async () => {}}
  />
);
```

## Accessibility

The page has one `h1`; tabs follow the WAI-ARIA tabs pattern (arrow keys move, the panel is labelled by its tab). Charts and tables carry text alternatives. Disconnect asks for confirmation. Localise every string you override through `labels`.

## RTL & i18n

- The whole page mirrors; charts run right to left.
- URLs, paths and identifiers stay left-to-right inside Arabic text.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.
- Queries follow their own direction; page URLs stay left-to-right.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Composed from tokens only; extend with `className`.

## Do / Don't

- Do give `position` a `previous` value; a lower number shows as an improvement.
- Do pass CTR as the API returns it.
- Don't draw a Search Console logo yourself; use only the official asset.

## Related

- [`metric-tiles`](../metric-tiles/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`search-performance-table`](../search-performance-table/README.md)
- [`geo-list`](../geo-list/README.md)
- [`breakdown-table`](../breakdown-table/README.md)
- [`analytics-connect`](../analytics-connect/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-seo-pages-search-console--docs
