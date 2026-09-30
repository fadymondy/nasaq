---
name: realtime-counter
title: RealtimeCounter
category: analytics
status: beta
summary: A live active-users card - a large count, a per-minute mini chart and ranked lists such as top pages and countries.
exports: [RealtimeCounter, RealtimeCounterProps, RealtimeSection, RealtimeCounterLabels]
related: [stat-card, chart, google-analytics-page]
story: components-analytics-realtime-counter
base-ui: []
keywords: [realtime, live, active users, counter, analytics]
---

# RealtimeCounter

RealtimeCounter shows how many people are on the site right now. The count is announced politely to screen readers, a bar chart shows users per minute, and `sections` list the top active pages or countries. The host polls and passes new values; the component only presents them.

## When to use

- The "Right now" card of an analytics page.
- Live counts with a short history.

## When not to use

- Daily totals: use [`MetricTiles`](../metric-tiles/README.md).
- Log streams: use [`LogViewer`](../log-viewer/README.md).

## Import

```tsx
import { RealtimeCounter } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { RealtimeCounter } from "@fadymondy/nasaq/web";

export function Now() {
  return (
    <RealtimeCounter
      value={87}
      perMinute={[62, 70, 66, 81, 79, 87]}
      sections={[{ id: "pages", title: "Top active pages", ltr: true, rows: [{ id: "a", label: "/pricing", value: 14 }] }]}
    />
  );
}
```

## Anatomy

```
RealtimeCounter        data-slot="realtime-counter"  (a Card)
  live dot + count     aria-live="polite" region
  MiniBar              users per minute
  sections             ranked rows
```

## API

### RealtimeCounter

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | Active users now. |
| `perMinute` | `readonly number[]` | none | Users per minute, oldest first. |
| `sections` | `readonly RealtimeSection[]` | none | `{ id, title, rows: { id, label, value }[], ltr? }`. |
| `updatedAt` | `number \| Date \| string` | none | When the data was read; shown as a relative time. |
| `live` | `boolean` | `true` | Shows the pulsing dot; set false when polling is paused. |
| `title / description` | `ReactNode` | none | Card header. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<RealtimeCounterLabels>` | none | Replace any built-in English or Arabic string. |

## Examples

Polling from the host:

```tsx
import { RealtimeCounter } from "@fadymondy/nasaq/web";
import { useEffect, useState } from "react";

export function Live({ read }: { read: () => Promise<number> }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => void read().then(setN), 5000);
    return () => clearInterval(id);
  }, [read]);
  return <RealtimeCounter value={n} />;
}
```

Paused:

```tsx
import { RealtimeCounter } from "@fadymondy/nasaq/web";

export const Paused = () => <RealtimeCounter value={0} live={false} />;
```

## Accessibility

The count is in a polite live region, so changes are announced without interrupting. The pulsing dot is decorative and stops under `prefers-reduced-motion`. The mini chart has a text summary.

## RTL & i18n

- Sections align to the inline start; the mini chart runs right to left.
- Set `ltr` on a section of paths.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Live dot uses `--nq-success`.

## Do / Don't

- Do throttle polling to every few seconds.
- Don't animate the count digit by digit.

## Related

- [`stat-card`](../stat-card/README.md)
- [`chart`](../chart/README.md)
- [`google-analytics-page`](../google-analytics-page/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-realtime-counter--docs
