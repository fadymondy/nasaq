---
name: dispatch-offer
title: Dispatch Offer
category: delivery
status: beta
summary: A courier-side job offer with pickup and drop-off, fee, cash to collect, distance, ETA and a ring that counts down to expiry, with accept and decline.
exports: [DispatchOfferLabels, OfferPlace, DispatchOfferProps, DispatchOffer]
related: [courier-card, route-stops, countdown, cash-collect]
story: components-delivery-dispatch-offer
keywords: [offer, dispatch, job, accept, decline, expire, countdown, courier, driver]
---

# Dispatch Offer

The card a courier sees when an order is offered. A ring counts down the response window; when it runs out the offer
calls `onExpire` and the buttons turn off.

## When to use

- Pushing a job to a courier who must answer quickly.

## When not to use

- Assigning from the dispatcher side: use [`CourierCard`](../courier-card/README.md).
- A plain timer: use [`TimerRing`](../countdown/README.md).

## Import

```tsx
import { DispatchOffer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<DispatchOffer
  pickup={{ name: "Al-Quds Bakery" }}
  dropoff={{ name: "Sara Odeh" }}
  feeMinor={1500}
  expiresAt={Date.now() + 30_000}
  onAccept={accept}
  onDecline={decline}
/>
```

## Anatomy

```
DispatchOffer  data-slot="dispatch-offer"  data-expired
├─ TimerRing + seconds left
├─ pickup → drop-off
├─ fee, cash to collect, distance, ETA, order count
├─ children slot
└─ Decline / Accept
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pickup` / `dropoff` | `OfferPlace` | required | `name`, `nameAr`, `address`, `addressAr`. |
| `feeMinor` | `number` | none | Courier fee in minor units. |
| `cashToCollectMinor` | `number` | none | Cash due from the customer. |
| `currency` | `string` | `"ILS"` | ISO currency. |
| `distanceMeters` / `etaSeconds` | `number` | none | Trip size. |
| `orderCount` | `number` | `1` | More than one shows a multi-order badge. |
| `expiresAt` | `number` | required | Epoch ms when the offer lapses. |
| `windowSeconds` | `number` | `30` | Full window, for the ring fraction. |
| `now` | `number` | clock | Override the clock, for tests. |
| `onAccept` / `onDecline` / `onExpire` | `() => void` | none | Outcomes. |
| `children` | `ReactNode` | none | Extra content. |
| `locale` / `labels` | `"en" \| "ar"` / partial strings | context | Language and overrides. |

## Examples

Lab stories: default, multi-order, no cash, nearly expired, expired, Arabic.

## Accessibility

The remaining time is text inside a `role="timer"` region, announced only at coarse steps. Buttons are native and
disabled after expiry. Colour is never the only signal.

## RTL & i18n

Logical layout, built-in Arabic. The route arrow flips in RTL.

## Styling & tokens

Ring tones come from `timerToneText`; the danger phase maps to the warning token. Target `[data-expired]`.

## Do / Don't

- Do keep the window short and visible.
- Don't auto-accept on expiry.

## Related

[`Countdown`](../countdown/README.md), [`CashCollect`](../cash-collect/README.md), [`RouteStops`](../route-stops/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-delivery-dispatch-offer--docs
