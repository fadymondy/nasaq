---
name: apm-panels
title: APM panels
category: analytics
status: beta
summary: Latency percentiles (p50, p95, p99), an error-rate panel with an SLO, a slow-endpoints table and a trace list with a span waterfall.
exports: [LatencyPercentiles, LatencyPercentilesProps, LatencyPoint, LatencySummary, ErrorRatePanel, ErrorRatePanelProps, ErrorRatePoint, TopError, EndpointTable, EndpointTableProps, EndpointRow, TraceList, TraceListProps, TraceSummary, TraceSpan, ApmPanelsLabels]
related: [time-series-panel, log-viewer, data-table, apm-page]
story: components-analytics-apm-panels
base-ui: []
keywords: [apm, latency, p95, p99, error rate, slo, traces, spans, endpoints]
---

# APM panels

Four panels for application performance monitoring. `LatencyPercentiles` charts p50, p95 and p99 with a target line. `ErrorRatePanel` charts errors over requests, marks an SLO and lists the top error messages. `EndpointTable` ranks routes by p95 and flags slow ones. `TraceList` lists recent requests; selecting one draws its spans as a waterfall.

## When to use

- Application, API or service performance pages.
- Any latency distribution view with percentiles.

## When not to use

- Plain logs: use [`LogViewer`](../log-viewer/README.md).
- Business metrics: use [`MetricTiles`](../metric-tiles/README.md).

## Import

```tsx
import { LatencyPercentiles, ErrorRatePanel, EndpointTable, TraceList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { LatencyPercentiles } from "@fadymondy/nasaq/web";

export function Latency() {
  return (
    <LatencyPercentiles
      targetMs={500}
      summary={{ p50: 121, p95: 486, p99: 1140 }}
      data={[
        { time: "2026-09-29T09:00", p50: 118, p95: 470, p99: 1050 },
        { time: "2026-09-29T09:05", p50: 124, p95: 492, p99: 1210 },
      ]}
    />
  );
}
```

## Anatomy

```
LatencyPercentiles     data-slot="latency-percentiles"   percentile chips + line chart + target line
ErrorRatePanel         data-slot="error-rate-panel"      rate, SLO status, chart, top errors
EndpointTable          data-slot="endpoint-table"        method, route, requests, p50, p95, error rate
TraceList              data-slot="trace-list"            rows, and the span waterfall of the selected trace
```

## API

### LatencyPercentiles

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `readonly LatencyPoint[]` | required | `{ time, p50, p95, p99 }` in milliseconds. |
| `summary / previous` | `LatencySummary` | none | Headline percentiles and the previous period's, for the change. |
| `targetMs` | `number` | none | Draws a target line. |
| `title / description / action` | `ReactNode` | none | Card header. |
| `loading / error / onRetry` | `boolean / ReactNode / () => void` | none | States. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<ApmPanelsLabels>` | none | Replace any built-in English or Arabic string. |

### ErrorRatePanel

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `readonly ErrorRatePoint[]` | required | `{ time, requests, errors }`. |
| `previousRate` | `number` | none | Previous period's error fraction. |
| `slo` | `number` | none | Objective as a fraction (0.01 is 1%); shows "Within SLO" or "Breaching SLO". |
| `topErrors` | `readonly TopError[]` | none | `{ id, message, count, endpoint?, lastSeenAt? }`. |
| `onErrorClick` | `(error) => void` | none | Makes the error rows buttons. |
| `loading / error / onRetry / labels / className` | none | none | As above. |

### EndpointTable

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `readonly EndpointRow[]` | required | `{ id, method, route, requests, throughput?, p50, p95, errorRate }`. |
| `slowMs` | `number` | `1000` | p95 at or above this is marked slow. |
| `onRowClick` | `(row) => void` | none | Makes rows clickable. |
| `pageSize` | `number` | `8` | Rows per page. |
| `title / description / loading / error / onRetry / labels / className` | none | none | As above. |

### TraceList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `traces` | `readonly TraceSummary[]` | required | `{ id, method, name, status, durationMs, startedAt, service?, spans? }`. |
| `selectedId / defaultSelectedId / onSelect` | `string \| null / string \| null / (trace \| null) => void` | none | Selection, controlled or not. A trace with `spans` shows its waterfall. |
| `slowMs` | `number` | `1000` | Durations at or above this are marked slow. |
| `title / description / loading / error / onRetry / labels / className` | none | none | As above. |

## Examples

Error rate against an SLO:

```tsx
import { ErrorRatePanel } from "@fadymondy/nasaq/web";

export const Errors = () => (
  <ErrorRatePanel
    slo={0.01}
    data={[{ time: "2026-09-29T09:00", requests: 5200, errors: 41 }, { time: "2026-09-29T09:05", requests: 5100, errors: 190 }]}
    topErrors={[{ id: "e1", message: "TimeoutError: query exceeded 1200ms", count: 214, endpoint: "GET /v1/analytics" }]}
  />
);
```

Trace with spans:

```tsx
import { TraceList } from "@fadymondy/nasaq/web";

export const Traces = () => (
  <TraceList
    defaultSelectedId="t1"
    traces={[{ id: "t1", method: "POST", name: "/v1/reports/export", status: 200, durationMs: 2480, startedAt: Date.now(), spans: [
      { id: "a", name: "POST /v1/reports/export", service: "api", startMs: 0, durationMs: 2480 },
      { id: "b", parentId: "a", name: "SELECT issues", service: "postgres", startMs: 50, durationMs: 640 },
    ] }]}
  />
);
```

## Accessibility

Charts have text alternatives and the percentile chips are text. Tables are real tables; clickable rows and trace rows are buttons reached with Tab. A failing span carries an error icon and label as well as colour, and slow endpoints get a "Slow" label.

## RTL & i18n

- Charts use the shared RTL axis handling.
- Routes, methods, span names and status codes are bidi-isolated and stay left-to-right.
- Durations use Arabic units ("مللي ث", "ث") in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Percentile colours come from the chart config: p50 `--nq-success`, p95 `--nq-warning`, p99 `--nq-danger`.
- Error spans use `bg-destructive text-destructive-foreground`.

## Do / Don't

- Do pass percentiles in milliseconds.
- Do give traces `spans` so users can drill in.
- Don't average latencies; use percentiles.

## Related

- [`time-series-panel`](../time-series-panel/README.md)
- [`log-viewer`](../log-viewer/README.md)
- [`data-table`](../data-table/README.md)
- [`apm-page`](../apm-page/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-apm-panels--docs
