---
name: invoice-list
title: InvoiceList
category: billing
status: beta
summary: Invoices and payments tables with summary tiles, status filters, search, pagination and per-row download.
exports: [InvoiceListLabels, InvoiceSummary, PaymentStatus, PaymentRecord, summarizeInvoices, InvoiceListProps, InvoiceList]
related: [invoice-view, data-table, price, wallet]
story: components-billing-invoicelist
base-ui: [tabs]
keywords: [invoices, payments, billing, history, table, download, status, filter]
---

# InvoiceList

A billing history view: outstanding, overdue and paid tiles on top, then an Invoices tab (and an optional Payments tab)
built on `DataTable` with search, a status filter, pagination and a download button on every row.

## When to use

- A customer's invoice and payment history.
- An admin list of invoices with quick status filtering.

## When not to use

- Showing one invoice: use [`InvoiceView`](../invoice-view/README.md).
- A generic table: use [`DataTable`](../data-table/README.md).
- Wallet activity: use [`WalletTransactions`](../wallet/README.md).

## Import

```tsx
import { InvoiceList, type InvoiceSummary } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { InvoiceList, type InvoiceSummary } from "@fadymondy/nasaq/web";

const invoices: InvoiceSummary[] = [
  { id: "1", number: "INV-2026-0042", issueDate: "2026-09-01", dueDate: "2026-09-30", amount: 281.75, status: "open" },
  { id: "2", number: "INV-2026-0037", issueDate: "2026-08-01", amount: 281.75, status: "paid" },
];

export function Billing() {
  return <InvoiceList invoices={invoices} currency="USD" onOpen={(i) => console.log(i.number)} />;
}
```

## Anatomy

```
InvoiceList                     data-slot="invoice-list"
├─ StatGrid                     outstanding · overdue · paid (showSummary)
└─ Tabs                         invoices · payments (when `payments` is given)
   └─ DataTable                 search, status facet filter, rows, pagination
```

## API

### `InvoiceList`

`InvoiceListProps extends Omit<ComponentProps<"div">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `invoices` | `readonly InvoiceSummary[]` | required | Invoice rows. |
| `payments?` | `readonly PaymentRecord[]` | none | Adds a Payments tab. |
| `currency` | `string` | required | ISO 4217 code for every amount. |
| `onOpen?` | `(invoice: InvoiceSummary) => void` | none | Rows become clickable; adds "View invoice". |
| `onDownload?` | `(invoice: InvoiceSummary) => Promise<void>` | none | Adds a download button per row. Reject to show the error. |
| `onPay?` | `(invoice: InvoiceSummary) => void` | none | Adds "Pay now" to open and overdue rows. |
| `showSummary?` | `boolean` | `true` | Shows the summary tiles. |
| `pageSize?` | `number` | `8` | Rows per page. |
| `loading?` | `boolean` | `false` | Skeleton rows. |
| `error?` | `boolean` | `false` | Replaces the table with an error state. |
| `onRetry?` | `() => void` | none | The retry button of the error state. |
| `defaultTab?` | `"invoices" \| "payments"` | `"invoices"` | Starting tab. |
| `labels?` | `InvoiceListLabels` | built-in en/ar | Partial string overrides. |

### Types

`InvoiceSummary`: `id`, `number`, `customer?`, `issueDate`, `dueDate?`, `amount`, `status: InvoiceStatus`.
`PaymentRecord`: `id`, `date`, `amount`, `status: PaymentStatus` (`"succeeded" | "pending" | "failed" | "refunded"`), `method`,
`invoiceNumber?`, `reference?`.

### `summarizeInvoices`

`(invoices: readonly InvoiceSummary[]) => { outstanding, overdue, paid }`. Open and overdue count as outstanding.

## Examples

### With payments and download

```tsx
<InvoiceList
  invoices={invoices}
  payments={[{ id: "p1", date: "2026-08-03", amount: 281.75, status: "succeeded", method: "Visa ending 4242", invoiceNumber: "INV-2026-0037" }]}
  currency="USD"
  onDownload={async (i) => {
    await savePdf(i.number);
  }}
/>
```

### Loading and error

```tsx
<InvoiceList invoices={[]} currency="USD" loading />
<InvoiceList invoices={[]} currency="USD" error onRetry={() => refetch()} />
```

### Arabic

```tsx
<NasaqProvider locale="ar">
  <InvoiceList invoices={invoices} currency="SAR" />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through search, filter, rows and buttons. |
| Arrow keys | Move between tabs. |
| Enter | Open a focused row or activate a button. |

- Status chips have an icon and a word.
- Download buttons are named with the invoice number.
- Localise `labels` for any custom copy.

## RTL & i18n

Built-in English and Arabic. Amounts use `Intl` and are isolated left to right; invoice numbers and references stay left to
right. Dates follow the locale.

## Styling & tokens

Composes `DataTable`, `StatCard` and `Tabs`, so it uses their tokens. Target `[data-slot="invoice-list"]`; extend with `className`.

## Do / Don't

- Do reject the `onDownload` promise to show an error message.
- Do pass one `currency`; mixed-currency lists need separate lists.
- Don't put more than a few thousand rows in without server paging.

## Related

- [`invoice-view`](../invoice-view/README.md)
- [`data-table`](../data-table/README.md)
- [`wallet`](../wallet/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-billing-invoicelist--docs
