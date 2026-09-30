---
name: register-form
title: RegisterForm
category: auth
status: beta
summary: "Presentational sign-up form with name, email, password with strength meter, confirmation, terms consent and provider buttons; en and ar built in."
exports: [RegisterForm, RegisterValues, RegisterFormLabels, RegisterFormProps]
related: [auth-layout, oauth-buttons, login-form, verify-otp-form, password-input]
story: components-auth-register-form
base-ui: [field, input, checkbox, form]
keywords: [register, sign up, create account, password strength, terms, auth, form]
---

# RegisterForm

A sign-up form that owns no auth logic. It checks required fields, email shape, minimum password length, matching
confirmation and the terms box, then calls `onSubmit(values)`. Provider buttons sit on top with a divider.

## When to use

- The create-account screen, inside `AuthLayout`.

## When not to use

- Inviting a team member: use an invite form.
- Confirming the email afterwards: use `VerifyOtpForm`.

## Import

```tsx
import { RegisterForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { RegisterForm } from "@fadymondy/nasaq/web";

export function SignUp() {
  return (
    <RegisterForm
      terms={<>I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a></>}
      onSubmit={async (values) => {
        const res = await api.register(values);
        if (res.taken) return { fieldErrors: { email: "This email is already registered." } };
      }}
    />
  );
}

declare const api: { register(v: unknown): Promise<{ taken: boolean }> };
```

## Anatomy

```
RegisterForm                     data-slot="register-form" (form, noValidate)
├─ OAuthButtons + divider        (optional, on top)
├─ error summary                 role="alert"
├─ Field: name                   autocomplete="name"
├─ Field: email                  autocomplete="email"
├─ Field: password               autocomplete="new-password", strength meter, hint
├─ Field: confirm                autocomplete="new-password"
├─ terms checkbox
└─ submit Button
```

## API

**RegisterForm**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: RegisterValues) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | `RegisterValues` is `{ name, email, password, acceptTerms }`. |
| `minPasswordLength` | `number` | `8` | Checked before `onSubmit`. |
| `requireTerms` | `boolean` | `true` | Require the terms checkbox. |
| `terms` | `ReactNode` | `labels.terms` | The terms sentence, with links. |
| `oauthProviders` | `OAuthProvider[]` | | Show provider buttons. |
| `onOAuth` | `(id: string) => void \| Promise<unknown>` | | Provider click handler. |
| `labels` | `Partial<RegisterFormLabels>` | English or Arabic | Every string. `passwordHint` uses `{min}`. |

`fieldErrors` keys: `name`, `email`, `password`, `confirm`, `terms`.

## Examples

**Terms optional, longer passwords**

```tsx
import { RegisterForm } from "@fadymondy/nasaq/web";

export function Strict() {
  return <RegisterForm requireTerms={false} minPasswordLength={12} onSubmit={async () => {}} />;
}
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- Autocomplete: `name`, `email`, and `new-password` on both password fields so managers offer to generate one.
- The strength meter is `role="meter"` with a live level word; it is a hint, not a policy. Enforce rules on the server.
- The terms checkbox is a real checkbox with its sentence as the label; links inside the sentence stay focusable.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- The email keeps left-to-right entry. The name field follows the page direction so Arabic names type naturally.

## Styling & tokens

- Built from `Field`, `Input`, `PasswordInput`, `Checkbox`, `Button` and `OAuthButtons`; tokens only.

## Do / Don't

- Do link the terms and privacy policy through the `terms` prop.
- Do map server conflicts to `fieldErrors`.
- Don't rely on the client strength meter for policy.
- Don't ask for more than you need at sign-up.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`oauth-buttons`](../oauth-buttons/README.md)
- [`login-form`](../login-form/README.md)
- [`verify-otp-form`](../verify-otp-form/README.md)
- [`password-input`](../password-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-register-form--docs
