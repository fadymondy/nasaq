---
name: idle-lock
title: IdleLock
category: auth
status: beta
summary: "Locks the app after a period of inactivity: a Still there countdown dialog first, then your LockScreen over the inert app."
exports: [IdleLockLabels, IdleLockReason, UseIdleLockOptions, IdleLockControls, useIdleLock, IdleWarningDialogProps, IdleWarningDialog, IdleLockContext, IdleLockProps, IdleLock]
related: [lock-screen, session-expired, alert-dialog]
story: components-auth-pages-idle-lock
base-ui: [alert-dialog]
keywords: [idle, timeout, auto lock, inactivity, session, warning, countdown, lock screen]
---

# IdleLock

Wraps the app so it locks itself after inactivity. Ten seconds of warning is not enough for a person who stepped away,
so the "Still there?" dialog counts down first and only its buttons answer it. Then your `LockScreen` covers the app,
which stays mounted but `inert` and hidden from assistive tech. The timer is a courtesy: expire the session on the server too.

## When to use

- An app with sensitive data on shared or unattended screens.
- A "Lock" menu item (controlled `locked`).

## When not to use

- A session that already ended: use [`session-expired`](../session-expired/README.md).
- Pages that must not lock, such as a live call: set `disabled`.

## Import

```tsx
import { IdleLock, LockScreen } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { IdleLock, LockScreen } from "@fadymondy/nasaq/web";

export function Shell({ children, user }: { children: React.ReactNode; user: { name: string } }) {
  return (
    <IdleLock
      timeoutSeconds={600}
      warningSeconds={30}
      lockScreen={({ unlock }) => <LockScreen user={user} methods={["password"]} onUnlock={async (attempt) => (await verify(attempt)) ? unlock() : { error: "Wrong password." }} />}
    >
      {children}
    </IdleLock>
  );
}

declare function verify(attempt: unknown): Promise<boolean>;
```

## Anatomy

```
IdleLock                     data-slot="idle-lock"
├─ app                       data-slot="idle-lock-app"  (inert while locked)
├─ IdleWarningDialog         data-slot="idle-warning"   role="timer"
└─ lock overlay              data-slot="idle-lock-screen"
```

## API

**IdleLock**: `div` props plus `children`, `lockScreen` (a node, or `({ unlock }) => node`), `timeoutSeconds` (300),
`warningSeconds` (30, `0` for none), `locked` / `defaultLocked` / `onLockedChange(locked, reason)`, `disabled`, `unmountWhenLocked`, `labels`.

**useIdleLock**: `{ timeoutSeconds, warningSeconds, disabled, onIdle }` returns `{ phase, secondsLeft, stayActive, reset }`.
Build your own UI on it. It re-checks when the tab becomes visible, so a sleeping laptop locks on wake.

**IdleWarningDialog**: `open`, `secondsLeft`, `warningSeconds`, `onStay`, `onLockNow`, `labels`.

## Examples

**A manual lock button**

```tsx
import { Button, IdleLock } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function App() {
  const [locked, setLocked] = useState(false);
  return (
    <IdleLock locked={locked} onLockedChange={setLocked} lockScreen={<p>Locked</p>}>
      <Button onClick={() => setLocked(true)}>Lock</Button>
    </IdleLock>
  );
}
```

## Accessibility

- The countdown is a `role="timer"`, announced every ten seconds and in the last five, not every tick.
- The warning is an alert dialog with focus on "Stay signed in". Input during the warning does not cancel it.
- The locked app is `inert` and `aria-hidden`, so focus and screen readers cannot reach it.

## RTL & i18n

- English and Arabic built in; pass `labels`. The countdown is always left to right with Latin digits.

## Styling & tokens

- Tokens only. The overlay is `z-[60]`, above dialogs.

## Do / Don't

- Do end the session on the server as well.
- Do use `unmountWhenLocked` when the page content is confidential.
- Don't set a warning longer than the timeout (it is clamped).

## Related

- [`lock-screen`](../lock-screen/README.md)
- [`session-expired`](../session-expired/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-pages-idle-lock--docs
