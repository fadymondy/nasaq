---
name: cash-collect
title: Cash Collect
category: delivery
status: beta
summary: A cash-on-delivery panel - order total plus delivery fee minus prepaid, the amount received, and live short, exact or change-due feedback, with quick amounts and confirm.
exports: [CashCollectLabels, CashCollectProps, CashCollect, cashBreakdown]
related: [currency-input, price, wallet, dispatch-offer, route-stops]
story: components-delivery-cash-collect
keywords: [cash, cod, collect, change, prepaid, delivery fee, courier, settlement]
---

# Cash Collect

What the courier must take at the door and what to hand back. Amounts are integer minor units (cents, halalas).

## When to use

- Confirming cash at drop-off.

## When not to use

- Card or wallet payment: use [`Price`](../price/README.md) and your payment flow.
- Settling a courier at day end: use [`Wallet`](../wallet/README.md) or the ledger.

## Import

```tsx
import { CashCollect, cashBreakdown } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<CashCollect orderTotalMinor={8500} deliveryFeeMinor={1500} onConfirm={(minor) => save(minor)} />
```

## Anatomy

```
CashCollect  data-slot="cash-collect"  data-state
├─ breakdown: total, fee, prepaid, due
├─ CurrencyInput + quick amounts
├─ state line: short / exact / change
└─ Confirm
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orderTotalMinor` | `number` | required | Goods total. |
| `deliveryFeeMinor` | `number` | `0` | Added to the total. |
| `prepaidMinor` | `number` | `0` | Already paid; subtracted. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO currency. |
| `collectedMinor` / `defaultCollectedMinor` | `number \| null` | none | Controlled or initial received amount. |
| `onCollectedChange` | `(minor) => void` | none | Input change. |
| `onConfirm` | `(minor) => void` | none | Confirm tapped. |
| `allowShort` | `boolean` | `false` | Allow confirming less than due. |
| `quickAmounts` | `number[]` | derived | Quick-pick buttons, minor units. |
| `loading` | `boolean` | `false` | Disables confirm. |
| `locale` / `labels` | `"en" \| "ar"` / partial strings | context | Language and overrides. |

`cashBreakdown({ orderTotal, deliveryFee, prepaid, collected })` returns `{ due, collected, shortBy, change, state }`
where `state` is `unpaid`, `short`, `exact` or `over`.

## Examples

Lab stories: short, short allowed, change due, partly or fully prepaid, Arabic.

## Accessibility

The state line is a polite live region. The input is labelled; confirm is disabled while short unless `allowShort`.

## RTL & i18n

The amount field stays LTR inside RTL pages so digits do not reorder. Arabic copy is built in.

## Styling & tokens

Uses `--status-success`, `--status-warning`, `--status-danger`. Target `[data-state]`.

## Do / Don't

- Do work in minor units end to end.
- Don't round change; show it exactly.

## Related

[`CurrencyInput`](../currency-input/README.md), [`Wallet`](../wallet/README.md), [`RouteStops`](../route-stops/README.md).

## Lab

https://docs.nasaqui.com/?path=/docs/components-delivery-cash-collect--docs
