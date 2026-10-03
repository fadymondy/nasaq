---
name: reset-password-form
title: ResetPasswordForm
category: auth
status: beta
summary: "Choose a new password with a confirmation field, strength meter and optional policy checklist, then a Password changed or Link expired screen; en and ar built in."
exports: [ResetPasswordForm, ResetPasswordValues, ResetPasswordFormLabels, ResetPasswordFormProps, ResetPasswordResult, ResetPasswordState, ResetPasswordTarget]
related: [auth-layout, forgot-password-form, login-form, password-input]
story: components-auth-reset-password-form
base-ui: [field, input, form]
keywords: [reset password, new password, recovery, strength, policy, expired link, auth]
---

# ResetPasswordForm

Two password fields: new and confirm. It checks length, match and (with `rules`) a policy, then calls
`onSubmit({ password })`. On success it swaps to a "Password changed" screen with a Sign in button. Return
`{ expired: true }` for a used or old link and it shows "This link has expired" with a Send a new link button.

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
      rules
      signIn="/login"
      requestLink="/forgot-password"
      onSubmit={async ({ password }) => {
        const res = await api.reset(token, password);
        if (res.expired) return { expired: true };
      }}
    />
  );
}

declare const api: { reset(token: string, password: string): Promise<{ expired: boolean }> };
```

## Anatomy

```
ResetPasswordForm                data-slot="reset-password-form", data-state="idle" | "success" | "expired"
├─ idle: form                    noValidate
│  ├─ error summary              role="alert"
│  ├─ Field: password            autocomplete="new-password", strength meter, hint or rule checklist
│  ├─ Field: confirm             autocomplete="new-password"
│  └─ submit Button
└─ success / expired
   ├─ icon                       success or warning soft circle
   ├─ role="status"              h2 (focused, tabIndex -1) + body
   └─ Button                     Sign in / Send a new link (a link when given a URL)
```

## API

**ResetPasswordForm**: every `div` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: { password }) => Promise<ResetPasswordResult> \| ResetPasswordResult` | required | Resolve nothing on success, `{ error, fieldErrors }` to stay on the form, or `{ expired: true }` for a dead link. |
| `minPasswordLength` | `number` | `8`, or 12 with `rules` | Checked before `onSubmit`. |
| `rules` | `boolean \| PasswordPolicy` | | Show the requirement checklist and require every rule. See [`password-input`](../password-input/README.md). |
| `defaultState` | `"idle" \| "success" \| "expired"` | `"idle"` | Start on a screen, e.g. `"expired"` when the token was checked on load. |
| `state` / `onStateChange` | `ResetPasswordState` | | Controlled screen. |
| `signIn` | `string \| () => void` | | The Sign in button on success: a URL renders a link. Hidden when omitted. |
| `requestLink` | `string \| () => void` | | The Send a new link button on an expired link. Hidden when omitted. |
| `labels` | `Partial<ResetPasswordFormLabels>` | English or Arabic | `passwordHint` uses `{min}`. |

`fieldErrors` keys: `password`, `confirm`.

## Examples

**Token checked on load**

```tsx
import { ResetPasswordForm } from "@fadymondy/nasaq/web";

export function Reset({ valid }: { valid: boolean }) {
  return <ResetPasswordForm defaultState={valid ? "idle" : "expired"} requestLink="/forgot-password" onSubmit={async () => {}} />;
}
```

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
- When the form swaps to the success or expired screen, focus moves to its heading, which sits in a `role="status"`
  region, so the outcome is announced and the next action is one Tab away.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.


## Styling & tokens

- Built from `Field`, `PasswordInput`, `Button` and `Alert`; tokens only. The success icon uses `bg-nq-success-soft`
  and the expired icon `bg-nq-warning-soft`.

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

https://docs.nasaqui.com/?path=/docs/components-auth-reset-password-form--docs
