---
name: reset-password-form
title: ResetPasswordForm
category: auth
status: beta
summary: "Choose a new password with a confirmation field and strength meter; en and ar built in, errors linked, focus on the first invalid field."
exports: [ResetPasswordForm, ResetPasswordValues, ResetPasswordFormLabels, ResetPasswordFormProps]
related: [auth-layout, forgot-password-form, login-form, password-input]
story: components-auth-reset-password-form
base-ui: [field, input, form]
keywords: [reset password, new password, recovery, strength, auth]
---

# ResetPasswordForm

Two password fields: new and confirm. It checks length and match, then calls `onSubmit({ password })`. An expired or
used link is best reported as `{ error }`.

## When to use

- The page a reset email links to.

## When not to use

- Changing a password while signed in: use a change-password form that asks for the current one.

## Import

```tsx
import { ResetPasswordForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ResetPasswordForm } from "@fadymondy/nasaq/web";

export function Reset({ token }: { token: string }) {
  return (
    <ResetPasswordForm
      onSubmit={async ({ password }) => {
        const res = await api.reset(token, password);
        if (res.expired) return { error: "This link has expired. Request a new one." };
      }}
    />
  );
}

declare const api: { reset(token: string, password: string): Promise<{ expired: boolean }> };
```

## Anatomy

```
ResetPasswordForm                data-slot="reset-password-form" (form, noValidate)
├─ error summary                 role="alert"
├─ Field: password               autocomplete="new-password", strength meter, hint
├─ Field: confirm                autocomplete="new-password"
└─ submit Button
```

## API

**ResetPasswordForm**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: { password }) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | Return `{ error }` for an expired link. |
| `minPasswordLength` | `number` | `8` | Checked before `onSubmit`. |
| `labels` | `Partial<ResetPasswordFormLabels>` | English or Arabic | `passwordHint` uses `{min}`. |

`fieldErrors` keys: `password`, `confirm`.

## Examples

**Longer minimum**

```tsx
import { ResetPasswordForm } from "@fadymondy/nasaq/web";

export function Strict() {
  return <ResetPasswordForm minPasswordLength={12} onSubmit={async () => {}} />;
}
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- Both fields use `autocomplete="new-password"`; the strength meter is `role="meter"` with a live level word.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.


## Styling & tokens

- Built from `Field`, `PasswordInput`, `Button` and `Alert`; tokens only.

## Do / Don't

- Do sign the person in or send them to sign-in on success.
- Do invalidate the link once used.
- Don't echo the password back.
- Don't skip the confirmation field.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`forgot-password-form`](../forgot-password-form/README.md)
- [`login-form`](../login-form/README.md)
- [`password-input`](../password-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-reset-password-form--docs
