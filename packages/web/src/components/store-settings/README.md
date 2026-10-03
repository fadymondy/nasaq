---
name: store-settings
title: Store Settings
category: store-admin
status: beta
summary: "The merchant's store configuration: shipping zones and rates with local pickup, tax rates (inclusive or exclusive), discounts with a basket simulator, and gift cards with issue, ledger history and a checkout redeem field. Pure, tested logic for rate resolution, discount evaluation and gift card balances."
exports: [DiscountSimulator, SimCollection, DiscountsManager, DiscountsManagerProps, GiftCardField, GiftCardFieldProps, GiftCardLookup, GiftCardsManager, GiftCardsManagerProps, ShippingSettings, ShippingSettingsProps, SettingsResult, StoreSettingsLabels, TaxSettings, TaxSettingsProps]
related: [store-products-admin, store-checkout, data-table, currency-input]
story: components-store-admin-store-settings
base-ui: [dialog, select, switch, tabs]
keywords: [shipping, zones, tax, vat, discounts, coupons, bxgy, gift cards, ledger, settings, admin]
---

# Store Settings

The screens a merchant uses to set up how the store charges: shipping zones with flat, by-weight, by-price and free-over rates plus local pickup;
tax rates that are inclusive or exclusive; discounts (automatic or by code, percentage, fixed, buy X get Y, free shipping) with a basket simulator;
and gift cards with issue, balance, history and redeem. Money is integer minor units and tax rates are basis points, so nothing rounds through a float.
The components hold no data and call no API: you pass records and save in `on*` callbacks. The same pure functions run on your server at checkout.

## When to use

- A store back office settings area.
- Checkout, for `GiftCardField` and the pure functions (`resolveShippingOptions`, `evaluateDiscounts`, `orderTax`, `applyGiftCards`).

## When not to use

- Showing shipping or discounts to shoppers: use `store-cart` and `store-checkout`.
- Product prices and stock: use `store-products-admin`.

## Import

```tsx
import { ShippingSettings, TaxSettings, DiscountsManager, GiftCardsManager, GiftCardField, evaluateDiscounts } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ShippingSettings zones={zones} pickups={pickups} currency="USD" onSaveZone={async (z) => api.saveZone(z)} />
<TaxSettings rates={rates} currency="USD" onSave={async (r) => api.saveTax(r)} />
<DiscountsManager discounts={discounts} currency="USD" products={products} onSave={async (d) => api.saveDiscount(d)} />
<GiftCardsManager cards={cards} currency="USD" onIssue={async (c) => api.createCard(c)} onUpdate={async (c) => api.saveCard(c)} />
```

## Anatomy

```
ShippingSettings  [data-slot=shipping-settings]  zone cards, zone editor with rate and tier editors, pickup points, destination tester
TaxSettings       [data-slot=tax-settings]       DataTable, editor dialog, calculator
DiscountsManager  [data-slot=discounts-manager]  DataTable, editor dialog, DiscountSimulator [data-slot=discount-simulator]
GiftCardsManager  [data-slot=gift-cards-manager] DataTable, issue dialog, detail sheet with ledger
GiftCardField     [data-slot=gift-card-field]    checkout box with card chips
```

## API

### ShippingSettings

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `zones` | `readonly ShippingZone[]` | required | Countries (`"*"` for the rest of the world), optional cities, and rates. |
| `pickups` | `readonly PickupLocation[]` | none | Local pickup points. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code. |
| `onSaveZone` | `(zone) => Promise<SettingsResult>` | required | Resolve `{ error }` to keep the editor open. |
| `onDeleteZone`, `onSavePickup`, `onDeletePickup` | | none | Each adds its action. |
| `loading`, `error`, `onRetry`, `labels` | | | States and strings. |

Rate types: `flat`, `weight` (tiers in grams), `price` (tiers on the order price), `free-over` (with an optional charge below the threshold). Zones that share a country are flagged: the first wins.

### TaxSettings

`TaxSettings({ rates, currency, onSave, onDelete, loading, error, onRetry, labels })`. A `TaxRate` is `{ id, name, country, region?, bps, inclusive, onShipping?, active? }`. `bps` 1400 is 14%. Inclusive rates split the tax out of the price; exclusive rates add it. Tax is computed once per order with `orderTax`.

### DiscountsManager

| Prop | Type | Description |
| --- | --- | --- |
| `discounts` | `readonly Discount[]` | Kinds `percentage`, `fixed`, `bxgy`, `free-shipping`; method `automatic` or `code`. |
| `currency` | `string` | ISO 4217 code. |
| `products`, `collections` | | For scope pickers and the simulator. |
| `segments`, `usage`, `now` | | Eligibility choices, use counts by id, and today. |
| `onSave`, `onDelete` | `(discount) => Promise<SettingsResult>` | New discounts arrive with a fresh `id`. |
| `simulator` | `boolean` | Show the basket simulator. |

`evaluateDiscounts(discounts, { lines, shipping, codes, now, customer })` returns `applied`, `rejected` with a reason, the totals after discounts and the shipping discount. Discounts of one kind never stack. Percentages are basis points and shares are split with `allocateDiscount`, so the parts always add up to the whole.

### GiftCardsManager

`GiftCardsManager({ cards, currency, now, onIssue, onUpdate, actor, loading, error, onRetry, labels })`. Cards hold a ledger; the balance is its sum, never stored. Redeem, adjust and disable call `onUpdate` with the card and its new entry.

### GiftCardField

`GiftCardField({ cards, total, currency, onLookup, onCardsChange, onChange, now, disabled, labels })`. Codes are checked for shape and check character before `onLookup` is called. The card that expires first is spent first.

### Logic (pure, also exported)

Shipping: `zoneFor`, `rateFor`, `resolveShippingOptions`, `cheapestDelivery`, `toCommerceShippingMethods`, `tierIssues`, `overlappingCountries`.
Tax: `taxRateFor`, `splitTax`, `orderTax`, `duplicateTaxRegions`.
Discounts: `evaluateDiscounts` (also `allocateDiscount`, `percentOf`, `canCombine`, `discountStanding`, `discountRejection`).
Gift cards: `issueGiftCard`, `redeemGiftCard`, `refundToGiftCard`, `adjustGiftCard`, `applyGiftCards`, `giftCardBalance`, `giftCardStatus`, `generateGiftCardCode`, `isValidGiftCardCode`, `ledgerIssues`.

## Examples

```tsx
const result = evaluateDiscounts(discounts, {
  lines: [{ id: "a", productId: "p1", unitPrice: 25000, quantity: 3 }],
  shipping: 5000,
  codes: ["SUMMER10"],
  now: new Date(),
});
result.goodsAfter + result.shippingAfter; // what the customer pays, in minor units
```

## Accessibility

| Key | Action |
| --- | --- |
| Enter on a row | Open it for editing. |
| Shift+F10, Menu key, context-click | Row actions. |
| Escape | Close a dialog or sheet. |

Results in the simulator, tester and checkout box are live regions. Errors are tied to their field. Every icon-only button has a label.

## RTL & i18n

English and Arabic built in through `useOptionalNasaq()`. Codes, SKUs, prices and numbers stay LTR inside `dir="ltr"` or `<bdi>`. Country names use `Intl.DisplayNames` in the page language.

## Styling & tokens

Uses `--nq-*` tokens only. Target the `data-slot` names above.

## Do / Don't

- Do keep money in minor units and tax in basis points.
- Do run `evaluateDiscounts`, `orderTax` and `resolveShippingOptions` again on the server.
- Don't store a gift card balance: derive it from the ledger.

## Related

- [store-products-admin](../store-products-admin/README.md)
- [store-checkout](../store-checkout/README.md)
- [data-table](../data-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-store-admin-store-settings--docs
