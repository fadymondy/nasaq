---
name: checkout-steps
title: CheckoutSteps
category: store
status: beta
summary: A five-step subscription checkout (plan, billing details, payment method, review, success) with a presentational card form, order summary and Intl money.
exports: [CheckoutLabels, CheckoutInterval, CheckoutStep, PaymentMethodKind, CheckoutPlan, CheckoutBilling, CheckoutCountry, CheckoutPaymentSummary, CheckoutOrder, CheckoutResult, planTotal, PaymentFormValue, emptyPaymentForm, PaymentFormErrors, validatePaymentForm, PaymentMethodFormProps, PaymentMethodForm, CheckoutStepsProps, CheckoutSteps]
related: [plan-card, price, stepper, invoice-view, wallet]
story: components-storefront-checkoutsteps
base-ui: [radio-group, select, checkbox, field]
keywords: [checkout, subscription, billing, payment, card, plan, stepper, vat, order]
---

# CheckoutSteps

A guided subscription checkout: pick a plan and billing interval, enter billing details, choose a payment method,
review the order, then see a confirmation. It validates each step before moving on, keeps the running total in an
order summary and calls one async `onComplete` with the finished order. The card fields are presentational: the
card number and CVC never leave the form, and `onComplete` only receives the brand, last four digits and holder.

## When to use

- Starting or changing a paid subscription.
- Any multi-step purchase where the plan, address and payment method are collected in order.

## When not to use

- Only showing plans to compare: use [`PlanGrid` / `PlanCard`](../plan-card/README.md).
- Adding funds to a balance: use [`Wallet`](../wallet/README.md).
- A single payment form on its own: use `PaymentMethodForm` from this folder.

## Import

```tsx
import { CheckoutSteps, type CheckoutOrder, type CheckoutPlan } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CheckoutSteps, type CheckoutPlan } from "@fadymondy/nasaq/web";

const plans: CheckoutPlan[] = [
  { id: "starter", name: "Starter", monthlyPrice: 19, yearlyPrice: 190, features: ["3 projects"] },
  { id: "team", name: "Team", monthlyPrice: 49, yearlyPrice: 490, badge: "Most popular", highlighted: true },
];

export function Checkout() {
  return (
    <CheckoutSteps
      plans={plans}
      currency="USD"
      taxRate={0.15}
      taxLabel="VAT"
      onComplete={async (order) => {
        await fetch("/api/subscribe", { method: "POST", body: JSON.stringify(order) });
        return { reference: "SUB-1042" };
      }}
    />
  );
}
```

## Anatomy

```
CheckoutSteps                data-slot="checkout-steps"
├─ Stepper                   plan · billing · payment · review (all complete on success)
├─ step panel                heading (focused on step change)
│  ├─ plan                   PlanGrid + monthly/yearly ToggleGroup
│  ├─ billing                Field grid with country Select
│  ├─ payment                PaymentMethodForm (card or bank transfer)
│  ├─ review                 summary, terms Checkbox, Confirm button
│  └─ success                confirmation with reference
└─ order summary aside       plan, interval, subtotal, tax, total
```

## API

### `CheckoutSteps`

`CheckoutStepsProps extends Omit<ComponentProps<"div">, "onError">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `plans` | `readonly CheckoutPlan[]` | required | Plans on offer. |
| `currency?` | `string` | `"USD"` | ISO 4217 code for every amount. |
| `taxRate?` | `number` | `0` | Fraction of the subtotal; `0` hides the tax line. |
| `taxLabel?` | `string` | `"Tax"` / `"الضريبة"` | Name of the tax. |
| `defaultPlanId?` | `string` | first plan | Preselected plan. |
| `defaultInterval?` | `CheckoutInterval` | `"month"` | Preselected interval. |
| `defaultBilling?` | `Partial<CheckoutBilling>` | none | Prefilled billing details. |
| `countries?` | `readonly CheckoutCountry[]` | short built-in list | Country select options. |
| `paymentMethods?` | `readonly PaymentMethodKind[]` | card and bank | Methods offered. |
| `bankDetails?` | `ReactNode` | none | Shown under the bank transfer choice. |
| `defaultStep?` | `Exclude<CheckoutStep, "success">` | `"plan"` | Starting step. |
| `onStepChange?` | `(step: CheckoutStep) => void` | none | Fires on every step change. |
| `onComplete` | `(order: CheckoutOrder) => Promise<void \| CheckoutResult>` | required | Confirms the order. Resolve to finish, or resolve `{ error }` / reject to stay on review. |
| `onDone?` | `() => void` | none | The button on the success step. Omitted: hidden. |
| `labels?` | `CheckoutLabels` | built-in en/ar | Partial string overrides. |

### Types

`CheckoutStep = "plan" | "billing" | "payment" | "review" | "success"`, `CheckoutInterval = "month" | "year"`,
`PaymentMethodKind = "card" | "bank"`. `CheckoutPlan` has `id`, `name`, `description?`, `monthlyPrice`, `yearlyPrice?`
(default `monthlyPrice * 12`), `features?`, `badge?`, `highlighted?`. `CheckoutBilling` has `name`, `email`, `company`,
`taxId`, `country`, `address`, `city`, `postalCode`. `CheckoutOrder` has `planId`, `interval`, `billing`, `payment`
(`CheckoutPaymentSummary`: `method`, `brand?`, `last4?`, `holder?`, `expiry?`), `currency`, `subtotal`, `tax`, `total`.
`CheckoutResult` is `{ error?, reference? }`. `CheckoutLabels` is `Partial<Strings>`.

### `PaymentMethodForm`

`PaymentMethodFormProps extends Omit<ComponentProps<"div">, "onChange">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `PaymentFormValue` | required | `method`, `number`, `holder`, `expiry`, `cvc`. |
| `onChange` | `(value: PaymentFormValue) => void` | required | Called with the next value. |
| `errors?` | `PaymentFormErrors` | none | Per-field messages, usually from `validatePaymentForm`. |
| `methods?` | `readonly PaymentMethodKind[]` | both | Methods offered. |
| `bankDetails?` | `ReactNode` | none | Shown under the bank transfer choice. |
| `disabled?` | `boolean` | `false` | Disables every field. |
| `labels?` | `CheckoutLabels` | built-in | String overrides. |

### Helpers

| Export | Signature | Description |
| --- | --- | --- |
| `planTotal` | `(plan: CheckoutPlan, interval: CheckoutInterval) => number` | The plan price before tax for the interval. |
| `emptyPaymentForm` | `PaymentFormValue` | A blank card form value. |
| `validatePaymentForm` | `(value: PaymentFormValue, t, now?: Date) => PaymentFormErrors` | Luhn, expiry and CVC checks with the strings `required`, `invalidCard`, `invalidExpiry`, `invalidCvc`; empty object when valid or when the method is bank. |

## Examples

### Yearly by default, with bank details

```tsx
import { CheckoutSteps } from "@fadymondy/nasaq/web";

<CheckoutSteps
  plans={plans}
  defaultInterval="year"
  bankDetails={<p>IBAN SA00 0000 0000 0000 0000 0000</p>}
  onComplete={async () => undefined}
/>;
```

### Show a gateway error

```tsx
<CheckoutSteps
  plans={plans}
  onComplete={async () => ({ error: "Your bank declined the payment." })}
/>
```

### Arabic copy with Saudi VAT

```tsx
<NasaqProvider locale="ar">
  <CheckoutSteps plans={plans} currency="SAR" taxRate={0.15} taxLabel="ضريبة القيمة المضافة" onComplete={async () => undefined} />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab / Shift+Tab | Move between fields and buttons. |
| Arrow keys | Move within the plan cards, interval toggle and payment method choice. |
| Enter | Submit the current step. |

- Focus moves to the step heading on each step change.
- The Stepper is a labelled list; on small screens the titles are read but hidden, with a "Step n of 4" caption.
- Errors use `FieldError` bound to the field and are announced; the confirm button shows a busy state with a status message.
- Localise `labels` for any custom copy.

## RTL & i18n

Built-in English and Arabic. Amounts use `Intl` with the `currency` prop, in Latin digits like [`Num`](../numeric/README.md),
and are isolated left to right. Card numbers, expiry, CVC and tax ids stay left to right inside Arabic text. Arabic-Indic
digits typed into the card number are read correctly. Card brands are shown as text, not logos.

## Styling & tokens

Uses `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground` and the action tokens through the components it
composes. Target `[data-slot="checkout-steps"]`; extend with `className`. Do not use raw hex.

## Do / Don't

- Do send the order to your server over HTTPS and tokenise the card with your gateway's own fields.
- Do not collect real card data with this form in production; it is presentational.
- Do not show card brand logos unless you have the official asset.

## Related

- [`plan-card`](../plan-card/README.md)
- [`price`](../price/README.md)
- [`stepper`](../stepper/README.md)
- [`invoice-view`](../invoice-view/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-storefront-checkoutsteps--docs
