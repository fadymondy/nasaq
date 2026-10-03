---
name: google-analytics-page
title: GoogleAnalyticsPage
category: analytics
status: beta
summary: A Google Analytics report - KPI tiles with comparison, traffic chart, live users, and tabs for sources, pages and audience, with a connect-account screen.
exports: [GoogleAnalyticsPage, GoogleAnalyticsPageProps, GoogleAnalyticsData, GoogleAnalyticsPageLabels, AnalyticsTotal]
related: [metric-tiles, time-series-panel, breakdown-table, geo-list, realtime-counter, analytics-connect, heatmap]
story: components-analytics-pages-google-analytics
base-ui: []
keywords: [google analytics, ga4, traffic, users, sessions, audience, realtime]
---

# GoogleAnalyticsPage

The Google Analytics page composes the analytics blocks: `MetricTiles` (users, sessions, engagement rate, engagement time, key events), a `TimeSeriesPanel` with period comparison, a `RealtimeCounter`, and tabs of `BreakdownTable` (channels, source / medium, pages), `GeoList`, devices and a `Heatmap` of daily sessions. It does no fetching: you give it `data` and callbacks. Until `service.status` is `connected` it shows `AnalyticsConnect`. The product name is text; no logo is drawn unless you set `service.icon` to the official asset.

## When to use

- A traffic and audience overview for a site or app.
- Any host that already reads GA4 through the Data API.

## When not to use

- Search performance: use [`SearchConsolePage`](../search-console-page/README.md).
- Custom KPI dashboards: compose [`MetricTiles`](../metric-tiles/README.md) yourself.

## Import

```tsx
import { GoogleAnalyticsPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { GoogleAnalyticsPage } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Traffic({ service, data }: { service: React.ComponentProps<typeof GoogleAnalyticsPage>["service"]; data?: React.ComponentProps<typeof GoogleAnalyticsPage>["data"] }) {
  const [period, setPeriod] = useState(28);
  return (
    <GoogleAnalyticsPage
      service={service}
      data={data}
      period={period}
      onPeriodChange={setPeriod}
      onConnect={async () => { /* start OAuth */ }}
      onDisconnect={async () => {}}
    />
  );
}
```

## Anatomy

```
GoogleAnalyticsPage    AnalyticsPageFrame
  MetricTiles
  TimeSeriesPanel      + RealtimeCounter
  Tabs (underline)     Sources | Pages | Audience
    BreakdownTable ×2, BreakdownTable, GeoList, BreakdownTable, Heatmap
```

## API

### GoogleAnalyticsPage

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
| `property` | `string` | `first account name` | The property shown, for the subtitle. |
| `range` | `{ from: string; to: string }` | none | Days of the activity calendar; without it the calendar is hidden. |
| `labels / frameLabels` | `Partial<…>` | none | Page strings and the shared header strings. |

### GoogleAnalyticsData

`summary` (users, sessions, engagementRate as a fraction, engagementSeconds, conversions; each `{ value, previous?, trend? }`), `series` (rows of `date`, `users`, `sessions`, `conversions`), `previousSeries?`, `realtime?` (`active`, `perMinute?`, `pages`, `countries`, `updatedAt?`), `channels`, `sourceMedium`, `pages`, `countries`, `devices` and `daily?`.



## Examples

Connect screen:

```tsx
import { GoogleAnalyticsPage } from "@fadymondy/nasaq/web";

export const Connect = () => (
  <GoogleAnalyticsPage
    service={{ id: "ga", name: "Google Analytics", scopes: [{ id: "analytics.readonly", label: "See your Google Analytics reports", required: true }], status: "disconnected" }}
    period={28}
    onPeriodChange={() => {}}
    onConnect={async () => {}}
    onDisconnect={async () => {}}
  />
);
```

Loading and error:

```tsx
import { GoogleAnalyticsPage, type IntegrationService } from "@fadymondy/nasaq/web";

export const Failed = ({ service }: { service: IntegrationService }) => (
  <GoogleAnalyticsPage service={service} period={7} onPeriodChange={() => {}} error="The request timed out." onRetry={() => location.reload()} onConnect={async () => {}} onDisconnect={async () => {}} />
);
```

## Accessibility

The page has one `h1`; tabs follow the WAI-ARIA tabs pattern (arrow keys move, the panel is labelled by its tab). Charts and tables carry text alternatives. Disconnect asks for confirmation. Localise every string you override through `labels`.

## RTL & i18n

- The whole page mirrors; charts run right to left.
- URLs, paths and identifiers stay left-to-right inside Arabic text.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Composed from tokens only; extend with `className`.

## Do / Don't

- Do fetch on the server and pass `data`; keep secrets out of the browser.
- Do pass `previous` values so every tile shows its change.
- Don't draw a Google Analytics logo yourself; use only the official asset.

## Related

- [`metric-tiles`](../metric-tiles/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`breakdown-table`](../breakdown-table/README.md)
- [`geo-list`](../geo-list/README.md)
- [`realtime-counter`](../realtime-counter/README.md)
- [`analytics-connect`](../analytics-connect/README.md)
- [`heatmap`](../heatmap/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-analytics-pages-google-analytics--docs
