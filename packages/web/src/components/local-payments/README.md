---
name: local-payments
title: Local Payments
category: commerce
status: beta
summary: Manual payment methods such as InstaPay, mobile wallets and bank transfer with copy-ready details, a receipt upload and a verification state.
exports: [LocalPaymentsLabels, LocalPaymentKind, LocalPaymentDetail, LocalPaymentMethod, LocalPaymentSubmission, PaymentVerificationStatusProps, PaymentVerificationStatus, LocalPaymentInput, LocalPaymentsProps, LocalPayments, PaymentSubmission, PaymentVerificationQueueProps, PaymentVerificationQueue, isFinalVerification]
related: [checkout-steps, wallet, file-upload, qr-code, price]
story: components-commerce-local-payments
base-ui: [dialog, radio-group]
keywords: [payment, instapay, vodafone cash, bank transfer, receipt, verification, manual, egypt]
---

# Local Payments

For markets where people pay by transfer, not by card: choose a method, see where to send the money with copy buttons and an optional
QR, add the transfer reference and a receipt, then follow verification. A second component is the reviewer's queue. Names are shown
as text. Nasaq ships no provider logos, so pass an official `mark` if you hold a licence; never redraw or recolour one.

## When to use

- InstaPay, mobile wallets, bank transfer or cash deposit that a person confirms by hand.

## When not to use

- Card payment with instant confirmation: use `CheckoutSteps`.
- A prepaid balance: use `Wallet`.

## Import

```tsx
import { LocalPayments, PaymentVerificationQueue, PaymentVerificationStatus } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<LocalPayments
  amount={1_250_000}
  currency="EGP"
  methods={[{ id: "instapay", name: "InstaPay", kind: "instant-transfer", details: [{ label: "Payment address", value: "shop@instapay" }] }]}
  submission={submission}
  onSubmit={async (input) => api.submitReceipt(input)}
/>
```

## Anatomy

```
LocalPayments                  data-slot="local-payments"
  method list                  one choice per method, with its fee
  instructions                 steps, details with copy buttons, totals, QR
  reference and receipt        Input and file upload
  PaymentVerificationStatus    after sending
PaymentVerificationQueue       data-slot="payment-verification-queue"  DataTable, Verify, Reject with a reason
```

## API

Read the exported prop types in `local-payments.tsx` for the exact fields. In short:

- `LocalPayments`: `amount` and `currency` (minor units), `methods`, optional `submission`, `defaultMethodId`, `onCancel`, `receiptRequired`, `maxReceiptSize`, `labels`; `onSubmit(input)` receives the method id, normalised reference, receipt file, amount, fee and total. Resolve `{ error }` to show it.
- `LocalPaymentMethod`: `id`, `name`, `kind`, optional `mark` (a licensed logo), `description`, `details`, `steps`, `qr`, `fee` (percent in basis points plus fixed), `min`, `max`.
- `PaymentVerificationStatus`: `status` (`unpaid`, `submitted`, `verifying`, `verified`, `rejected`), optional `methodName`, `reference`, `submittedAt`, `rejectionReason`, `onResubmit`.
- `PaymentVerificationQueue`: `submissions`, `onVerify`, `onReject(submission, reason)`, `loading`, `labels`. Row actions also open on context-click. Reject needs a reason, which the customer sees.

Pure helpers: `paymentFee`, `paymentTotal`, `paymentLimit`, `normalizeReference`, `referenceProblem`, `verificationStep`, `canSubmitReceipt`, `isFinalVerification`. The percentage fee rounds half up.

## Examples

### With a licensed mark

```tsx
{ id: "instapay", name: "InstaPay", mark: <img src="/logos/instapay.svg" alt="" height={20} />, kind: "instant-transfer", details }
```

### Rejected receipt

```tsx
<LocalPayments amount={5000} currency="EGP" methods={methods} onSubmit={send}
  submission={{ methodId: "instapay", reference: "IP-1", status: "rejected", rejectionReason: "Amount differs." }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through methods, copy buttons, fields and the submit button. |
| Arrow keys | Change the method. |
| Enter | Submit. |

- Verification stages are an ordered list with the current step marked.
- Errors use `role="alert"`; copy buttons name the value they copy.

## RTL & i18n

Built-in English and Arabic, and a `labels` prop to override. Account numbers, IBANs, references and amounts stay left to right inside Arabic text.

## Styling & tokens

Card, surface, border and status tokens only. Target `[data-slot="local-payments"]` and extend with `className`. No raw hex.

## Do / Don't

- Do verify the amount and reference against the bank on your server.
- Do show the fee before the customer pays.
- Don't invent a logo: show the name.

## Related

- `checkout-steps`, `wallet`, `file-upload`

## Lab

Storybook: Components / Commerce / Local Payments.
