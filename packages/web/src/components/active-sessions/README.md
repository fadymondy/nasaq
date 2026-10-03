---
name: active-sessions
title: ActiveSessions
category: security
status: beta
summary: The devices signed in to an account, with device type, IP, place and last activity, the current device first, and sign out per device or for every other device behind a confirmation.
exports: [ActiveSessions, ActiveSessionsProps, ActiveSession, SessionDeviceKind, ActiveSessionsLabels]
related: [passkey-list, two-factor-setup, account-settings, alert-dialog]
story: components-security-active-sessions
base-ui: [alert-dialog, button]
keywords: [sessions, devices, sign out, logout, revoke, security, account, signed in]
---

# ActiveSessions

The "where you're signed in" list of an account's security page. It only draws the list; `onRevoke` and
`onRevokeOthers` call your API.

## When to use

- The security page, next to [`PasskeyList`](../passkey-list/README.md) and [`TwoFactorSetup`](../two-factor-setup/README.md).
- An admin view of one user's sessions.

## When not to use

- API tokens or connected apps: those are not device sessions.

## Import

```tsx
import { ActiveSessions } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ActiveSessions, type ActiveSession } from "@fadymondy/nasaq/web";

declare const sessions: ActiveSession[];
declare const api: { revoke(id: string): Promise<void>; revokeOthers(): Promise<void> };

export function Sessions() {
  return <ActiveSessions sessions={sessions} onRevoke={api.revoke} onRevokeOthers={api.revokeOthers} />;
}
```

## Anatomy

```
ActiveSessions                    data-slot="active-sessions"
├─ Card header                    title, description, "Sign out other devices"
├─ Alert                          an error from a revoke
└─ ul  aria-label
   └─ li                          data-slot="active-session"
      ├─ device icon              desktop, mobile, tablet, other
      ├─ device · "This device" badge
      ├─ IP · place · Active <relative time>
      └─ Sign out                 ConfirmButton (not on the current device)
```

With only the current session, an empty state says no other device is signed in.

## API

**ActiveSessions**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sessions` | `readonly ActiveSession[]` | required | Order does not matter; the current one is shown first. |
| `onRevoke` | `(id) => Promise<void \| { error? }>` | | Shows "Sign out" on other devices. Return `{ error }` to show it. |
| `onRevokeOthers` | `() => Promise<void \| { error? }>` | | Shows "Sign out other devices" when there are others. |
| `labels` | `Partial<ActiveSessionsLabels>` | | Override any string. |

**ActiveSession**: `{ id, device?, kind?: "desktop" | "mobile" | "tablet" | "other", ip?, location?, lastActiveAt, createdAt?, current? }`. Dates are `Date`, number or ISO string.

## Accessibility

- The list is a labelled `ul`; each sign-out button names the device.
- Sign-out opens an `AlertDialog`; focus starts on Cancel.
- Times are `<time>` elements with the full date in a `title`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale; dates use the locale with Latin digits. IPs stay left to right.

## Styling & tokens

- `Card`, `Badge`, `Alert`, `Button` and `--nq-*` tokens. Target `[data-slot="active-session"]`.

## Do / Don't

- Do mark the current session on the server, not by guessing in the browser.
- Do end the session on the server before resolving `onRevoke`.
- Don't show the full user agent; a short "Chrome on macOS" reads better.

## Related

- [`PasskeyList`](../passkey-list/README.md)
- [`TwoFactorSetup`](../two-factor-setup/README.md)
- [`AccountSettings`](../account-settings/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-security-active-sessions--docs
