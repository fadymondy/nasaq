---
name: route-stops
title: Route Stops
category: delivery
status: beta
summary: An ordered multi-order trip - pickups and drop-offs with done, current and failed states, cash per stop, a trip summary and a per-stop action slot.
exports: [RouteStopsLabels, RouteStop, RouteStopsProps, RouteStops]
related: [dispatch-offer, courier-card, delivery-tracker, cash-collect, map-view]
story: components-delivery-route-stops
keywords: [route, stops, trip, pickup, dropoff, multi-order, courier, navigate]
---

# Route Stops

The courier's to-do list for a trip. The first stop that is not done is the current one and gets the actions.

## When to use

- A courier trip with several pickups and drop-offs.

## When not to use

- Order history: use [`Timeline`](../timeline/README.md).
- Drawing the path: use [`MapView`](../map-view/README.md) routes.

## Import

```tsx
import { RouteStops } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<RouteStops stops={[{ id: "p1", kind: "pickup", name: "Bakery" }, { id: "d1", kind: "dropoff", name: "Sara", cashMinor: 10000 }]} />
```

## Anatomy

```
RouteStops  data-slot="route-stops"
├─ summary: stops, cash to collect
└─ ol > li  data-slot="route-stop"  data-kind data-status data-current
   ├─ marker, name, address, order ref, ETA, note
   └─ actions (current stop, or all)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `stops` | `RouteStop[]` | required | `id`, `kind` (`pickup`/`dropoff`), `name`, `nameAr`, `address`, `addressAr`, `status` (`pending`/`done`/`failed`), `orderRef`, `cashMinor`, `eta`, `note`, `noteAr`. |
| `currency` | `string` | `"ILS"` | ISO currency. |
| `onSelectStop` | `(stop) => void` | none | Makes stops clickable. |
| `renderActions` | `(stop, { current }) => ReactNode` | none | Per-stop actions. |
| `actionsForAll` | `boolean` | `false` | Show actions on every stop, not just the current one. |
| `hideSummary` | `boolean` | `false` | Hide the trip summary. |
| `locale` / `labels` | `"en" \| "ar"` / partial strings | context | Language and overrides. |

## Examples

Lab stories: interactive trip, read-only, all done, Arabic.

## Accessibility

An ordered list; the current stop has `aria-current="step"`. Selectable stops are buttons.

## RTL & i18n

Logical layout, Arabic names and notes via `nameAr`, `addressAr`, `noteAr`.

## Styling & tokens

Uses `--status-success`, `--status-danger`, `--brand`. Target `[data-current]`, `[data-kind]`, `[data-status]`.

## Do / Don't

- Do give each stop an `orderRef` on multi-order trips.
- Don't show actions on future stops.

## Related

[`DispatchOffer`](../dispatch-offer/README.md), [`CashCollect`](../cash-collect/README.md), [`MapView`](../map-view/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-delivery-route-stops--docs
