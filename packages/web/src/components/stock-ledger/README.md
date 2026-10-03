---
name: stock-ledger
title: Stock Ledger
category: store-admin
status: beta
summary: On-hand stock per warehouse computed from receive, issue and adjust movements, with a running-balance trail and a record dialog.
exports: [stockCanIssue, stockCellKey, stockLevel, stockMatrix, stockOnHand, stockSignedQuantity, stockStatement, stockSum, stockTransfer, StockLevel, StockMatrix, StockMatrixRow, StockMovement, StockMovementType, StockProduct, StockStatementRow, StockWarehouse, StockLedgerLabels, useStockLedgerStrings, StockOnHandProps, StockOnHand, StockMovementListProps, StockMovementList, StockLedgerProps, StockLedger]
related: [pos-register, data-table, line-item-editor, accounting-ledger]
story: components-store-admin-stock-ledger
base-ui: [dialog, select, toggle-group]
keywords: [stock, inventory, warehouse, on hand, movement, receive, issue, adjust, transfer, reorder, ledger]
---

# Stock Ledger

Stock is never typed in as a number. It is the sum of movements: a receive adds, an issue subtracts, an adjustment moves
it either way, and a transfer is an issue in one warehouse paired with a receive in another. `StockLedger` shows the
result as a product-by-warehouse grid with a low-stock flag, the movement trail of one product with a running balance, and
a dialog to record the next movement.

## When to use

- Inventory screens for a shop, café or warehouse team.

## When not to use

- A sales counter: use [`PosRegister`](../pos-register/README.md) and post its sales as issues.

## Import

```tsx
import { StockLedger } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StockLedger
  products={[{ id: "beans", name: "Coffee beans 250g", sku: "RTL-001", unit: "pcs", reorderPoint: 12 }]}
  warehouses={[{ id: "ruh", name: "Riyadh", code: "RUH" }]}
  movements={movements}
  onRecord={async (added) => api.saveMovements(added)}
/>
```

## API

`StockLedgerProps extends Omit<ComponentProps<"section">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `StockProduct[]` | required | `{ id, name, sku, unit?, reorderPoint? }`. |
| `warehouses` | `StockWarehouse[]` | required | `{ id, name, code? }`. The code heads the grid column. |
| `movements` | `StockMovement[]` | required | `{ id, date, productId, warehouseId, type, quantity, reference?, note? }` with a signed `quantity`. |
| `onRecord` | `(movements) => void \| Promise<void>` | none | Receives one movement, or two for a transfer. Throw to keep the dialog open. Omit for a read-only ledger. |
| `asOf` | `string` | none | ISO date. Later movements are ignored. |
| `labels` | `StockLedgerLabels` | none | Overrides for the built-in strings. |

`StockOnHand` (the grid: `products`, `warehouses`, `movements`, `asOf`, `onSelectProduct`, `onRecordFor`) and
`StockMovementList` (`productId`, `warehouseId`) are exported for custom layouts.

### Maths

`stockOnHand`, `stockMatrix`, `stockStatement`, `stockLevel`, `stockCanIssue`, `stockTransfer` and `stockSignedQuantity` are
pure. Quantities may have three decimals; they are summed as integers of a thousandth, so 0.1 ten times is exactly 1.
A product is `low` at or under its reorder point (on its total across warehouses) and `out` at zero or less.

The dialog blocks an issue, a decrease or a transfer that exceeds what the source warehouse holds. Your server should
check it again.

## Examples

Feed POS sales in as issues with the sale number as `reference`. Reverse a mistake with an opposite movement, not by
editing history.

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move across product links, row menus, filters and buttons. |
| Shift+F10 / Menu | Open the product menu (same actions as the ⋯ button). |
| Escape | Close the dialog. |

- Low and out are text badges as well as colour. Validation errors use `role="alert"`.

## RTL & i18n

Built-in English and Arabic. The grid mirrors, and the product column stays pinned to the start edge. Quantities, SKUs and
references stay left to right and aligned on their digits.

## Styling & tokens

Semantic tokens only. Tables scroll sideways on narrow widths. Target `[data-slot="stock-ledger"]`,
`[data-slot="stock-on-hand"]`, `[data-slot="stock-movements"]`.

## Do / Don't

- Do keep movements append-only and derive on-hand from them.
- Do give every movement a reference to the document behind it.
- Don't store a running on-hand number that can disagree with the movements.

## Related

- [`pos-register`](../pos-register/README.md)
- [`accounting-ledger`](../accounting-ledger/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-store-admin-stock-ledger--docs
