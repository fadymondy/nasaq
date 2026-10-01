---
name: lock-screen
title: LockScreen
category: auth
status: beta
summary: "OS-style lock screen over a wallpaper with a clock. Unlock by PIN keypad, password with an optional authenticator code, or biometrics, with a lockout after wrong tries and a quiet-mode gate."
exports: [LockScreenLabels, LockUser, LockAttempt, LockReason, LockScreenProps, LockScreen]
related: [idle-lock, session-expired, two-factor-challenge, otp-input, password-input, login-form]
story: components-auth-pages-lock-screen
base-ui: [field, input]
keywords: [lock screen, pin, keypad, password, totp, biometric, idle, quiet mode, session lock]
---

# LockScreen

Covers the app when a session is locked or idle, or when quiet mode is on. It shows the clock, the person, and one way
to unlock at a time. It verifies nothing: `onUnlock` receives what was entered and the host decides.

## When to use

- Idle timeout or a manual "lock" in an app that stays signed in.
- Quiet mode: notifications stay paused until the person unlocks.

## When not to use

- Signing in from scratch: use `LoginForm`.
- Step-up for one action: use `TwoFactorChallenge` in a dialog.

## Import

```tsx
import { LockScreen } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LockScreen } from "@fadymondy/nasaq/web";

export function Locked() {
  return (
    <LockScreen
      user={{ name: "Nour Adel", email: "nour@example.com" }}
      methods={["pin", "password"]}
      onSignOut={() => api.signOut()}
      onUnlock={async ({ method, secret }) => {
        const ok = await api.unlock(method, secret);
        if (!ok) return { error: "That is not right. Try again." };
      }}
    />
  );
}

declare const api: { signOut(): void; unlock(m: string, s: string): Promise<boolean> };
```

## Anatomy

```
LockScreen                    data-slot="lock-screen"
├─ wallpaper + scrim
├─ clock and date             (showClock)
├─ mark, avatar, name, reason line
├─ PIN dots + keypad | password form (+ OtpInput) | biometric button
├─ method switcher
├─ lockout countdown          after maxAttempts wrong tries
└─ Not you? Sign out · footer
```

## API

`div` props (except `children`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `LockUser` | required | `name`, `email`, `avatar`. |
| `methods` | `("pin" \| "password" \| "biometric")[]` | `["pin"]` | Offered in this order. |
| `defaultMethod` | `LockMethod` | first of `methods` | |
| `pinLength` | `number` | `6` | PIN digits. |
| `requireCode` | `boolean` | `false` | Ask for an authenticator code with the password. |
| `reason` | `"locked" \| "idle" \| "quiet"` | `"locked"` | Changes the message. |
| `onUnlock` | `(attempt: LockAttempt) => AuthSubmitResult \| Promise` | required | `{ method, secret, code? }`. Return `{ error }` if wrong. |
| `onSignOut` | `() => void` | | Shows "Not you? Sign out". |
| `accounts` | `LockUser[]` | | Other accounts on this device. With `onSwitchAccount` adds a "Switch account" menu. |
| `onSwitchAccount` | `(account: LockUser | null) => void` | | Called with the chosen account, or `null` for "Sign in to another account". |
| `mark` | `ReactNode` | `ProductMark` | `null` hides it. |
| `wallpaper` | `ReactNode` | | Full-bleed backdrop under a scrim. |
| `showClock` / `now` | `boolean` / `Date \| number` | `true` / live | Freeze time for docs. |
| `maxAttempts` / `lockoutSeconds` | `number` | `5` / `30` | Client-side lockout; the server must enforce its own. |
| `footer` / `labels` | | | |

## Examples

**Password with an authenticator code, over an image**

```tsx
import { LockScreen } from "@fadymondy/nasaq/web";

export function Secure() {
  return (
    <LockScreen
      user={{ name: "Nour Adel" }}
      methods={["password"]}
      requireCode
      wallpaper={<img alt="" src="/wall.jpg" className="size-full object-cover" />}
      onUnlock={async () => {}}
    />
  );
}
```

## Accessibility

- The keypad is real buttons and the physical keyboard works too (digits, Backspace, Enter). PIN dots are `aria-hidden`; a status line says how many digits are entered.
- Wrong-secret errors are announced (`role="alert"`) and the lockout countdown is shown in text.
- The screen is a labelled landmark and moves focus to the active method when it opens.

## RTL & i18n

- English and Arabic are built in; pass `labels` to override. The clock uses `Intl` for the locale.
- The keypad is always 1-2-3 left to right, as on a phone. Logos and the avatar are never mirrored.

## Styling & tokens

- Built from `Button`, `Avatar`, `PasswordInput`, `OtpInput` and `ProductMark`; tokens only. The wallpaper is yours.

## Do / Don't

- Do verify on the server and rate-limit there. The client lockout is a courtesy.
- Do keep the message the same for a wrong PIN and a wrong code.
- Don't store the PIN in the client.
- Don't rely on the lock screen to hide data already in the DOM: unmount it if it is sensitive.

## Related

- [`two-factor-challenge`](../two-factor-challenge/README.md)
- [`otp-input`](../otp-input/README.md)
- [`password-input`](../password-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-pages-lock-screen--docs
