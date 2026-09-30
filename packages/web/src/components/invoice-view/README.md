---
name: invoice-view
title: InvoiceView
category: commerce
status: beta
summary: A printable invoice document with parties, line items, tax, discount, payments and balance, plus download, print and pay actions.
exports: [InvoiceLabels, useInvoiceStrings, InvoiceStatus, InvoiceParty, InvoiceLine, InvoicePayment, InvoiceData, InvoiceTotals, computeInvoice, InvoiceStatusBadgeProps, InvoiceStatusBadge, InvoiceViewProps, InvoiceView]
related: [invoice-list, price, checkout-steps, numeric]
story: components-commerce-invoiceview
base-ui: []
keywords: [invoice, print, pdf, billing, tax, vat, receipt, payments]
---

# InvoiceView

Renders one invoice as a document: issuer and customer, dates, line items, subtotal, discount, tax, total, payments
received and the balance due. It computes the totals from the lines with `computeInvoice`, so the numbers always add up.
It prints cleanly: on print only the invoice sheet is visible, in black on white, and rows do not split across pages.

## When to use

- Showing a single invoice in an app or customer portal.
- Letting people print an invoice or save it as a PDF from the browser's print dialog.

## When not to use

- Listing many invoices: use [`InvoiceList`](../invoice-list/README.md).
- Taking a new payment: use [`CheckoutSteps`](../checkout-steps/README.md).

## Import

```tsx
import { InvoiceView, type InvoiceData } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { InvoiceView, type InvoiceData } from "@fadymondy/nasaq/web";

const invoice: InvoiceData = {
  number: "INV-2026-0042",
  status: "open",
  issueDate: "2026-09-01",
  dueDate: "2026-09-30",
  currency: "USD",
  taxRate: 0.15,
  from: { name: "Nasaq Ltd", address: ["1 King Fahd Rd", "Riyadh"], taxId: "300000000000003" },
  to: { name: "Acme Co", email: "billing@acme.test" },
  lines: [{ id: "1", description: "Team plan", details: "Sep 2026", quantity: 5, unitPrice: 49 }],
};

export function Invoice() {
  return <InvoiceView invoice={invoice} />;
}
```

## Anatomy

```
InvoiceView                       data-slot="invoice-view"
├─ action bar                     Download · Print · Pay now (hidden in print)
└─ sheet                          data-slot="invoice-sheet" (the only thing printed)
   ├─ header                      logo, number, InvoiceStatusBadge
   ├─ parties                     from, to, dates
   ├─ lines table                 description, quantity, unit price, amount
   ├─ totals                      subtotal, discount, tax, total, paid, due
   └─ notes and terms
```

## API

### `InvoiceView`

`InvoiceViewProps extends Omit<ComponentProps<"section">, "children" | "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `invoice` | `InvoiceData` | required | The invoice. |
| `onDownload?` | `() => Promise<void>` | none | Builds and saves the PDF (yours). Omitted: the button is hidden; Print still works. |
| `onPrint?` | `() => void` | `window.print()` | Replaces the print action. |
| `onPay?` | `() => void` | none | Shows "Pay now" while the invoice is open or overdue. |
| `actions?` | `ReactNode` | none | Extra buttons before the built-in ones. |
| `hideActions?` | `boolean` | `false` | Hides the whole action bar. |
| `labels?` | `InvoiceLabels` | built-in en/ar | Partial string overrides. |

### `InvoiceData`

`number`, `status: InvoiceStatus` (`"draft" | "open" | "paid" | "overdue" | "void" | "refunded"`), `issueDate`, `dueDate?`,
`currency` (ISO 4217), `from` and `to` (`InvoiceParty`: `name`, `address?: string[]`, `email?`, `phone?`, `taxId?`, `logo?`),
`lines` (`InvoiceLine`: `id`, `description`, `details?`, `quantity`, `unitPrice`, `taxRate?`), `discount?` (fixed amount),
`taxRate?` (fraction), `payments?` (`InvoicePayment`: `id`, `date`, `method`, `amount`), `notes?`, `terms?`.

### `computeInvoice`

`(invoice: Pick<InvoiceData, "lines" | "discount" | "taxRate" | "payments" | "status">) => InvoiceTotals`. Returns
`{ subtotal, discount, tax, total, paid, due }`. The discount is spread over the lines in proportion; `due` is `0` for
draft, void and refunded invoices.

### `InvoiceStatusBadge`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `InvoiceStatus` | required | The status; shows an icon and a word. |
| `labels?` | `InvoiceLabels` | built-in | String overrides. |

Other props go to the underlying `Badge`. `useInvoiceStrings(labels?)` returns `{ t, ar, locale }` for sibling components.

## Examples

### Paid invoice with a payment

```tsx
<InvoiceView
  invoice={{ ...invoice, status: "paid", payments: [{ id: "p1", date: "2026-09-05", method: "Visa ending 4242", amount: 281.75 }] }}
/>
```

### Download and pay

```tsx
<InvoiceView
  invoice={invoice}
  onDownload={async () => {
    await savePdf(invoice.number);
  }}
  onPay={() => router.push("/pay")}
/>
```

### Arabic

```tsx
<NasaqProvider locale="ar">
  <InvoiceView invoice={{ ...invoice, currency: "SAR" }} />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through the action buttons. |
| Enter / Space | Activate Download, Print or Pay now. |

- The lines are a real table with column headers; totals are a description list.
- The status badge carries an icon and a word, never colour alone.
- Localise `labels` for any custom copy.

## RTL & i18n

Built-in English and Arabic. Amounts use `Intl` with the invoice `currency`, Latin digits by default like [`Num`](../numeric/README.md),
isolated left to right. Invoice numbers, tax ids and emails stay left to right inside Arabic text. Dates use `Intl.DateTimeFormat`.

## Styling & tokens

Print rules are injected with the component: under `@media print` everything except `[data-slot="invoice-sheet"]` is hidden,
colours are forced to black on white, and `break-inside: avoid` keeps rows whole. Screen styling uses `bg-card`, `border-border`
and text tokens. Extend with `className`; do not use raw hex.

## Do / Don't

- Do provide your own PDF through `onDownload`; the browser print dialog also offers "Save as PDF".
- Do pass `logo` as an element and leave it untouched.
- Don't compute totals yourself for display; use `computeInvoice` so the sheet and your data agree.

## Related

- [`invoice-list`](../invoice-list/README.md)
- [`price`](../price/README.md)
- [`checkout-steps`](../checkout-steps/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-invoiceview--docs
