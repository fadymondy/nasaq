---
name: store-orders-admin
title: StoreOrdersList
category: store-admin
status: beta
summary: Store admin orders. A data-table order list with status, payment and fulfilment chips, filters, saved views and bulk actions; an order detail with partial fulfilment and tracking, refunds by line or amount with restock, cancel, a notes timeline and customer cards; printable invoices and packing slips; abandoned carts with a recovery email. The refund, fulfilment and status maths is pure and tested.
exports: [canSendRecovery, cartIdleMinutes, cartItemCount, cartValue, recoveryDiscount, recoveryStats, recoveryStatus, AbandonedCart, RecoveryBlock, RecoveryRules, RecoveryStats, RecoveryStatus, STORE_ADMIN_STRINGS, useStoreAdminStrings, StoreAdminLabels, StoreAdminStrings, StoreMoney, storeMinorToMajor, allocate, applyCancel, applyFulfilment, applyNote, applyRefund, canCancel, canRefund, deriveOrderStatus, fulfilmentProgress, fulfilmentState, lineCancelled, lineFulfilled, lineOutstanding, linePaidValues, lineRefundable, lineRefunded, lineReturnable, lineReturned, outstandingPicks, paymentAfterRefund, paymentSummary, planCancel, planFulfilment, planRefund, refundRemaining, refundedTotal, restockFor, shippingRefunded, unitsValue, ApplyMeta, CancelPlan, DeliveryStage, FulfilmentInput, FulfilmentIssue, FulfilmentPlan, FulfilmentState, LinePick, OrderLine, RefundInput, RefundIssue, RefundPlan, RefundRecord, Restock, StatusInput, ORDER_CSV_COLUMNS, activeView, csvCell, filterOrders, foldText, matchesOrder, orderFilterValue, orderFulfilment, orderSearchText, ordersToCsv, removeView, sameFilters, storeFormatMinor, upsertView, viewCounts, OrderFilters, OrderView, StoreAbandonedCarts, RecoveryEmail, StoreAbandonedCartsProps, StoreOrderDetail, StoreOrderChange, StoreOrderDetailProps, STORE_DOCUMENT_PRINT_CSS, StoreOrderDocument, StoreOrderPrintView, StoreDocumentSeller, StoreOrderDocumentProps, StoreOrderPrintViewProps, StoreFulfilmentBadge, StoreOrderStatusBadge, StoreOrdersList, StorePaymentBadge, canMarkFulfilled, StoreOrderDocumentKind, StoreOrdersListProps]
related: [store-order-timeline, store-account, store-dashboard, data-table, dialog]
story: components-store-admin-store-orders-admin
base-ui: [dialog, alert-dialog, select, toggle-group]
keywords: [orders, admin, fulfilment, refund, restock, invoice, packing slip, print, abandoned cart, saved views, bulk actions, ecommerce]
---

# StoreOrdersList

The order side of a store admin. `StoreOrdersList` is the list, `StoreOrderDetail` is one order, `StoreOrderPrintView` prints invoices and packing slips, and `StoreAbandonedCarts` lists carts that were left behind. They are presentational: you pass orders and callbacks, they never fetch. Money is integer minor units in one currency.

Every change goes through pure functions in `order-math.ts`, so the numbers on screen are the numbers your server should also compute: what is still refundable per line, whether an order is unfulfilled, partly or fully shipped, and which status follows. `StoreOrderDetail` calls `onChange({ order, refunds, restock? })` with the new state; you save it.

## When to use

- The orders area of a store or marketplace admin.

## When not to use

- The customer's own orders: use `store-account`.
- A one-off sales report: use `store-dashboard`.

## Import

```tsx
import { StoreOrdersList, StoreOrderDetail } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { useState } from "react";
import { StoreOrderDetail, StoreOrdersList, type CommerceOrder, type RefundRecord } from "@fadymondy/nasaq/web";

export function Orders({ initial }: { initial: CommerceOrder[] }) {
  const [orders, setOrders] = useState(initial);
  const [refunds, setRefunds] = useState<Record<string, RefundRecord[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const order = orders.find((o) => o.id === open);

  if (order) {
    return (
      <StoreOrderDetail
        order={order}
        refunds={refunds[order.id] ?? []}
        currency="USD"
        actor="Mona"
        onBack={() => setOpen(null)}
        onChange={(next) => {
          setOrders((all) => all.map((o) => (o.id === next.order.id ? next.order : o)));
          setRefunds((r) => ({ ...r, [next.order.id]: next.refunds }));
        }}
      />
    );
  }
  return <StoreOrdersList orders={orders} currency="USD" onOpenOrder={(o) => setOpen(o.id)} />;
}
```

## Anatomy

```
StoreOrdersList [data-slot="store-orders-list"]
├─ views row              All, To fulfil, Unpaid, Delivered, Refunds and your saved views, each with a live count
├─ search, facet filters  status, payment, fulfilment
├─ DataTable              chips, total, row actions, selection
└─ bulk bar               Mark fulfilled, Print slips, Print invoices, Export selected

StoreOrderDetail [data-slot="store-order-detail"]
├─ header                 number, chips, Packing slip, Invoice, Cancel, Refund, Fulfil
├─ lines card             shipped, to ship and refunded badges, progress
├─ payment card           totals, refunds list, net paid, due
├─ timeline               StoreOrderTimeline variant="activity" with a note composer
├─ customer, addresses, shipment cards
└─ dialogs                Fulfil (per line, carrier, tracking), Refund (lines or amount, shipping, restock), Cancel

StoreOrderPrintView / StoreOrderDocument [data-slot="store-order-document"]
StoreAbandonedCarts [data-slot="store-abandoned-carts"]
```

## API

### StoreOrdersList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orders` | `CommerceOrder[]` | `required` | All orders to list. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code. |
| `views, onViewsChange` | `OrderView[]` |  | Saved views. Without `onViewsChange` they are kept in the component. |
| `onOpenOrder` | `(order) => void` |  | Row click and Open order. |
| `onMarkFulfilled` | `(orders) => void` |  | Bulk and row action; only orders that can ship in full are passed. |
| `onPrint` | `(orders, kind) => void` |  | `kind` is `"invoice"` or `"packing-slip"`. |
| `onExport` | `(orders, csv) => void` |  | Called with the orders and the CSV text; without it `orders.csv` downloads. |
| `loading, error, onRetry, pageSize` |  | `false, false, none, 10` | States and page size. |
| `labels` | `StoreAdminLabels` |  | Replace any string. |

### StoreOrderDetail

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `order` | `CommerceOrder` | `required` | The order. Lines carry `fulfilled`, `refunded`, `returned`. |
| `refunds` | `RefundRecord[]` | `[]` | Refunds already issued. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO code. |
| `onChange` | `({ order, refunds, restock? }) => void` |  | The next state after a fulfilment, refund, cancel or note. `restock` lists the units to add back to inventory. |
| `actor` | `string` |  | Written on events. |
| `carriers` | `string[]` |  | Carrier choices in the fulfil dialog. |
| `trackingTemplate` | `string` |  | Carrier link with `{number}`. |
| `onBack, onPrint` | `callbacks` |  | Back link and document buttons. |
| `now` | `number \| Date` | now | Time for new events; pass it for stable stories. |

### StoreOrderPrintView and StoreOrderDocument

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orders` | `CommerceOrder[]` | `required` | One sheet each, one per page when printed. |
| `kind` | `"invoice" \| "packing-slip"` | `"invoice"` | The starting document; the toggle switches it. |
| `seller` | `StoreDocumentSeller` | `required` | Name, address lines, email, phone, tax id, logo. |
| `refunds` | `(order) => RefundRecord[]` |  | Adds refunded and net paid to invoices. |
| `footer` | `string` |  | Terms under the totals. |
| `onClose` | `() => void` |  | Shows a Back button. |

`StoreOrderDocument` renders one sheet with `kind`, `order`, `seller`, `refunds`. `STORE_DOCUMENT_PRINT_CSS` is the print CSS: `@page` A4, everything except `.nq-print-root` hidden, page break after each sheet, black on white.

### StoreAbandonedCarts

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `carts` | `AbandonedCart[]` | `required` | With customer, lines, last activity, emails sent. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO code. |
| `now, rules` | `number \| Date, RecoveryRules` | now, defaults | Reference time; idle minutes, cooldown hours, email limit, days until lost. |
| `maxDiscountPercent` | `number` | `20` | Largest discount an email may offer. |
| `onSendRecovery` | `(email: RecoveryEmail) => void` |  | Discount percent and amount, message. |
| `loading, error, onRetry` |  |  | States. |

### Pure modules

- `order-math`: `lineRefundable`, `refundRemaining`, `planRefund`, `applyRefund`, `planFulfilment`, `applyFulfilment`, `fulfilmentState`, `deriveOrderStatus`, `planCancel`, `applyCancel`, `paymentSummary`, `allocate`. A refund cancels unshipped units first; line values plus shipping always add up to the order total exactly.
- `orders-list-logic`: `filterOrders`, `viewCounts`, `activeView`, `upsertView`, `ordersToCsv`.
- `abandoned-logic`: `recoveryStatus`, `canSendRecovery`, `recoveryStats`, `recoveryDiscount`.

## Examples

**Print from the list**

```tsx
<StoreOrdersList orders={orders} currency="USD" onPrint={(picked, kind) => setPrint({ picked, kind })} />
{print ? <StoreOrderPrintView orders={print.picked} kind={print.kind} currency="USD" seller={{ name: "Bayt Store" }} onClose={() => setPrint(null)} /> : null}
```

**A goodwill refund by amount** is chosen in the dialog; in code, `planRefund(order, refunds, { mode: "amount", amount: 5000 })` returns `{ ok, amount, issues }`.

## Accessibility

- Status, payment and fulfilment are words in a chip, never colour alone.
- Every dialog is a real modal with a title; errors in the refund form are text under the field and in a live region.
- Tables use the data-table keyboard model.

| Key | Action |
| --- | --- |
| Tab | Moves through filters, rows and actions. |
| Space | Selects a row. |
| Enter | Opens the row. |
| Esc | Closes a dialog. |

## RTL & i18n

- Everything mirrors. Money and counts use the locale digits through `Num`; order numbers, emails, phone numbers and tracking numbers are isolated left to right.
- Strings live in `STRINGS = { en, ar }` in `admin-strings.ts`, replaceable with `labels`.
- Printed documents use logical properties, so an Arabic sheet prints right to left.

## Styling & tokens

- Uses `--nq-*` tokens and the shared chip variants. No raw colours.
- Print CSS is in `STORE_DOCUMENT_PRINT_CSS`; target `.nq-print-root`, `.nq-print-sheet`, `.nq-print-hide`.

## Do / Don't

- Do save what `onChange` gives you; it is already consistent.
- Do run the same `order-math` functions on the server before trusting a client refund.
- Don't refund an unpaid order: `canRefund` is false and the dialog says why.
- Don't pass money in major units.

## Related

- [`store-order-timeline`](../store-order-timeline/README.md)
- [`store-account`](../store-account/README.md)
- [`store-dashboard`](../store-dashboard/README.md)
- [`data-table`](../data-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-store-admin-store-orders-admin--docs
