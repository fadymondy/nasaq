---
name: two-factor-challenge
title: TwoFactorChallenge
category: auth
status: beta
summary: "Second-factor step at sign-in: authenticator code or recovery code, trust this device, and a passkey alternative; en and ar built in."
exports: [TwoFactorChallenge, TwoFactorMethod, TwoFactorValues, TwoFactorChallengeLabels, TwoFactorChallengeProps]
related: [login-form, verify-otp-form, otp-input, auth-layout]
story: components-auth-two-factor-challenge
base-ui: [field, input, checkbox]
keywords: [two factor, 2fa, mfa, totp, authenticator, recovery code, passkey, trust device, auth]
---

# TwoFactorChallenge

The step after a correct password. It asks for the code from an authenticator app, and lets the person switch to a
recovery code or, when you provide `onPasskey`, to a passkey. "Trust this device" is a checkbox.

## When to use

- After `LoginForm` when the account has two-factor enabled.

## When not to use

- Emailed or texted codes: use `VerifyOtpForm`.
- Enrolling in 2FA: use a setup flow.

## Import

```tsx
import { TwoFactorChallenge } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TwoFactorChallenge } from "@fadymondy/nasaq/web";

export function Challenge() {
  return (
    <TwoFactorChallenge
      onSubmit={async ({ code, method, trustDevice }) => {
        const ok = await api.second(code, method, trustDevice);
        if (!ok) return { error: "That code is not right, or it expired." };
      }}
    />
  );
}

declare const api: { second(c: string, m: string, t: boolean): Promise<boolean> };
```

## Anatomy

```
TwoFactorChallenge               data-slot="two-factor-challenge" (form, noValidate)
├─ description                   depends on method
├─ error summary                 role="alert"
├─ OtpInput (totp) | Input (recovery)
├─ trust device checkbox
├─ submit Button
├─ "Use a recovery code" / "Use authenticator code" toggle
├─ "Use a passkey instead"       (with onPasskey and WebAuthn)
└─ footer slot
```

## API

**TwoFactorChallenge**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: TwoFactorValues) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | `TwoFactorValues` is `{ code, method, trustDevice }`. |
| `onPasskey` | `() => void \| Promise<unknown>` | | Shows the passkey alternative when supported. |
| `defaultMethod` | `"totp" \| "recovery"` | `"totp"` | Starting method. |
| `showTrustDevice` | `boolean` | `true` | Show the checkbox. |
| `length` | `number` | `6` | Authenticator code length. |
| `footer` | `ReactNode` | | Slot under the actions. |
| `labels` | `Partial<TwoFactorChallengeLabels>` | English or Arabic | Every string. |

## Examples

**Start on a recovery code, no trust box**

```tsx
import { TwoFactorChallenge } from "@fadymondy/nasaq/web";

export function Recovery() {
  return <TwoFactorChallenge defaultMethod="recovery" showTrustDevice={false} onSubmit={async () => {}} />;
}
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- The authenticator boxes carry `autocomplete="one-time-code"`; the recovery field is a text input with
  `autocomplete="off"`, no autocapitalise and no spellcheck.
- Switching method moves focus to the new field and clears any error.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- Codes are entered left to right in both directions.

## Styling & tokens

- Built from `OtpInput`, `Input`, `Checkbox`, `Button` and `Alert`; tokens only.

## Do / Don't

- Do offer the recovery-code route.
- Do rate-limit attempts on the server.
- Don't tell people which factor failed beyond "wrong or expired".
- Don't trust a device without the checkbox.

## Related

- [`login-form`](../login-form/README.md)
- [`verify-otp-form`](../verify-otp-form/README.md)
- [`otp-input`](../otp-input/README.md)
- [`auth-layout`](../auth-layout/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-auth-two-factor-challenge--docs
