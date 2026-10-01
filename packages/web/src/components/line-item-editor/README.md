---
name: line-item-editor
title: Line Item Editor
category: billing
status: beta
summary: Editable invoice or quote lines with a product picker that fills name, price and tax, free lines, quantity, discount and exact integer totals.
exports: [LineItemActionsMenu, LineItemDecimalField, LineItemMoney, LineItemActionsMenuProps, LineItemDecimalFieldProps, LineItemMoneyProps, allocateMinor, bpsToPercentText, computeLineItems, lineGross, mulDivRound, quantityMilli, quantityText, taxInside, taxOn, LineItemMathInput, LineItemMathOptions, LineItemResult, LineItemTotals, LineOrderDiscount, LineTaxGroup, LineTaxMode, LineTaxRounding, LineItemEditorLabels, useLineItemEditorStrings, LineItemEditorProduct, LineItemEditorLine, LineItemEditorProps, LineItemEditor]
related: [currency-input, price, invoice-view, data-table, pos-register]
story: components-billing-line-item-editor
base-ui: [combobox, select]
keywords: [invoice, quote, line items, basket, tax, discount, totals, product picker, minor units]
---

# Line Item Editor

The lines of an invoice, quote or order. Pick a product to fill its name, price and tax rate, or type a free line. Quantity,
unit price, discount and tax are editable per line, and the totals are computed in integer minor units, so there is no float
drift. It is controlled: you own the array of lines.

## When to use

- Quotes, invoices, purchase orders and any list of priced lines.

## When not to use

- Read-only invoices: use [`InvoiceView`](../invoice-view/README.md).
- A touch till: use [`PosRegister`](../pos-register/README.md).

## Import

```tsx
import { LineItemEditor, computeLineItems } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const [lines, setLines] = useState<LineItemEditorLine[]>([]);

<LineItemEditor
  value={lines}
  onValueChange={setLines}
  products={[{ id: "p1", name: "Coffee beans", sku: "CB-1", price: 6500, taxBps: 1500 }]}
  currency="SAR"
  defaultTaxBps={1500}
/>;
```

## API

`LineItemEditorProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `LineItemEditorLine[]` | `[]` | The lines. |
| `onValueChange` | `(lines) => void` | none | Called on every edit. |
| `products` | `LineItemEditorProduct[]` | none | Picker options. Prices are minor units. |
| `currency` | `string` | `"USD"` | ISO 4217 code. Sets the price decimals. |
| `taxMode` | `"exclusive" \| "inclusive"` | `"exclusive"` | Whether prices contain tax. |
| `taxRounding` | `"line" \| "invoice"` | `"line"` | Round tax per line or once per rate. |
| `defaultTaxBps` | `number` | `0` | Rate for lines without their own (1500 is 15%). |
| `taxRates` | `number[]` | `[0, 500, 1500]` | Rates the tax select offers. |
| `showTax`, `showDiscount` | `boolean` | `true` | Show the columns. |
| `allowFreeLines` | `boolean` | `true` | Allow lines that are not a product. |
| `maxLines` | `number` | none | Cap on the number of lines. |
| `orderDiscount` / `onOrderDiscountChange` | `LineOrderDiscount` | none | A discount on the whole basket. |
| `readOnly`, `disabled` | `boolean` | `false` | State. |
| `footer` | `(totals) => ReactNode` | none | Rendered under the totals. |
| `labels` | `LineItemEditorLabels` | none | Overrides for the built-in strings. |

### Money helpers

`computeLineItems(items, { taxMode, taxRounding, defaultTaxBps, orderDiscount })` returns per-line gross, discount, taxable,
tax and total, the totals and the tax groups. Rounding is half away from zero on BigInt products. `allocateMinor` shares an
amount with the largest-remainder method so the parts always add up. `LineItemMoney`, `LineItemDecimalField` and
`LineItemActionsMenu` are the small pieces the POS and ledger components reuse.

## Examples

Tax-inclusive prices: `<LineItemEditor taxMode="inclusive" />`. Tax rounded once per rate: `taxRounding="invoice"`.

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through the fields of each line. |
| Arrow keys | Move in the product and tax lists. |
| Enter | Pick the highlighted product. |

- Every field is named with its line, for example "Qty, Steel tumbler".
- Line actions are in a menu button and in the context menu, so pointer and keyboard users get the same actions.

## RTL & i18n

Built-in English and Arabic. Amounts use `Intl` and are isolated left to right. Fields accept Arabic-Indic digits.

## Styling & tokens

Semantic tokens only. It uses container queries: a table at wide widths and stacked cards below. Target
`[data-slot="line-item-editor"]`.

## Do / Don't

- Do keep money in minor units in your data model.
- Do recompute on the server with the same rounding options.
- Don't multiply prices with floats yourself.

## Related

- [`currency-input`](../currency-input/README.md)
- [`invoice-view`](../invoice-view/README.md)
- [`price`](../price/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-billing-line-item-editor--docs
