---
name: store-cart
title: Store Cart
category: store
status: beta
summary: A mini cart drawer and a full cart page with quantity limits, undo, save for later, promo code, shipping estimate, savings and live announcements.
exports: [StoreCartAnnouncerProps, StoreCartAnnouncer, StoreCartButtonProps, StoreCartButton, StoreQuantityStepperProps, StoreQuantityStepper, StoreCartLineItemProps, StoreCartLineItem, StoreFreeShippingBarProps, StoreFreeShippingBar, StoreCartEmptyProps, StoreCartEmpty, StoreMiniCartProps, StoreMiniCart, StoreCartSummaryProps, StoreCartSummary, StoreShippingSelection, StoreShippingEstimatorProps, StoreShippingEstimator, StoreCrossSellProps, StoreCrossSell, StoreCartPromo, StoreCartPageProps, StoreCartPage]
related: [store-checkout, loyalty-promo, price, product-card, sheet]
story: components-storefront-store-cart
base-ui: [dialog, progress]
keywords: [cart, basket, mini cart, drawer, quantity, promo, shipping estimate, save for later, ecommerce]
---

# Store Cart

The shopping cart for a storefront. A drawer opens when something is added; the cart page lets people change quantities (never above
what is in stock), remove a line and undo it, park a line for later, enter a promo code, estimate delivery by city, and see the total
with what they saved. Every change is announced to screen readers. Money is integer minor units.

## When to use

- Physical goods with stock, variants and delivery.

## When not to use

- A point-of-sale ticket: use `pos`. Digital or subscription checkout: use `checkout-steps`.

## Import

```tsx
import { StoreCartPage, StoreMiniCart, StoreCartButton, useStoreCart } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const cart = useStoreCart({ initialLines, feedback: "both" });

<StoreMiniCart
  open={cart.drawerOpen}
  onOpenChange={cart.setDrawerOpen}
  lines={cart.lines}
  currency="USD"
  freeShippingThreshold={150000}
  onQuantityChange={cart.setQuantity}
  onRemove={cart.remove}
  removed={cart.removed}
  onUndo={cart.undo}
  onCheckout={() => router.push("/checkout")}
  trigger={<StoreCartButton count={cart.count} />}
/>
<StoreCartPage lines={cart.lines} currency="USD" message={cart.message} onQuantityChange={cart.setQuantity} onRemove={cart.remove} onCheckout={go} />
```

## Anatomy

```
StoreMiniCart          data-slot="store-mini-cart"         drawer: lines, free-shipping bar, subtotal, Checkout
StoreCartPage          data-slot="store-cart-page"         lines, saved for later, promo, estimator, summary, cross-sell slot
StoreCartLineItem      data-slot="store-cart-line"         image, name, variant, stepper, stock warning, actions and context menu
StoreQuantityStepper   data-slot="store-quantity-stepper"  spinbutton clamped to max
StoreFreeShippingBar   data-slot="store-free-shipping"     progress toward the free-shipping threshold
StoreShippingEstimator data-slot="store-shipping-estimator" city to zone to methods
StoreCartSummary       data-slot="store-cart-summary"      commerceTotals with savings
StoreCrossSell         data-slot="store-cross-sell"        carousel of product cards with quick add
StoreCartEmpty         data-slot="store-cart-empty"        empty state
StoreCartAnnouncer     data-slot="store-cart-announcer"    polite live region
StoreCartButton        data-slot="store-cart-button"       cart icon with a count
```

## API

Read the exported prop types in `store-cart.tsx`. In short:

- `useStoreCart({ initialLines, feedback, labels, onChange })` returns `lines`, `active`, `saved`, `count`, `add`, `setQuantity`, `remove`, `undo`, `removed`, `saveForLater`, `moveToCart`, `fixStock`, `drawerOpen`, `setDrawerOpen`, `message`. `feedback` is `"drawer"`, `"toast"`, `"both"` or `"none"`; the toast needs a mounted `<Toaster />`.
- `StoreCartPage`: `lines`, `currency`, the line callbacks, `freeShippingThreshold`, `zones` (delivery zones by city), `promo` (a `PromoCodeField` fed with `promos` or `onApply`), `taxBps`, `crossSell` slot, `loading`, `error`, `labels`.
- `StoreMiniCart`: `open`, `onOpenChange`, `lines`, `currency`, `freeShippingThreshold`, `trigger`, `removed`, `onUndo`.
- Pure helpers in `cart-logic`: `cartAdd`, `cartSetQuantity`, `cartRemove`, `cartRestore`, `cartSaveForLater`, `cartMoveToCart`, `cartStockIssue`, `cartBlockers`, `cartFixOverStock`, `cartItemFromProduct`, `matchShippingZone`, `cartShippingOptions`. They never mutate and are safe to run on a server.

## Examples

### Arabic

```tsx
<NasaqProvider locale="ar"><StoreCartPage lines={lines} currency="USD" /></NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| ArrowUp / ArrowDown | Change the quantity by one. |
| Home / End | Smallest and largest quantity. |
| Escape | Close the drawer; focus returns to the cart button. |
| Shift+F10 or Menu | Open the actions of a line. |

- The drawer is a dialog. Cart changes are read out through a polite live region ("Added Linen shirt, quantity 2").
- Stock warnings are text with an icon, never colour alone. Removing a line offers Undo.

## RTL & i18n

Built-in English and Arabic (with Arabic plurals) and a `labels` prop. Prices, quantities and SKUs stay left to right.

## Styling & tokens

Card, surface, border and status tokens; logical classes only. Target the `data-slot` values above.

## Do / Don't

- Do re-check stock and prices on your server at checkout.
- Do keep the cart in `onChange` storage so it survives a reload.
- Don't send prices in major units; use minor units.

## Related

- `store-checkout`, `loyalty-promo`, `price`, `product-card`

## Lab

Storybook: Components / Commerce / Store Cart, and Pages / Store / Cart.
