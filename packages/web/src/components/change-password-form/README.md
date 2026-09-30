---
name: change-password-form
title: ChangePasswordForm
category: account
status: beta
summary: Change-password form with current, new (strength meter) and confirm fields, an option to sign out other sessions, client checks, server field errors and a success message, driven by one async onSubmit.
exports: [ChangePasswordForm, ChangePasswordFormProps, ChangePasswordValues, ChangePasswordResult, ChangePasswordField, ChangePasswordLabels]
related: [password-input, field, alert, checkbox, two-factor-setup]
story: components-account-change-password-form
base-ui: [field, checkbox]
keywords: [password, change password, account, security, sign out other sessions, strength]
---

# ChangePasswordForm

The form for a signed-in person to change their password. It checks the obvious things on the client,
then calls your `onSubmit`. It does not talk to a server itself.

## When to use

- The security page of an account.

## When not to use

- Forgotten password: use the reset-password form; there is no current password to ask for.

## Import

```tsx
import { ChangePasswordForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ChangePasswordForm } from "@fadymondy/nasaq/web";

declare const api: { changePassword(v: { currentPassword: string; newPassword: string; signOutOthers: boolean }): Promise<{ ok: boolean }> };

export function Password() {
  return (
    <ChangePasswordForm
      onSubmit={async (values) => {
        const res = await api.changePassword(values);
        if (!res.ok) return { fieldErrors: { currentPassword: "That is not your current password." } };
      }}
    />
  );
}
```

## Anatomy

```
ChangePasswordForm                 data-slot="change-password-form" (form, noValidate)
├─ Alert                           success or server error
├─ Field  current password         autocomplete="current-password"
├─ Field  new password             autocomplete="new-password", PasswordInput with strength meter
├─ Field  confirm                  autocomplete="new-password"
├─ Checkbox  sign out other sessions
└─ Button  Change password         loading while pending
```

## API

**ChangePasswordForm**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: { currentPassword, newPassword, signOutOthers }) => Promise<void \| { error?, fieldErrors? }>` | required | Called when the client checks pass. Resolve for success. Return `error` for a form-level message and `fieldErrors` (`currentPassword`, `newPassword`, `confirmPassword`) for field messages. A throw shows a generic error. |
| `minLength` | `number` | `8` | Minimum length of the new password. |
| `showSignOutOthers` | `boolean` | `true` | Show the checkbox. |
| `defaultSignOutOthers` | `boolean` | `true` | Its initial state. |
| `labels` | `Partial<ChangePasswordLabels>` | | Override any string. |

Client checks: every field is required, the new password meets `minLength` and differs from the current
one, and the confirmation matches. On success the fields are cleared and a success alert shows.

## Examples

**Without the sign-out option**

```tsx
import { ChangePasswordForm } from "@fadymondy/nasaq/web";

export function Simple({ save }: { save: (v: { newPassword: string }) => Promise<void> }) {
  return <ChangePasswordForm showSignOutOthers={false} onSubmit={(v) => save(v)} />;
}
```

## Accessibility

- Each field has a visible label, and errors are attached with `FieldError` and the invalid border, never colour alone.
- `autocomplete` is `current-password` for the first field and `new-password` for the other two, so password managers fill and save correctly.
- Each password field has the show/hide toggle from `PasswordInput`.
- The form has `noValidate`: messages come from the component, in the page language.
- The success and error alerts are announced (`status` and `alert`).

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Pass `labels` for other languages.
- The toggles sit at the inline end. Use `ltr` inside a custom field if you need the typed value pinned left-to-right.

## Styling & tokens

- `Field`, `PasswordInput`, `Alert` and `--nq-*` tokens. Target `[data-slot="change-password-form"]`.

## Do / Don't

- Do enforce the password policy on the server; the meter is only a hint.
- Do offer to sign out other sessions, and end them on the server when it is checked.
- Don't reveal whether an account exists in a field error.

## Related

- [`PasswordInput`](../password-input/README.md)
- [`Field`](../field/README.md)
- [`TwoFactorSetup`](../two-factor-setup/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-change-password-form--docs
