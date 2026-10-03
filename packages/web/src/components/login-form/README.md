---
name: login-form
title: LoginForm
category: auth
status: beta
summary: "Presentational sign-in form with email and password, magic link, remember me, provider buttons, passkey and a dev-only shortcut, built-in en and ar strings, linked errors and focus on the first invalid field."
exports: [LoginForm, LoginValues, LoginMethod, LoginFormLabels, LoginFormProps]
related: [auth-layout, sign-in-flow, oauth-buttons, register-form, forgot-password-form, two-factor-challenge, password-input]
story: components-auth-login-form
base-ui: [field, input, checkbox, form]
keywords: [login, sign in, email, password, passkey, magic link, passwordless, dev login, blocked, remember me, auth, form]
---

# LoginForm

A sign-in form that owns no auth logic. It validates the two fields, calls your `onSubmit(values)`, and shows what
you return: nothing for success, or `{ error, fieldErrors }` for a failure. Provider, passkey, magic-link and dev
buttons are optional and hidden unless you supply their handlers. `methods` picks password, magic link or both; an
empty list shows "Sign-in is not available" instead of the form.

## When to use

- The sign-in screen, inside `AuthLayout`.

## When not to use

- Second factor: use `TwoFactorChallenge`.
- Creating an account: use `RegisterForm`.
- Different methods per address (SSO domains, passwordless accounts): use `SignInFlow`, which asks for the email first.

## Import

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";

export function SignIn() {
  return (
    <LoginForm
      forgotPassword={<a href="/forgot-password">Forgot password?</a>}
      onSubmit={async ({ email, password }) => {
        const res = await api.signIn(email, password);
        if (!res.ok) return { error: "Incorrect email or password." };
      }}
    />
  );
}

declare const api: { signIn(email: string, password: string): Promise<{ ok: boolean }> };
```

## Anatomy

```
LoginForm                        data-slot="login-form" (form, noValidate), data-state="idle"
├─ error summary (when needed)   role="alert"
├─ Field: email                  autocomplete="username" (or "username webauthn", or "email" for magic link only)
├─ Field: password               autocomplete="current-password", forgotPassword slot beside the label
├─ remember me checkbox
├─ submit Button                 loading while onSubmit runs ("Email me a sign-in link" when magic link only)
├─ magic-link Button             data-slot="login-form-magic-link" (password and magic link both on)
├─ passkey button + OAuthButtons (optional, after an "or" divider)
└─ dev Button                    data-slot="login-form-dev", dashed (onDevLogin only)

data-state="sent"                after a link is sent: icon, heading (focused), body, resend (data-slot="login-form-resend"), change email
data-state="blocked"             methods={[]}: a warning Alert, and the dev button when set
```

## API

**LoginForm**: every `form` prop except `onSubmit` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(values: LoginValues) => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | `LoginValues` is `{ email, password, remember }`. Return `{ error?, fieldErrors? }` to fail. A throw shows `labels.failed`. |
| `defaultEmail` | `string` | | Prefill the email. |
| `forgotPassword` | `ReactNode` | | Slot beside the password label, usually a link. |
| `showRemember` | `boolean` | `true` | Show "Remember me". |
| `oauthProviders` | `OAuthProvider[]` | | Show provider buttons. |
| `onOAuth` | `(id: string) => void \| Promise<unknown>` | | Provider click handler. |
| `onPasskey` | `() => void \| Promise<unknown>` | | Shows "Sign in with a passkey" when the browser has WebAuthn. |
| `onPasskeyAutofill` | `(signal: AbortSignal) => void \| Promise<unknown>` | | Conditional UI: started on mount when supported, aborted on unmount. |
| `onMagicLink` | `({ email }) => Promise<AuthSubmitResult> \| AuthSubmitResult` | | Sends a one-time link. Adds "Email me a sign-in link", which checks the email only, then shows "Check your email" with a resend timer. |
| `magicLinkSeconds` | `number` | `30` | Seconds before the link can be sent again. |
| `methods` | `readonly LoginMethod[]` | password, plus `"magic-link"` when `onMagicLink` is set | `LoginMethod` is `"password" \| "magic-link"`. `["magic-link"]` drops the password field. `[]` shows the blocked notice. |
| `onDevLogin` | `() => Promise<AuthSubmitResult> \| AuthSubmitResult` | | A dashed "Dev login" button for local builds. `{ error }` or a throw (`labels.devFailed`) shows in the summary. Never pass it in production. |
| `labels` | `Partial<LoginFormLabels>` | English or Arabic | Every string, including validation messages. |

`fieldErrors` keys: `email`, `password`.

## Examples

**Field error from the server**

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";

export function Locked() {
  return <LoginForm onSubmit={async () => ({ fieldErrors: { email: "No account uses this email." } })} />;
}
```

**Password or magic link**

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";

export function SignIn() {
  return (
    <LoginForm
      onSubmit={async ({ email, password }) => api.signIn(email, password)}
      onMagicLink={async ({ email }) => api.sendLink(email)}
    />
  );
}

declare const api: { signIn(email: string, password: string): Promise<void>; sendLink(email: string): Promise<void> };
```

**Magic link only, with a dev shortcut in local builds**

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";

export function Passwordless() {
  return (
    <LoginForm
      methods={["magic-link"]}
      onSubmit={() => {}}
      onMagicLink={async ({ email }) => api.sendLink(email)}
      onDevLogin={import.meta.env.DEV ? () => api.devLogin() : undefined}
    />
  );
}

declare const api: { sendLink(email: string): Promise<void>; devLogin(): Promise<void> };
```

**Passkeys and providers**

```tsx
import { LoginForm } from "@fadymondy/nasaq/web";

export function Full() {
  return (
    <LoginForm
      oauthProviders={["google", "github"]}
      onOAuth={(id) => redirectTo(id)}
      onPasskey={() => signInWithPasskey()}
      onPasskeyAutofill={(signal) => signInWithPasskey(signal)}
      onSubmit={async () => {}}
    />
  );
}

declare function redirectTo(id: string): Promise<void>;
declare function signInWithPasskey(signal?: AbortSignal): Promise<void>;
```

## Accessibility

- The form is `noValidate` and validates itself, so messages are yours to localise and read in one place. Every field
  has a visible `<label>`; an invalid field gets `aria-invalid` and its message is linked with `aria-describedby`.
- On a failed submit focus moves to the first invalid field. When the failure is for the whole form (`error`) the
  summary at the top of the form (`role="alert"`) is focused instead, so it is announced.
- The submit button shows a spinner and is `aria-busy` while `onSubmit` runs; a second submit is ignored.
- Autocomplete: `username` on email (`username webauthn` when passkey autofill is on) and `current-password` on the
  password, so password managers and passkeys work.
- The passkey button is not rendered when `PublicKeyCredential` is missing, so nobody meets a dead control.
- After a magic link is sent the "Check your email" heading takes focus inside a `role="status"` region, so the change
  is announced. The resend button counts down and a polite status says when a new link went out.
- The blocked notice is an `Alert` with a title, so it reads as one message.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- The email is entered left to right (`dir="ltr"` on the input value) even in Arabic, as addresses are Latin.

## Styling & tokens

- Built from `Field`, `Input`, `PasswordInput`, `Checkbox`, `Button` and `Alert`; all colours are `--nq-*` tokens.
- Extend the form with `className`; it is a vertical flex stack.

## Do / Don't

- Do return `{ error }` for a wrong password rather than throwing.
- Do keep the error generic so it does not reveal which accounts exist. Say "Check your email" after a magic link
  even when no account uses the address.
- Do gate `onDevLogin` behind a development flag.
- Don't validate credentials on the client.
- Don't hide the forgot-password link.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`sign-in-flow`](../sign-in-flow/README.md)
- [`oauth-buttons`](../oauth-buttons/README.md)
- [`register-form`](../register-form/README.md)
- [`forgot-password-form`](../forgot-password-form/README.md)
- [`two-factor-challenge`](../two-factor-challenge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-login-form--docs
