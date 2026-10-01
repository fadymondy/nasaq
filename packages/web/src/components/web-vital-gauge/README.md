---
name: web-vital-gauge
title: WebVitalGauge
category: monitoring
status: beta
summary: A gauge for one Core Web Vital (LCP, INP, CLS, FCP, TTFB) with Google's good, needs-improvement and poor bands, the p75 value and the distribution of page loads.
exports: [WebVitalGauge, WebVitalGaugeProps, WebVitalGaugeGrid, WebVitalGaugeLabels, formatVital]
related: [time-series-panel, web-vitals-page, status]
story: components-monitoring-web-vital-gauge
base-ui: []
keywords: [core web vitals, lcp, inp, cls, fcp, ttfb, gauge, performance]
---

# WebVitalGauge

WebVitalGauge shows one metric at the 75th percentile of page loads, judged with Google's published thresholds: LCP 2.5 s / 4 s, INP 200 ms / 500 ms, CLS 0.1 / 0.25, FCP 1.8 s / 3 s and TTFB 0.8 s / 1.8 s. Good is at or below the first number, poor is above the second. The gauge, a rating label with an icon and a stacked bar of page loads by rating say the same thing three ways. The pure functions (`rateVital`, `passesCoreWebVitals`, …) are exported from the package too.

## When to use

- Real-user performance dashboards.
- Showing where a metric sits against Google's limits.

## When not to use

- Lab audits with a single 0 to 100 score: use [`Progress`](../progress/README.md).
- Trends: use [`TimeSeriesPanel`](../time-series-panel/README.md) with `referenceLines`.

## Import

```tsx
import { WebVitalGauge, WebVitalGaugeGrid } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { WebVitalGauge, WebVitalGaugeGrid } from "@fadymondy/nasaq/web";

export function Vitals() {
  return (
    <WebVitalGaugeGrid>
      <WebVitalGauge metric="LCP" value={2900} previous={3100} distribution={{ good: 0.58, needsImprovement: 0.28, poor: 0.14 }} />
      <WebVitalGauge metric="INP" value={182} />
      <WebVitalGauge metric="CLS" value={0.08} />
    </WebVitalGaugeGrid>
  );
}
```

## Anatomy

```
WebVitalGauge          data-slot="web-vital-gauge"  data-rating="good|needs-improvement|poor"
  arc                  three bands and a needle (role="img" with a text summary)
  value + rating       Status with an icon
  distribution bar     good / needs improvement / poor share of page loads
WebVitalGaugeGrid      data-slot="web-vital-gauge-grid"
```

## API

### WebVitalGauge

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `metric` | `"LCP" \| "INP" \| "CLS" \| "FCP" \| "TTFB"` | required | Which vital. |
| `value` | `number` | none | The p75 in milliseconds (a plain score for CLS). Omit to show "No data". |
| `previous` | `number` | none | The p75 for the previous period; shows the change (lower is better). |
| `distribution` | `VitalDistribution` | none | Share of page loads per rating: `{ good, needsImprovement, poor }`, counts or fractions. |
| `onSelect` | `(metric) => void` | none | Makes the card a button, for choosing the metric a chart shows. |
| `selected` | `boolean` | `false` | Marks the card as chosen. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<WebVitalGaugeLabels>` | none | Replace any built-in English or Arabic string. |

### formatVital

`formatVital(metric, value, locale)` returns `"2.9 s"`, `"182 ms"` or `"0.08"` (Arabic units "ث" and "مللي ث").



### Math helpers

`VITAL_THRESHOLDS`, `WEB_VITAL_IDS`, `rateVital(metric, value)`, `gaugeFraction`, `vitalBands`, `vitalDisplay`, `normalizeDistribution`, `passesCoreWebVitals(p75)` and `worstRating(ratings)` are exported for your own logic.



## Examples

Selectable gauges:

```tsx
import { WEB_VITAL_IDS, WebVitalGauge, WebVitalGaugeGrid, type WebVitalId } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Pick({ p75 }: { p75: Record<WebVitalId, number> }) {
  const [sel, setSel] = useState<WebVitalId>("LCP");
  return (
    <WebVitalGaugeGrid>
      {WEB_VITAL_IDS.map((id) => <WebVitalGauge key={id} metric={id} value={p75[id]} selected={sel === id} onSelect={setSel} />)}
    </WebVitalGaugeGrid>
  );
}
```

Rate a value yourself:

```tsx
import { passesCoreWebVitals, rateVital } from "@fadymondy/nasaq/web";

export const rating = rateVital("LCP", 2500); // "good"
export const passes = passesCoreWebVitals({ LCP: 2400, INP: 190, CLS: 0.09 }); // true
```

## Accessibility

The arc is an image with a text alternative giving the metric, the value and the rating. The rating is written out with an icon, so colour is never the only signal. With `onSelect` the card is a button with `aria-pressed`, reached with Tab and activated with Enter or Space.

## RTL & i18n

- The gauge is a semicircle read from the inline start: good sits at the start in both directions.
- Values and units are bidi-isolated; Arabic units are "ث" and "مللي ث".
- The card text is localised through `labels`.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Bands use `--nq-success`, `--nq-warning` and `--nq-danger`.

## Do / Don't

- Do pass the 75th percentile, which is what Google's thresholds judge.
- Do pass CLS as a plain score.
- Don't pass an average; it hides the slow tail.

## Related

- [`time-series-panel`](../time-series-panel/README.md)
- [`web-vitals-page`](../web-vitals-page/README.md)
- [`status`](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-monitoring-web-vital-gauge--docs
