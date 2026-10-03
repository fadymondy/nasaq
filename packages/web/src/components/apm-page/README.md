---
name: apm-page
title: ApmPage
category: monitoring
status: beta
summary: An application performance page - latency percentiles, throughput, error rate with an SLO, slow endpoints and traces with a span waterfall.
exports: [ApmPage, ApmPageProps, ApmData, ApmPageLabels, ApmTotal]
related: [apm-panels, metric-tiles, time-series-panel, analytics-connect, log-viewer]
story: components-monitoring-pages-apm
base-ui: []
keywords: [apm, performance, latency, p95, throughput, error rate, traces, slow endpoints]
---

# ApmPage

The APM page composes `MetricTiles` (requests, throughput, p95, error rate), `LatencyPercentiles`, `ErrorRatePanel`, a throughput `TimeSeriesPanel`, and tabs for slow endpoints (`EndpointTable`) and recent traces (`TraceList`, with a span waterfall). The window is in hours: `period` is 1, 6 or 24 by default. Until connected it shows `AnalyticsConnect`.

## When to use

- Watching an API or service after a deploy.
- Finding slow endpoints and failing requests.

## When not to use

- Business analytics: use [`GoogleAnalyticsPage`](../google-analytics-page/README.md).
- Raw logs: use [`LogViewer`](../log-viewer/README.md).

## Import

```tsx
import { ApmPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ApmPage } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Performance({ service, data }: { service: React.ComponentProps<typeof ApmPage>["service"]; data?: React.ComponentProps<typeof ApmPage>["data"] }) {
  const [hours, setHours] = useState(6);
  return <ApmPage service={service} data={data} app="api.nasaq.dev" targetMs={500} slo={0.01} period={hours} onPeriodChange={setHours} onConnect={async () => {}} onDisconnect={async () => {}} />;
}
```

## Anatomy

```
ApmPage                AnalyticsPageFrame
  MetricTiles
  LatencyPercentiles   + ErrorRatePanel
  TimeSeriesPanel      throughput
  Tabs (underline)     Slow endpoints | Traces
```

## API

### ApmPage

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
| `app` | `string` | none | The application, for the subtitle. |
| `slowMs` | `number` | `1000` | Above this an endpoint or trace is slow. |
| `targetMs` | `number` | none | Latency target line. |
| `slo` | `number` | none | Error-rate objective as a fraction. |
| `windows` | `readonly number[]` | `[1, 6, 24]` | Window lengths in hours for the toggle. |
| `onEndpointClick / onErrorClick / onTraceSelect` | `callbacks` | none | Drill-down hooks. |
| `labels / frameLabels` | `Partial<…>` | none | Page strings and the shared header strings. |

### ApmData

`summary` (requests, throughput, p95, errorRate; each `{ value, previous?, trend? }`), `latency`, `latencySummary?`, `previousLatencySummary?`, `errors`, `previousErrorRate?`, `topErrors?`, `throughput` (rows of `date`, `rpm`), `previousThroughput?`, `endpoints` and `traces`.



## Examples

Sign-in expired:

```tsx
import { ApmPage } from "@fadymondy/nasaq/web";

export const Expired = () => (
  <ApmPage
    service={{ id: "apm", name: "Nasaq APM", scopes: [{ id: "apm.read", label: "Read traces and metrics", required: true }], status: "needs-reauth" }}
    period={6}
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
- Routes, methods, status codes and span names are left-to-right.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Composed from tokens only; extend with `className`.

## Do / Don't

- Do pass percentiles in milliseconds and rates as fractions.
- Do attach `spans` to traces so the waterfall works.
- Don't show averages instead of percentiles.

## Related

- [`apm-panels`](../apm-panels/README.md)
- [`metric-tiles`](../metric-tiles/README.md)
- [`time-series-panel`](../time-series-panel/README.md)
- [`analytics-connect`](../analytics-connect/README.md)
- [`log-viewer`](../log-viewer/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-monitoring-pages-apm--docs
