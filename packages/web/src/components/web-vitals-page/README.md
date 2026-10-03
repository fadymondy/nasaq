---
name: web-vitals-page
title: WebVitalsPage
category: monitoring
status: beta
summary: A web vitals report - a Core Web Vitals verdict, gauges for LCP, INP, CLS, FCP and TTFB with distributions, a trend chart with Google's limits, and pages to fix.
exports: [WebVitalsPage, WebVitalsPageProps, WebVitalsData, WebVitalsPageLabels, WebVitalReading, WebVitalsPageRow, WebVitalsDevice]
related: [web-vital-gauge, time-series-panel, status, analytics-connect]
story: components-monitoring-pages-web-vitals
base-ui: []
keywords: [web vitals, core web vitals, lcp, inp, cls, fcp, ttfb, performance, crux]
---

# WebVitalsPage

The web vitals page opens with a verdict (passes Core Web Vitals only when LCP, INP and CLS are all good at the 75th percentile), then a `WebVitalGauge` per metric with the distribution of page loads, a `TimeSeriesPanel` for the selected metric with Google's good and poor limits drawn, and a table of the busiest pages rated per metric. A mobile / desktop switch appears when you pass `device` and `onDeviceChange`. Until connected it shows `AnalyticsConnect`.

## When to use

- Real-user performance reporting from CrUX or your own RUM.
- Deciding which pages to fix first.

## When not to use

- Server-side latency: use [`ApmPage`](../apm-page/README.md).
- One-off Lighthouse audits.

## Import

```tsx
import { WebVitalsPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { WebVitalsPage } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Vitals({ service, data }: { service: React.ComponentProps<typeof WebVitalsPage>["service"]; data?: React.ComponentProps<typeof WebVitalsPage>["data"] }) {
  const [period, setPeriod] = useState(28);
  return <WebVitalsPage service={service} data={data} site="nasaq.dev" period={period} onPeriodChange={setPeriod} onConnect={async () => {}} onDisconnect={async () => {}} />;
}
```

## Anatomy

```
WebVitalsPage          AnalyticsPageFrame
  verdict card         passes / does not pass / not enough data
  WebVitalGaugeGrid    five selectable gauges
  TimeSeriesPanel      selected metric + good/poor lines
  pages table          LCP, INP, CLS per page, rated
```

## API

### WebVitalsPage

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
| `site` | `string` | none | The origin, for the subtitle. |
| `device / onDeviceChange` | `"mobile" \| "desktop" / (device) => void` | none | Shows the device switch. |
| `metric / onMetricChange` | `WebVitalId / (metric) => void` | `LCP` | The charted metric, controlled or not. |
| `onPageClick` | `(row) => void` | none | Makes page rows clickable. |
| `labels / frameLabels` | `Partial<…>` | none | Page strings and the shared header strings. |

### WebVitalsData

`vitals` (per metric: `{ p75?, previous?, distribution? }`; ms, CLS as a score), `series` (rows of `date` with each metric's p75 under its id) and `pages` (`{ id, url, loads, vitals }`).



## Examples

Device switch:

```tsx
import { WebVitalsPage, type IntegrationService, type WebVitalsDevice } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Split({ service }: { service: IntegrationService }) {
  const [device, setDevice] = useState<WebVitalsDevice>("mobile");
  return <WebVitalsPage service={service} device={device} onDeviceChange={setDevice} period={28} onPeriodChange={() => {}} onConnect={async () => {}} onDisconnect={async () => {}} />;
}
```

## Accessibility

The page has one `h1`; tabs follow the WAI-ARIA tabs pattern (arrow keys move, the panel is labelled by its tab). Charts and tables carry text alternatives. Disconnect asks for confirmation. Localise every string you override through `labels`. The verdict is text with an icon, not colour alone.

## RTL & i18n

- The whole page mirrors; charts run right to left.
- URLs, paths and identifiers stay left-to-right inside Arabic text.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.
- Metric ids (LCP, INP, CLS) and page URLs stay left-to-right.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Composed from tokens only; extend with `className`.

## Do / Don't

- Do pass the 75th percentile.
- Do send CLS as a plain score and the others in milliseconds.
- Don't call a page good when one Core Web Vital is not.

## Related

- [`web-vital-gauge`](../web-vital-gauge/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`status`](../status/README.md)
- [`analytics-connect`](../analytics-connect/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-monitoring-pages-web-vitals--docs
