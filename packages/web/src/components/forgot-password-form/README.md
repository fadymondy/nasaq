---
name: forgot-password-form
title: ForgotPasswordForm
category: auth
status: beta
summary: "Request a password reset link by email, then a Check your inbox state with a resend countdown and a change-email link; en and ar built in."
exports: [ForgotPasswordForm, ForgotPasswordValues, ForgotPasswordFormLabels, ForgotPasswordFormProps]
related: [auth-layout, login-form, reset-password-form, verify-otp-form]
story: components-auth-forgot-password-form
base-ui: [field, input, form]
keywords: [forgot password, reset, recovery, email link, resend, auth]
---

# ForgotPasswordForm

A single email field. After `onSubmit` resolves it swaps to a confirmation: "Check your inbox", the address, a
"Resend email" button that waits out a countdown, and a link to use a different address.

## When to use

- The first step of password recovery.

## When not to use

- Setting the new password: use `ResetPasswordForm`.
- One-time codes: use `VerifyOtpForm`.

## Import

```tsx
import { ForgotPasswordForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ForgotPasswordForm } from "@fadymondy/nasaq/web";

export function Forgot() {
  return <ForgotPasswordForm onSubmit={async ({ email }) => { await api.sendReset(email); }} />;
}

declare const api: { sendReset(email: string): Promise<void> };
```

## Anatomy

```
ForgotPasswordForm               data-slot="forgot-password-form"
├─ request state                 form, noValidate
│  ├─ error summary              role="alert"
│  ├─ Field: email               autocomplete="email"
│  └─ submit Button
└─ sent state                    heading is focused
   ├─ "Check your inbox" + address
   ├─ Resend button              disabled during the countdown
   └─ "Use a different email"
```

## API

**ForgotPasswordForm**: every `div` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: { email }) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | Resolve with nothing to show the sent state. |
| `onResend` | `(values: { email }) => Promise<AuthSubmitResult> \| AuthSubmitResult` | `onSubmit` | Called by "Resend email". |
| `resendSeconds` | `number` | `30` | Wait before the first and each further resend. |
| `defaultEmail` | `string` | | Prefill. |
| `labels` | `Partial<ForgotPasswordFormLabels>` | English or Arabic | `sentBody` uses `{email}`, `resendIn` uses `{time}`. |

Tip: respond the same whether or not the account exists, so the form does not leak who is registered.

## Examples

**Shorter cooldown**

```tsx
import { ForgotPasswordForm } from "@fadymondy/nasaq/web";

export function Quick() {
  return <ForgotPasswordForm resendSeconds={10} onSubmit={async () => {}} />;
}
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- When the sent state appears its heading takes focus and is announced; the resend countdown is a live region
  updated once a second only for the visible text, and the button is disabled (not hidden) while waiting.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- The confirmed address is shown `dir="ltr"` inside the Arabic sentence so it does not reorder.

## Styling & tokens

- Built from `Field`, `Input`, `Button` and `Alert`; tokens only.

## Do / Don't

- Do give the same answer for unknown emails.
- Do keep the resend cooldown.
- Don't tell people whether an account exists.
- Don't auto-resend.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`login-form`](../login-form/README.md)
- [`reset-password-form`](../reset-password-form/README.md)
- [`verify-otp-form`](../verify-otp-form/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-forgot-password-form--docs
