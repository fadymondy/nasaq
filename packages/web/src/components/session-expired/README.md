---
name: session-expired
title: SessionExpired
category: auth
status: beta
summary: "Re-authentication form for a session that ended: the same person, a password (and code) or a passkey away, with switch account and sign out."
exports: [SessionExpiredLabels, SessionExpiredReason, SessionExpiredValues, SessionExpiredProps, SessionExpired]
related: [lock-screen, idle-lock, auth-layout, login-form]
story: components-auth-pages-session-expired
base-ui: [field]
keywords: [session expired, re-authenticate, sign in again, revoked, password changed, passkey, timeout]
---

# SessionExpired

The form shown when a session ended: expired, revoked from another device, or the password changed. Who was signed in is
known, so only the secret is asked again. Put it in an `AuthLayout`. Use `LockScreen` when the session is still valid but locked.

## When to use

- A request came back 401 and the person must sign in again without losing their place.

## When not to use

- A locked but valid session: [`lock-screen`](../lock-screen/README.md).
- A first sign-in: [`login-form`](../login-form/README.md).

## Import

```tsx
import { AuthLayout, SessionExpired } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AuthLayout, SessionExpired } from "@fadymondy/nasaq/web";

export function Expired() {
  return (
    <AuthLayout title="Welcome back">
      <SessionExpired
        user={{ name: "Sara Nasser", email: "sara@example.com" }}
        keepsWork
        onSubmit={async ({ password }) => {
          const ok = await api.reauth(password);
          if (!ok) return { error: "Wrong password." };
        }}
        onSignOut={() => api.signOut()}
      />
    </AuthLayout>
  );
}

declare const api: { reauth(p: string): Promise<boolean>; signOut(): void };
```

## Anatomy

```
SessionExpired                data-slot="session-expired"  data-reason
├─ Alert (why)
├─ user row
├─ error summary
├─ password, optional code
├─ Sign in again · Use a passkey
└─ Use a different account · Sign out
```

## API

`form` props (except `onSubmit`, `children`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `LockUser` | required | Who was signed in. |
| `reason` | `expired`, `revoked`, `password-changed` | `expired` | Picks the message. |
| `requireCode` | `boolean` | `false` | Ask for a 6 digit authenticator code. |
| `onSubmit` | `(values) => AuthSubmitResult` | required | Resolve nothing on success, or `{ error }` / `{ fieldErrors }`. |
| `onPasskey` | `() => Promise` | | Shows the passkey button where WebAuthn works. |
| `onSwitchAccount`, `onSignOut` | `() => void` | | Show their link buttons. |
| `keepsWork` | `boolean` | `false` | Tells people their unsaved changes are safe. |
| `footer`, `labels` | | | |

## Examples

**With a code and passkey**

```tsx
import { SessionExpired } from "@fadymondy/nasaq/web";

export const Strict = () => <SessionExpired user={{ name: "Omar" }} reason="revoked" requireCode onPasskey={() => api.passkey()} onSubmit={async () => undefined} />;

declare const api: { passkey(): Promise<void> };
```

## Accessibility

- Errors are summarised and focus moves to the summary. The password field is auto focused.
- A hidden username lets password managers fill the right entry.
- The passkey button appears only when the browser supports it.

## RTL & i18n

- English and Arabic built in; pass `labels`. Emails stay left to right.

## Styling & tokens

- Tokens only. Reuses `Alert`, `PasswordInput`, `OtpInput`, `Button`.

## Do / Don't

- Do say why the session ended.
- Do keep the person's place: return them to the page after success.
- Don't ask for the email again.

## Related

- [`lock-screen`](../lock-screen/README.md)
- [`idle-lock`](../idle-lock/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-auth-pages-session-expired--docs
