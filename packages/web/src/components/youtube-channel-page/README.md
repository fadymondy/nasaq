---
name: youtube-channel-page
title: YouTubeChannelPage
category: marketing
status: beta
summary: A YouTube channel report - views, watch time, subscribers and view duration with comparison, a chart, top videos, traffic sources and countries.
exports: [YouTubeChannelPage, YouTubeChannelPageProps, YouTubeChannelData, YouTubeChannelPageLabels, YouTubeTotal, YouTubeVideo]
related: [metric-tiles, time-series-panel, breakdown-table, geo-list, analytics-connect]
story: components-marketing-pages-youtube
base-ui: []
keywords: [youtube, channel, views, watch time, subscribers, videos]
---

# YouTubeChannelPage

The YouTube page shows a channel's performance: `MetricTiles` for views, watch time, net subscribers and average view duration (they select the chart's metric), a `TimeSeriesPanel` with previous-period comparison, and tabs for the top videos (a `BreakdownTable` with watch-time and duration columns), traffic sources and countries. The channel name and subscriber count sit in the subtitle. The name is text; no YouTube logo is drawn unless you pass the official asset.

## When to use

- A creator or brand dashboard fed by the YouTube Analytics API.
- Reporting on video performance next to other analytics.

## When not to use

- Playing or embedding videos.
- Web traffic: use [`GoogleAnalyticsPage`](../google-analytics-page/README.md).

## Import

```tsx
import { YouTubeChannelPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { YouTubeChannelPage } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Channel({ service, data }: { service: React.ComponentProps<typeof YouTubeChannelPage>["service"]; data?: React.ComponentProps<typeof YouTubeChannelPage>["data"] }) {
  const [period, setPeriod] = useState(28);
  return <YouTubeChannelPage service={service} data={data} period={period} onPeriodChange={setPeriod} onConnect={async () => {}} onDisconnect={async () => {}} />;
}
```

## Anatomy

```
YouTubeChannelPage     AnalyticsPageFrame
  MetricTiles          selectable; drives the chart
  TimeSeriesPanel      views | watch hours | subscribers
  Tabs (underline)     Top videos | Traffic sources | Audience
```

## API

### YouTubeChannelPage

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
| `labels / frameLabels` | `Partial<…>` | none | Page strings and the shared header strings. |

### YouTubeChannelData

`channel?` (`name`, `handle?`, `subscribers?`), `summary` (views, watchHours, subscribers, avgSeconds; each `{ value, previous?, trend? }`), `series` (rows of `date`, `views`, `watchHours`, `subscribers`), `previousSeries?`, `videos` (`{ id, title, views, previousViews?, watchHours, avgSeconds, href? }`), `trafficSources` and `countries`.



## Examples

Connect screen:

```tsx
import { YouTubeChannelPage } from "@fadymondy/nasaq/web";

export const Connect = () => (
  <YouTubeChannelPage
    service={{ id: "youtube", name: "YouTube", scopes: [{ id: "yt-analytics.readonly", label: "See your YouTube Analytics reports", required: true }], status: "disconnected" }}
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
- Video titles follow their own direction.
- Durations use Arabic unit abbreviations in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Composed from tokens only; extend with `className`.

## Do / Don't

- Do pass watch time in hours and durations in seconds.
- Don't draw a YouTube logo yourself; use only the official asset.

## Related

- [`metric-tiles`](../metric-tiles/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`breakdown-table`](../breakdown-table/README.md)
- [`geo-list`](../geo-list/README.md)
- [`analytics-connect`](../analytics-connect/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-marketing-pages-youtube--docs
