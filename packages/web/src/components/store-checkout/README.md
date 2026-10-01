---
name: store-checkout
title: Store Checkout
category: store
status: beta
summary: One-page checkout for physical goods with contact, country-aware address, delivery, payment, summary sidebar and an order confirmation page.
exports: [StoreAddressFormProps, StoreAddressForm, StoreOrderSummaryProps, StoreOrderSummary, StoreCheckoutDraft, StorePlaceOrderResult, StoreCheckoutProps, StoreCheckout, StoreOrderConfirmationProps, StoreOrderConfirmation]
related: [store-cart, checkout-steps, local-payments, loyalty-promo, price]
story: components-storefront-store-checkout
base-ui: [radio-group, select, tabs, switch, checkbox]
keywords: [checkout, address, shipping method, payment, cash on delivery, wallet, order confirmation, ecommerce]
---

# Store Checkout

Checkout for physical goods on one page in four sections that open in turn: contact (guest or signed in), delivery address, shipping
method with arrival dates plus gift options and notes, and payment. The summary sits beside the form and folds behind a bar on phones.
Placing the order shows a loading state, a failure with retry, then the confirmation. Address rules per country and the checkout state
machine are pure modules with tests.

## When to use

- A storefront that ships parcels.

## When not to use

- Bookings, tickets or subscriptions: use `checkout-steps` or `booking`.

## Import

```tsx
import { StoreCheckout, StoreOrderConfirmation, StoreAddressForm } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StoreCheckout
  lines={cart.lines}
  currency="USD"
  shippingMethods={methods}
  savedAddresses={addresses}
  paymentPolicy={{ card: true, cod: { maxTotal: 500000, countries: ["EG"], fee: 2500 }, wallet: { balance } }}
  onPlaceOrder={async (draft) => api.placeOrder(draft)}
/>
```

## Anatomy

```
StoreCheckout           data-slot="store-checkout"           the page with its sections and place-order button
StoreAddressForm        data-slot="store-address-form"       fields that change with the country
StoreOrderSummary       data-slot="store-order-summary"      lines and totals, collapsible on mobile
StoreOrderConfirmation  data-slot="store-order-confirmation" the page after the order
```

## API

Read the exported prop types in `store-checkout.tsx`. In short:

- `StoreCheckout`: `lines`, `currency`, `shippingMethods`, `savedAddresses`, `countries`, `account` and `onSignIn`, `paymentPolicy`, `localMethods` with `onLocalSubmit`, `discount`, `taxBps`, `giftWrapFee`, `weekend`, `onPlaceOrder(draft)`, `onPlaced`, `labels`. `onPlaceOrder` resolves `{ orderNumber }`, or `{ error }` (or rejects) to show the failure and let the shopper retry. The draft carries the normalised data, totals and, for card, the card fields: send them to your payment provider and never log them.
- Card fields use the `PaymentMethodForm` of `checkout-steps`; manual methods use `LocalPayments`.
- Pure modules: `address-rules` (`validateStoreAddress`, `countryRule`, `normalizePostalCode`, `formatPhoneE164`) and `checkout-machine` (`checkoutReduce`, `validateSection`, `paymentAvailability`, `checkoutSummary`, `etaWindow`, `buildOrder`).

## Examples

### Arabic

```tsx
<NasaqProvider locale="ar"><StoreCheckout lines={lines} currency="USD" shippingMethods={methods} onPlaceOrder={place} /></NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through fields and sections. |
| Arrow keys | Move within a group of shipping or payment options. |
| Enter | Continue to the next section or place the order. |

- Each section is a labelled region; when one opens, focus moves to its heading. Errors sit next to their field and are linked to it.
- The summary toggle on small screens has `aria-expanded`. The confirmation heading takes focus on arrival.

## RTL & i18n

Built-in English and Arabic and a `labels` prop. Emails, phone numbers, postal codes, card numbers and order numbers stay left to right. Address previews join city, region and postal code with the Arabic comma in Arabic (`storeAddressLines(address, "، ")`). When the shopper is signed in, the contact tab reads "My account" (`accountTab`) instead of "Sign in".

## Styling & tokens

Card, surface, border and status tokens; logical classes only. Target the `data-slot` values above.

## Do / Don't

- Do validate the address and recompute totals on your server.
- Do never store card fields; pass them to the provider.
- Don't offer cash on delivery above your limit; the policy turns it off with a reason.

## Related

- `store-cart`, `checkout-steps`, `local-payments`

## Lab

Storybook: Components / Commerce / Store Checkout, Pages / Store / Checkout, Pages / Store / Order Placed.
