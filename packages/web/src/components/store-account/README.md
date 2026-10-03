---
name: store-account
title: StoreOrderHistory
category: store
status: beta
summary: The customer's store account. Order history with status filters and reorder, an order page with the tracking timeline and a carrier link, a return and refund request flow with RMA status, a wishlist with move to cart and back-in-stock notify, an address book and recently viewed products. The reorder, return and wishlist rules are pure and tested.
exports: [LOW_STOCK, ORDER_GROUPS, addressLines, backInStock, filterCustomerOrders, newestOrdersFirst, orderGroup, orderGroupCounts, pushRecentlyViewed, removeAddress, removeRecent, removeWishlistItem, reorderPlan, setDefaultAddress, toggleNotify, upsertAddress, validateAddress, wishlistEntries, AddressField, OrderGroup, ReorderLine, ReorderPlan, WishlistAvailability, WishlistEntry, WishlistItem, STORE_ACCOUNT_STRINGS, useStoreAccountStrings, StoreAccountLabels, StoreAccountStrings, RETURN_REASONS, RMA_FLOW, deliveredAt, inRequestQuantities, nextRmaStatuses, planReturn, reasonNeedsPhotos, refundEstimate, refundMethodsFor, returnWindow, returnableLines, rmaIsOpen, rmaSteps, RefundMethod, ReturnInput, ReturnIssue, ReturnPlan, ReturnReason, ReturnRequest, RmaStatus, RmaStep, StoreAccountLayout, StoreAccountNav, StoreAccountNavProps, StoreAccountSection, StoreAccountOrder, StoreAccountOrderProps, StoreAddressBook, StoreAddressBookProps, ReorderNotice, StoreOrderHistory, StoreOrderHistoryProps, StoreRecentlyViewed, StoreRecentlyViewedProps, StoreReturnRequest, ReturnSubmission, StoreReturnRequestProps, StoreReturnStatus, StoreReturnStatusProps, StoreWishlist, StoreWishlistProps]
related: [store-order-timeline, store-orders-admin, store-listing, product-detail, file-upload]
story: components-storefront-store-account
base-ui: [dialog, alert-dialog, select, radio-group, checkbox, toggle-group]
keywords: [account, orders, reorder, returns, refund, rma, wishlist, addresses, recently viewed, ecommerce]
---

# StoreOrderHistory

The pieces of a shopper's account. Each one is presentational: you pass data and callbacks, the component owns only the form and filter state. `StoreAccountNav` and `StoreAccountLayout` frame them, and every rule (what "order again" can add today, what can still be returned, what a return is worth, how the address book keeps one default) is a pure function that is exported and tested.

Money is integer minor units in one currency.

## When to use

- The account area of a storefront.

## When not to use

- The admin side of orders: use `store-orders-admin`.
- The product page or listing: use `product-detail` and `store-listing`.

## Import

```tsx
import { StoreOrderHistory, StoreAccountOrder } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StoreOrderHistory, type CommerceOrder, type CommerceProduct } from "@fadymondy/nasaq/web";

export function Orders({ orders, products }: { orders: CommerceOrder[]; products: CommerceProduct[] }) {
  return (
    <StoreOrderHistory
      orders={orders}
      products={products}
      currency="USD"
      onOpenOrder={(o) => navigate(`/account/orders/${o.id}`)}
      onReorder={(_order, plan) => plan.add.forEach((l) => cart.add(l.variantId, l.quantity))}
      onOpenCart={() => navigate("/cart")}
    />
  );
}
```

## Anatomy

```
StoreAccountLayout > StoreAccountNav + main
StoreOrderHistory [data-slot="store-order-history"]   search, group filters with counts, order cards, reorder notice
StoreAccountOrder [data-slot="store-account-order"]   header, StoreOrderTimeline, items, totals, address, returns
StoreReturnRequest [data-slot="store-return-request"] lines and quantities, reason, note, photos, refund method, estimate
StoreReturnStatus [data-slot="store-return-status"]   RMA number, five steps, refund, reject reason, cancel
StoreWishlist [data-slot="store-wishlist"]            cards with availability, price drop, move to cart, notify
StoreAddressBook [data-slot="store-address-book"]     cards, add and edit dialog, default, delete confirm
StoreRecentlyViewed [data-slot="store-recently-viewed"]
```

## API

### StoreOrderHistory

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orders` | `CommerceOrder[]` | `required` | The customer's orders. |
| `products` | `CommerceProduct[]` | `[]` | The current catalogue, to plan a reorder. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO code. |
| `trackingTemplate` | `string` |  | Carrier link with `{number}`. |
| `onOpenOrder, onReorder, onOpenCart` | `callbacks` |  | `onReorder(order, plan)` gets `plan.add`; the list shows what was added, reduced or skipped. |
| `loading, error, onRetry` |  |  | States. |

### StoreAccountOrder

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `order` | `CommerceOrder` | `required` | The order. |
| `requests` | `ReturnRequest[]` | `[]` | Returns; those for this order are listed. |
| `products, trackingTemplate` |  |  | For reorder and the carrier link. |
| `returnDays` | `number` | `30` | Days after delivery a return can start. |
| `now` | `number \| Date` | now | Reference time for the window. |
| `onBack, onReorder, onOpenCart, onReturn, onCancelReturn` | `callbacks` |  | "Return items" shows only when the window is open and something is returnable. |

### StoreReturnRequest

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `order` | `CommerceOrder` | `required` | The order to return from. |
| `requests` | `ReturnRequest[]` | `[]` | Units already in a return are not offered. |
| `returnDays, now, maxPhotos` |  | `30, now, 5` | Window and photo limit (5 MB each). |
| `onSubmit` | `(submission: ReturnSubmission) => void` |  | Lines, reason, note, photo files, refund method, estimate. |
| `onBack` | `() => void` |  |  |

Defective, wrong and not-as-described reasons need a photo; "Something else" needs a note. Refund methods are the original method or store credit, and for cash on delivery store credit or bank transfer.

### StoreReturnStatus

`request: ReturnRequest`, `order`, `currency`, `onCancel` (offered while requested or approved).

### StoreWishlist

`items: WishlistItem[]`, `products`, `currency`, `onMoveToCart(entry)`, `onToggleNotify(item)`, `onRemove(item)`, `onOpenProduct(product)`, `loading`, `error`, `onRetry`. Only sold-out items can be notified; only available ones can move to the cart. A banner appears when a notify item is back in stock.

### StoreAddressBook

`addresses: CommerceAddress[]`, `onChange(book)`, `countries` (ISO codes), `makeId`, `loading`, `error`, `onRetry`. Validation: name, line 1, city, country and phone are required; a phone needs 8 digits. The book always has exactly one default and the first address is the default.

### StoreRecentlyViewed

`ids` (newest first), `products`, `currency`, `onOpenProduct`, `onRemove(id)`, `onClear`, `loading`.

### StoreAccountNav

`active`, `onNavigate(section)`, `counts`, `sections` (which of `orders`, `returns`, `wishlist`, `addresses`, `recent` to list, in order; default all five, pass fewer when your store has no returns or recently viewed).

### Pure modules

- `account-logic`: `reorderPlan`, `filterCustomerOrders`, `orderGroupCounts`, `wishlistEntries`, `backInStock`, `toggleNotify`, `pushRecentlyViewed`, `validateAddress`, `upsertAddress`, `setDefaultAddress`, `removeAddress`.
- `return-math`: `returnableLines`, `returnWindow`, `refundEstimate`, `planReturn`, `rmaSteps`, `RMA_FLOW`.

## Examples

**Sections with the layout**

```tsx
<StoreAccountLayout title="My account" nav={<StoreAccountNav active="wishlist" onNavigate={go} counts={{ wishlist: 4 }} />}>
  <StoreWishlist items={items} products={products} currency="USD" onMoveToCart={(e) => cart.add(e.item.variantId, 1)} />
</StoreAccountLayout>
```

**Check a return before sending**

```tsx
const plan = planReturn(order, requests, { picks: [{ lineId: "l1", quantity: 1 }], reason: "defective", photos: 1, refundMethod: "original" });
plan.ok; // true, plan.refundAmount is the estimate in minor units
```

## Accessibility

- Filters are a toggle group with counts; status chips carry words.
- Form errors are text under the field with `role="alert"`; the quantity steppers are labelled buttons with a live count.
- Each image is decorative where the name sits beside it.

| Key | Action |
| --- | --- |
| Tab | Moves through cards, fields and buttons. |
| Space, Enter | Toggles a checkbox, opens a card. |
| Esc | Closes the address dialog or a confirm. |

## RTL & i18n

- Logical spacing, so the layout mirrors. Numbers and dates go through `Num` and `DateTime`; phone numbers, postal codes and RMA numbers are isolated left to right.
- Country names use `Intl.DisplayNames` in the active locale.
- Strings live in `STRINGS = { en, ar }` in `account-strings.ts`; replace with `labels`.

## Styling & tokens

- `--nq-*` tokens only. Target the `data-slot` values above; `data-state` on RMA steps.

## Do / Don't

- Do pass the live catalogue to `products`; reorder and the wishlist depend on current stock and price.
- Do run `planReturn` on the server too.
- Don't upload photos in the form; `onSubmit` gives you the `File` objects.

## Related

- [`store-order-timeline`](../store-order-timeline/README.md)
- [`store-orders-admin`](../store-orders-admin/README.md)
- [`file-upload`](../file-upload/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-storefront-store-account--docs
