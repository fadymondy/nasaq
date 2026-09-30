---
name: pos-register
title: POS Register
category: commerce
status: beta
summary: A touch point-of-sale register with a product grid, basket, held sales, split payment across cash card and wallet, cash-drawer session and walk-in sale, in exact integer money.
exports: [posCanAddTender, posChange, posDrawerSummary, posQuickTenders, posRemaining, posRoundMinor, posSaleParts, posSettle, posTenderLimit, posVariance, PosDrawerSale, PosDrawerSummary, PosPaymentMethod, PosSettlement, PosTender, PosRegisterLabels, PosProduct, PosCategory, PosBasketLine, PosSession, PosSale, PosSaleRecord, PosParkedSale, PosCloseReport, PosRegisterProps, usePosRegisterStrings, PosRegister]
related: [line-item-editor, wallet, price, product-card, barcode]
story: components-commerce-pos-register
base-ui: [dialog, alert-dialog, toggle-group]
keywords: [pos, point of sale, register, till, cashier, cash drawer, basket, checkout, walk-in, barcode, hold, park, split payment, tender]
---

# POS Register

A till in one piece. A session must be open before anything sells: the cashier enters the opening float, taps products into
the basket, charges by cash, card or wallet (or a mix of them), can park a basket while serving someone else, and at the end of the shift counts the drawer. The register never records
anything itself. `onCheckout` receives the finished sale and `onCloseRegister` the drawer report.

## When to use

- A shop or café counter, on a tablet or a phone.

## When not to use

- Invoices with typed lines and customers: use [`LineItemEditor`](../line-item-editor/README.md).

## Import

```tsx
import { PosRegister } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<PosRegister
  products={[{ id: "p1", name: "Espresso", price: 1200, taxBps: 1500, category: "drinks", stock: 40, barcode: "6281000000011" }]}
  categories={[{ id: "drinks", label: "Drinks" }]}
  currency="SAR"
  defaultTaxBps={1500}
  cashier="Lina"
  onCheckout={async (sale) => api.saveSale(sale)}
  onCloseRegister={async (report) => api.closeDrawer(report)}
/>
```

## API

`PosRegisterProps extends Omit<ComponentProps<"section">, "children" | "defaultValue">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `PosProduct[]` | required | Prices in minor units. `stock` disables a tile when the basket holds it all. |
| `categories` | `PosCategory[]` | none | Filter chips. |
| `currency` | `string` | `"USD"` | ISO 4217 code. |
| `taxMode` | `"exclusive" \| "inclusive"` | `"exclusive"` | Whether prices contain tax. |
| `defaultTaxBps` | `number` | `0` | Rate for products without their own. |
| `session` / `defaultSession` | `PosSession \| null` | `null` | The open drawer session. `null` shows the closed register. |
| `onSessionChange` | `(session \| null) => void` | none | Called when the register opens or closes. |
| `cashier` | `string` | `""` | Used when the register opens a session. |
| `defaultSales` | `PosSaleRecord[]` | `[]` | Sales already in the session, for the drawer count. `tenders` may be missing on older sales. |
| `parkedSales` / `defaultParkedSales` | `PosParkedSale[]` | `[]` | Sales on hold. Pass `parkedSales` to control the list. |
| `onParkedSalesChange` | `(sales) => void` | none | The new list after a sale is parked, resumed or discarded. |
| `onPark` / `onResume` | `(sale: PosParkedSale) => void` | none | Called after the basket is parked, and after a parked sale is put back in the basket. |
| `onCheckout` | `(sale) => void \| Promise<void>` | none | Throw to show a failed payment; nothing is recorded. `sale.tenders` lists every payment. |
| `onCloseRegister` | `(report) => void \| Promise<void>` | none | Float, cash, card, wallet, expected, counted and the variance. |
| `labels` | `PosRegisterLabels` | none | Overrides for the built-in strings. |

### Hold and park

The pause button next to Charge (and in the mobile bar) opens a small form for an optional note and parks the basket. The
"Parked sales" button in the header carries the count as a badge and opens the list: time, item count, total, cashier and
note for each, newest first. **Resume** puts the lines back in the basket; when the basket already has items it asks first,
because resuming replaces them. **Discard** always asks. A `PosParkedSale` is `{ id, at, cashier, note?, lines, totals }`.
Parked sales survive closing the register, since they belong to the till and not to the session.

```tsx
<PosRegister
  products={products}
  parkedSales={parked}
  onParkedSalesChange={setParked}
  onPark={(sale) => api.saveParked(sale)}
  onResume={(sale) => api.removeParked(sale.id)}
/>
```

### Split payment

The payment dialog takes one or several tenders. Pick cash, card or wallet, enter an amount and press **Add payment**; add
as many as needed, including the same method twice. The remaining balance updates as you type and each tender can be
removed. Leaving the amount empty on a first card or wallet tender means the whole sale, and a single cash amount that covers the total
charges straight away, so a one-tender sale is still two taps.

- Change is only ever given from cash, and only when cash overpays what is left after the other tenders.
- Card and wallet cannot exceed the remaining amount: the field is marked invalid, and Add and Confirm stay disabled.
- Confirm is enabled only when the remaining amount is 0.
- The receipt lists every tender, the amount paid and the change.

`onCheckout` receives `sale.tenders`, an array of `{ id, method, amount }` where a cash amount is what was handed over,
before change. With exactly one tender, `sale.method`, `sale.tendered` and `sale.change` are filled in as before. With more
than one, `sale.method` is `"split"`, `sale.tendered` is the sum of all tenders and `sale.change` is the change from cash.
The drawer count uses what each method actually took, with change already off the cash.

### Drawer maths

`posDrawerSummary(float, sales)` adds sales by method. The expected cash is the float plus cash taken minus cash refunded,
so change handed back never counts. `posVariance(expected, counted)` is counted minus expected: negative is short.
`posQuickTenders(due, currency)` gives the exact amount and the next banknotes. `posChange` and `posRemaining` never go
negative.

### Split-payment maths

Pure functions in `pos-math.ts`, all in integer minor units. `posRoundMinor(n)` turns any amount into a whole number: a
fraction rounds half up, and negative or non-finite values become 0.

| Function | Returns |
| --- | --- |
| `posSettle(due, tenders)` | `{ paid, remaining, change, cash, card, wallet, valid, settled }`. `cash` is net of change; `valid` is false when card plus wallet exceed the total; `settled` means fully paid and valid. |
| `posTenderLimit(due, tenders, method)` | The most a new tender may be: the remaining amount for card and wallet, `Infinity` for cash. |
| `posCanAddTender(due, tenders, method, amount)` | Whether the amount is positive, something is still owed and the limit holds. |
| `posSaleParts(due, tenders)` | What each method took, for the drawer. |

## Examples

Tax-inclusive: `taxMode="inclusive"`. Closed: `defaultSession={null}` shows the opening float form. Held sales:
`defaultParkedSales` (story "Parked sales"). Split payment: charge, add a card part, then pay the rest in cash (story "Split payment").

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move across search, categories, tiles and the basket. |
| Enter in search | Add the product whose barcode or SKU matches, or the only match. |
| Shift+F10 / Menu | Open the line menu (same actions as the ⋯ button). |
| Enter in an amount | Add the payment; when it completes the sale, charge it. |
| Escape | Close a dialog (not while a payment is busy). |

- Tiles are real buttons with a 6rem minimum height for touch. Out-of-stock tiles are disabled and labelled.
- Quantities are announced as they change. A failed payment and an over-payment by card or wallet are announced with `role="alert"`;
  the remaining amount and the change are live regions. The parked list is a list, and both confirmations are alert dialogs that focus Cancel first.

## RTL & i18n

Built-in English and Arabic. The grid, basket and dialogs mirror. Amounts use `Intl` and are isolated left to right; receipt
numbers stay left to right.

## Styling & tokens

Semantic tokens only. Container queries put the basket beside the grid from 48rem, and under it with a sticky Charge bar
below that. Target `[data-slot="pos-register"]`.

## Do / Don't

- Do record the sale on your server in `onCheckout`, then let the register clear the basket.
- Do send the drawer report to your books when closing.
- Don't treat the tendered cash as revenue: the sale total is.
- Do read `sale.tenders`, not `sale.method`, when you book payments: a split sale has `method: "split"`.

## Related

- [`line-item-editor`](../line-item-editor/README.md)
- [`wallet`](../wallet/README.md)
- [`product-card`](../product-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-pos-register--docs
