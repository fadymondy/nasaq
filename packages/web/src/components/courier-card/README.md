---
name: courier-card
title: Courier Card
category: delivery
status: beta
summary: A courier row for dispatch screens - avatar, availability, vehicle, distance and ETA from the pickup, cash float and active orders, with a selectable list wrapper.
exports: [CourierCardLabels, CourierStatus, CourierVehicle, CourierCardProps, CourierCard, CourierListProps, CourierList]
related: [dispatch-offer, route-stops, delivery-tracker, avatar, map-view]
story: components-delivery-courier-card
keywords: [courier, driver, rider, dispatch, assign, availability, vehicle, cash float, delivery]
---

# Courier Card

One courier as a compact card, so a dispatcher can compare who is closest, free and carrying cash. `CourierList` stacks
cards as a single-select listbox for assigning an order.

## When to use

- Picking a courier for an order in a dispatch console.
- Showing the assigned courier in an order drawer.

## When not to use

- Tabular fleet reporting: use [`DataTable`](../data-table/README.md).
- The courier a customer sees while tracking: use [`DeliveryTracker`](../delivery-tracker/README.md).

## Import

```tsx
import { CourierCard, CourierList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<CourierList
  couriers={[{ id: "c1", name: "Omar Haddad", nameAr: "عمر حداد", status: "available", vehicle: "motorbike", distanceMeters: 850, etaSeconds: 240, cashFloatMinor: 25000 }]}
  selectedId={id}
  onSelectCourier={setId}
/>
```

## Anatomy

```
CourierList  data-slot="courier-list"
└─ CourierCard  data-slot="courier-card"  data-status data-selected
   ├─ Avatar + status dot
   ├─ name, vehicle
   ├─ distance · ETA · cash float · active orders
   └─ actions slot
```

## API

### CourierCard

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` / `nameAr` | `string` | required / none | Name; the Arabic one is used in `ar`. |
| `avatarSrc` | `string` | none | Photo; initials otherwise. |
| `status` | `"available" \| "busy" \| "offline"` | `"available"` | Availability badge and dot. |
| `vehicle` | `"bike" \| "motorbike" \| "car" \| "van" \| "walk"` | none | Vehicle icon and label. |
| `vehicleDetail` | `string` | none | Plate or model. |
| `distanceMeters` | `number` | none | Distance from the pickup. |
| `etaSeconds` | `number` | none | Time to reach the pickup. |
| `cashFloatMinor` | `number` | none | Cash the courier holds, in minor units. |
| `activeOrders` | `number` | none | Orders in progress. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO currency for the float. |
| `selected` / `onSelect` | `boolean` / `() => void` | none | Selection; makes the card a button. |
| `actions` | `ReactNode` | none | Trailing slot, for example an Assign button. |
| `compact` | `boolean` | `false` | Tighter layout. |
| `locale` / `labels` | `"en" \| "ar"` / partial strings | context | Language and overrides. |

### CourierList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `couriers` | `(CourierCardProps & { id: string })[]` | required | Couriers to list. |
| `selectedId` | `string \| null` | none | Selected courier. |
| `onSelectCourier` | `(id: string) => void` | none | Selection callback. |
| `locale` / `labels` | as above | context | Language and overrides. |

## Examples

See the lab stories: list with selection, single, compact, other currency and Arabic.

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Moves to the next selectable card. |
| `Enter` / `Space` | Selects the card. |

Status is text as well as colour. The selected card carries `aria-pressed`.

## RTL & i18n

Layout uses logical properties. Arabic names, labels and units are built in; numbers and the currency follow the locale.

## Styling & tokens

Uses `--status-*` tokens for the dot and `--brand` for the selected ring. Target `[data-status]` and `[data-selected]`.

## Do / Don't

- Do sort the list by ETA before rendering.
- Don't hide the cash float; dispatchers rely on it.

## Related

[`DispatchOffer`](../dispatch-offer/README.md), [`RouteStops`](../route-stops/README.md), [`MapView`](../map-view/README.md).

## Lab

https://docs.nasaqui.com/?path=/docs/components-delivery-courier-card--docs
