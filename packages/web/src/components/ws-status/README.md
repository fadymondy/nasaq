---
name: ws-status
title: WsStatus
category: feedback
status: beta
summary: A realtime connection indicator showing live with latency, connecting, reconnecting with a countdown to the next try, and offline, as a pill, bare text or a banner with Retry now.
exports: [WsStatus, WsStatusProps, WsStatusLabels, WsStatusVariant, useCountdown, backoffDelay, FAIR_LATENCY_MS, formatCountdown, formatLatency, GOOD_LATENCY_MS, LatencyQuality, latencyQuality, signalBars, WsState]
related: [status, alert, spinner, realtime-counter]
story: components-loading-states-ws-status
base-ui: []
keywords: [websocket, realtime, connection, reconnecting, offline, latency, live, sse]
---

# WsStatus

The state of a live connection (WebSocket or SSE): live with its latency, connecting, reconnecting with a
countdown, or offline. Your socket code drives `state`, `latencyMs` and `retryAt`; the component only shows them.

## When to use

- The header of a dashboard with live data.
- A banner when the connection drops and data may be stale.

## When not to use

- Plain internet connectivity for the whole app: use a page-level offline banner.

## Import

```tsx
import { WsStatus } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WsStatus, type WsState } from "@fadymondy/nasaq/web";

declare function reconnect(): void;

export function Header({ state, latency, retryAt }: { state: WsState; latency: number; retryAt: number }) {
  return <WsStatus state={state} latencyMs={latency} retryAt={retryAt} attempt={2} onRetry={() => reconnect()} />;
}
```

## Anatomy

```
WsStatus                        data-slot="ws-status" data-state data-variant
├─ dot                          pulses while connected
├─ label                        role="status": Live, Connecting, Reconnecting, Offline
├─ countdown                    "Retrying in 0:12" (outside the live region)
├─ latency                      signal bars and "42 ms"
└─ Retry now                    when reconnecting or offline and onRetry is set
```

## API

**WsStatus**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `state` | `"connected" \| "connecting" \| "reconnecting" \| "offline"` | required | The connection state. |
| `latencyMs` | `number` | none | Round trip time. Shown while connected. Good is 150 ms or less, fair up to 400 ms. |
| `retryAt` | `Date \| number \| string` | none | When the next attempt fires. Shows a live countdown while reconnecting. |
| `attempt` | `number` | none | Which attempt this is (banner). |
| `lastConnectedAt` | `Date \| number \| string` | none | Shown in the banner while reconnecting or offline. |
| `variant` | `"badge" \| "inline" \| "banner"` | `badge` | Pill, bare text, or full row with details and Retry. |
| `onRetry` | `() => void \| Promise` | | Shows Retry now while reconnecting or offline. |
| `showLatency` | `boolean` | `true` | Hide the latency. |
| `labels` | `Partial<WsStatusLabels>` | | Override any string. |

**Helpers** (pure, tested): `latencyQuality`, `formatLatency`, `backoffDelay(attempt)`, `formatCountdown`, `signalBars`. `useCountdown(at)` is the hook behind the countdown.

## Examples

**Banner**

```tsx
import { WsStatus } from "@fadymondy/nasaq/web";

export const Offline = () => <WsStatus variant="banner" state="offline" lastConnectedAt={Date.now() - 120_000} onRetry={() => {}} />;
```

## Accessibility

- The state label is `role="status"`, so a change is announced politely. The ticking countdown is outside it, so it is not read every second.
- State is a word and an icon as well as colour. The signal bars are decorative; the number and the title carry the meaning.
- Motion (pulse, spin) respects reduced motion.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Latency ("42 ms") and the countdown are `dir="ltr"`.

## Styling & tokens

- Uses `--nq-success`, `--nq-info`, `--nq-warning`, `--nq-danger` and their soft and text tokens.
- Target `[data-slot="ws-status"][data-state="offline"]`.

## Do / Don't

- Do back off between attempts and pass the real `retryAt`.
- Do tell people when data may be stale.
- Don't show latency while not connected.
- Don't flip states faster than about once a second; debounce in your socket code.

## Related

- [`Status`](../status/README.md)
- [`Alert`](../alert/README.md)
- [`RealtimeCounter`](../realtime-counter/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-loading-states-ws-status--docs
