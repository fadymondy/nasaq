---
name: delivery-tracker
title: Delivery Tracker
category: delivery
status: beta
summary: A customer-facing order tracker - five delivery steps with times, an ETA, the courier with call and message actions, a map slot, and cancelled or failed outcomes.
exports: [DeliveryTrackerLabels, DeliveryCourier, DeliveryTrackerTimes, DeliveryTrackerProps, DeliveryTracker]
related: [courier-card, route-stops, map-view, timeline, store-order-timeline]
story: components-delivery-delivery-tracker
keywords: [tracking, order, delivery, eta, courier, status, progress, customer, live]
---

# Delivery Tracker

Shows where an order is: placed, assigned, picked up, on the way, delivered. It adds an ETA, the courier, and any
cancelled or failed reason. Pass a `MapView` in the `map` slot for live location.

## When to use

- A customer tracking page or link.
- An order detail panel in an ops console.

## When not to use

- A generic event history: use [`Timeline`](../timeline/README.md).
- Store order lifecycle with payment steps: use [`StoreOrderTimeline`](../store-order-timeline/README.md).

## Import

```tsx
import { DeliveryTracker } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<DeliveryTracker orderNumber="1042" status="on-the-way" etaSeconds={540} courier={{ name: "Omar", nameAr: "عمر", phone: "+970591234567" }} />
```

## Anatomy

```
DeliveryTracker  data-slot="delivery-tracker"  data-status
├─ header: order number, ETA
├─ map slot
├─ courier row: call, message
├─ steps list  data-slot="delivery-steps"
└─ outcome note (cancelled / failed)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `DeliveryOrderStatus` | required | `placed`, `assigned`, `picked-up`, `on-the-way`, `delivered`, `cancelled`, `failed`. |
| `reachedBefore` | `DeliveryStep` | none | For cancelled or failed: the last step reached. |
| `times` | `DeliveryTrackerTimes` | none | Time per step. |
| `orderNumber` | `string` | none | Shown in the header. |
| `etaSeconds` / `etaAt` | `number` / date | none | Time left, or the arrival moment. |
| `courier` | `DeliveryCourier` | none | `name`, `nameAr`, `avatarSrc`, `vehicle`, `phone`. |
| `onCall` / `onMessage` | `() => void` | none | Actions; a `phone` renders a `tel:` link. |
| `reason` / `reasonAr` | `string` | none | Why it was cancelled or failed. |
| `map` | `ReactNode` | none | Map slot. |
| `locale` / `labels` | `"en" \| "ar"` / partial strings | context | Language and overrides. |

## Examples

Lab stories cover each status, a live map and Arabic.

## Accessibility

The steps are an ordered list; the current step has `aria-current="step"`. The ETA is announced politely. Action buttons
are native buttons or links.

## RTL & i18n

The step rail mirrors in RTL. Arabic copy is built in; the map canvas stays LTR.

## Styling & tokens

Uses `--status-success`, `--status-danger` and `--brand`. Target `[data-status]`.

## Do / Don't

- Do show the reason for a failed delivery.
- Don't show an ETA after delivery.

## Related

[`CourierCard`](../courier-card/README.md), [`MapView`](../map-view/README.md), [`Timeline`](../timeline/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-delivery-delivery-tracker--docs
