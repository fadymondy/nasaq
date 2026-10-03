---
name: verify-otp-form
title: VerifyOtpForm
category: auth
status: beta
summary: "Verify an emailed or texted one-time code with auto-submit on the last digit, wrong-code clear and refocus, a masked destination and a resend countdown."
exports: [VerifyOtpForm, maskDestination, VerifyOtpValues, VerifyOtpFormLabels, VerifyOtpFormProps]
related: [otp-input, auth-layout, register-form, two-factor-challenge]
story: components-auth-verify-otp-form
base-ui: [field, input]
keywords: [otp, verify, verification code, email code, sms code, one-time code, auth]
---

# VerifyOtpForm

A code entry screen body: a sentence naming where the code went (masked), six boxes, a submit button and a resend
button with a countdown. It submits on the last digit or on paste; a wrong code clears the boxes and refocuses the
first one.

## When to use

- Confirming an email or phone number after sign-up.
- Passwordless email or SMS codes.

## When not to use

- Authenticator app or recovery code at sign-in: use `TwoFactorChallenge`.
- Setting up two-factor: use a setup flow.

## Import

```tsx
import { VerifyOtpForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { VerifyOtpForm } from "@fadymondy/nasaq/web";

export function Verify() {
  return (
    <VerifyOtpForm
      destination="fady@example.com"
      onSubmit={async ({ code }) => {
        const ok = await api.verify(code);
        if (!ok) return { error: "That code is not right." };
      }}
      onResend={() => api.resend()}
    />
  );
}

declare const api: { verify(c: string): Promise<boolean>; resend(): Promise<void> };
```

## Anatomy

```
VerifyOtpForm                    data-slot="verify-otp-form" (form, noValidate)
├─ description                   "We sent a 6-digit code to f***y@example.com"
├─ error summary                 role="alert"
├─ OtpInput                      autocomplete="one-time-code", dir="ltr"
├─ submit Button
├─ resend row                    "Resend in 0:27" then a button
└─ footer slot
```

## API

**maskDestination(destination: string, channel?: "email" | "sms"): string**: masks the middle of an address or number
for display (`f***y@example.com`, `+966••••••67`).

**VerifyOtpForm**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `destination` | `string` | required | Where the code went. Masked before display. |
| `channel` | `"email" \| "sms"` | `"email"` | Chooses the sentence. |
| `length` | `number` | `6` | Code length. |
| `onSubmit` | `(values: { code }) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | Return `{ error }` for a wrong code. |
| `onResend` | `() => Promise<AuthSubmitResult> \| AuthSubmitResult` | | Omit to hide resend. |
| `resendSeconds` | `number` | `30` | Wait before each resend. |
| `autoSubmit` | `boolean` | `true` | Submit on the last digit. |
| `footer` | `ReactNode` | | Slot under the form. |
| `labels` | `Partial<VerifyOtpFormLabels>` | English or Arabic | Uses `{length}`, `{destination}`, `{index}`, `{time}`. |

## Examples

**SMS with manual submit**

```tsx
import { VerifyOtpForm } from "@fadymondy/nasaq/web";

export function Sms() {
  return <VerifyOtpForm destination="+966501234567" channel="sms" length={4} autoSubmit={false} onSubmit={async () => {}} />;
}
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- The boxes are one `role="group"` with a name; each box is labelled "Digit 3 of 6" and has
  `autocomplete="one-time-code"`, so iOS and Android offer the code from the message.
- After a wrong code the boxes clear and focus returns to the first, and the error is announced.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- The boxes always run left to right (a code is a number), even in Arabic pages. The destination is isolated so it does not reorder.

## Styling & tokens

- Built from `OtpInput`, `Button` and `Alert`; tokens only.

## Do / Don't

- Do let people paste the whole code.
- Do rate-limit attempts and resends on the server.
- Don't reveal the full address or number.
- Don't hide resend behind support.

## Related

- [`otp-input`](../otp-input/README.md)
- [`auth-layout`](../auth-layout/README.md)
- [`register-form`](../register-form/README.md)
- [`two-factor-challenge`](../two-factor-challenge/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-auth-verify-otp-form--docs
