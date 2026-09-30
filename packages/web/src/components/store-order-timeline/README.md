---
name: store-order-timeline
title: StoreOrderTimeline
category: commerce
status: beta
summary: The order status timeline shared by the customer account and the store admin. The tracking variant draws placed, paid, shipped, out for delivery and delivered with times and a carrier link. The activity variant lists every event newest first and takes internal notes.
exports: [StoreOrderTimelineLabels, useStoreTimelineStrings, StoreOrderTimelineProps, StoreOrderTimeline, TRACKING_STEPS, activityKind, sortEventsNewestFirst, trackingModel, trackingUrl, StoreActivityKind, TrackingInput, TrackingModel, TrackingStep, TrackingStepKey, TrackingStepState, TrackingTerminal, FULFILMENT_LABEL, FULFILMENT_VARIANT, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT, PAYMENT_LABEL, PAYMENT_VARIANT, OrderChipVariant]
related: [store-account, store-orders-admin, timeline, badge]
story: components-commerce-store-order-timeline
base-ui: []
keywords: [order, timeline, tracking, shipment, status, events, notes, carrier, ecommerce]
---

# StoreOrderTimeline

One component for both sides of an order. The customer sees five steps (placed, paid, shipped, out for delivery, delivered) with the time each happened and a link to the carrier. The store team sees the full event log, newest first, and can add internal notes. The steps are worked out from `CommerceOrder.status`, `payment` and `events`, so the two sides can never disagree about where an order is.

The status and payment words and chip colours (`ORDER_STATUS_LABEL`, `PAYMENT_LABEL`, `FULFILMENT_LABEL` and the matching `*_VARIANT` maps) are exported too, so a chip in the admin list reads the same as the one in the customer's account.

## When to use

- The order page in a customer account (`variant="tracking"`).
- The order page in the store admin (`variant="activity"`).

## When not to use

- A generic activity feed that has nothing to do with orders: use `timeline`.
- A returns (RMA) progress bar: `StoreReturnStatus` in `store-account` draws that.

## Import

```tsx
import { StoreOrderTimeline } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StoreOrderTimeline, type CommerceOrder } from "@fadymondy/nasaq/web";

export function Tracking({ order }: { order: CommerceOrder }) {
  return (
    <StoreOrderTimeline
      status={order.status}
      payment={order.payment}
      placedAt={order.placedAt}
      events={order.events}
      tracking={order.tracking}
      trackingTemplate="https://track.example.com/?n={number}"
    />
  );
}
```

## Anatomy

```
StoreOrderTimeline [data-slot="store-order-timeline"] [data-variant="tracking" | "activity"]
├─ terminal banner          cancelled, refunded or returned (tracking)
├─ partial badge            "Part of this order has shipped" (tracking)
├─ ol > li[data-state]      five steps: done, current, upcoming or skipped (tracking)
├─ carrier row              carrier, tracking number, "Track shipment" link (tracking)
├─ note composer            Textarea and Add note button, when onAddNote is set (activity)
└─ Timeline                 events, newest first (activity)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"tracking" \| "activity"` | `"tracking"` | Customer steps or admin event log. |
| `status` | `CommerceOrderStatus` | `required` | The order status. |
| `payment` | `CommercePaymentStatus` |  | Cash on delivery changes the "paid" step to "confirmed" and adds a note. |
| `placedAt` | `string` |  | ISO time of the first step. |
| `events` | `CommerceOrderEvent[]` |  | Times for the steps come from event kinds; the activity variant lists them all. |
| `tracking` | `{ carrier; number; url? }` |  | Shows the carrier row. |
| `trackingTemplate` | `string` |  | Carrier link with `{number}`, used when `tracking.url` is empty. |
| `onAddNote` | `(note: string) => void` |  | Activity: shows the composer. |
| `labels` | `StoreOrderTimelineLabels` |  | Replace any string. |
| `className` | `string` |  | On the root. |

Helpers: `trackingModel({ status, payment, placedAt, events, hasTracking })` returns `{ steps, reached, percent, partial, terminal }`. `trackingUrl(tracking, template)` builds the carrier link. `sortEventsNewestFirst(events)` and `activityKind(kind)` group event kinds for the icons. `useStoreTimelineStrings(labels)` returns `{ t, ar, locale }`.

## Examples

**Admin log with notes**

```tsx
<StoreOrderTimeline variant="activity" status={order.status} events={order.events} onAddNote={(note) => save(note)} />
```

**A cancelled order**

```tsx
<StoreOrderTimeline status="cancelled" placedAt="2026-09-20T10:00:00Z" events={events} />
```

## Accessibility

- The steps are an ordered list. The current step has `aria-current="step"`. Every state is also written in words ("Done", "In progress", "Next"), not only shown by colour.
- The carrier link opens in a new tab with `rel="noreferrer"`.
- The note field has a label; the Add note button stays disabled until there is text.

| Key | Action |
| --- | --- |
| Tab | Moves to the note field, the Add note button and the carrier link. |
| Enter | Submits the note from the button. |

## RTL & i18n

- The step bar runs vertically on narrow screens and across on wide ones, with logical borders, so it mirrors in Arabic.
- Times use `DateTime` and the active locale. Tracking numbers are isolated and left to right.
- Strings live in `STRINGS = { en, ar }`; the locale comes from `NasaqProvider`. Any string can be replaced with `labels`.

## Styling & tokens

- Bars use `border-primary`, `border-border`; the terminal banner uses `bg-secondary`.
- Target `[data-slot="store-order-timeline"]` and `li[data-state="done" | "current" | "upcoming" | "skipped"]`.

## Do / Don't

- Do pass the same `status`, `payment` and `events` to both variants.
- Do keep the customer variant free of internal notes: notes only render in `activity`.
- Don't compute progress yourself; call `trackingModel`.

## Related

- [`store-account`](../store-account/README.md)
- [`store-orders-admin`](../store-orders-admin/README.md)
- [`timeline`](../timeline/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-store-order-timeline--docs
