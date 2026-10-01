---
name: install-prompt
title: InstallPrompt
category: platforms
status: beta
summary: A PWA install dialog with a hook for the browser's install event and an iPhone walkthrough, plus a per-device push opt-in that reuses the notification permission prompt and lists subscribed devices.
exports: [InstallPromptLabels, useInstallPrompt, InstallPromptProps, InstallPrompt, PushDevice, PushOptInProps, PushOptIn]
related: [desktop-notification, install-button, app-update, chrome-extension-install]
story: components-apps-platforms-install-prompt
base-ui: [dialog, switch]
keywords: [pwa, install, add to home screen, beforeinstallprompt, push, web push, notifications, opt in, devices, ios]
---

# InstallPrompt

Two pieces for a web app that wants to live on a device. `InstallPrompt` is the dialog that asks for the install and
`useInstallPrompt` reads the browser's state. `PushOptIn` is the per-device notification switch. It reuses the soft ask
from [`NotificationPermissionPrompt`](../desktop-notification/README.md) so people hear why before the browser asks,
and once allowed it shows one switch for this device and a list of the other subscribed devices.

## When to use

- After a useful moment (a second visit, a finished task), offer to install the app.
- In settings, let each device choose to receive push.

## When not to use

- A store-style Install button for an app in a catalogue: use [`InstallButton`](../install-button/README.md).
- Updating an already installed app: use [`AppUpdate`](../app-update/README.md).

## Import

```tsx
import { InstallPrompt, PushOptIn, useInstallPrompt } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { InstallPrompt, PushOptIn, useInstallPrompt, useNotificationPermission } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Onboarding() {
  const [open, setOpen] = useState(true);
  const { platform, install } = useInstallPrompt();
  const { permission, request } = useNotificationPermission();
  const [subscribed, setSubscribed] = useState(false);
  return (
    <>
      <InstallPrompt open={open} onOpenChange={setOpen} platform={platform} appName="Nasaq" onInstall={install} />
      <PushOptIn
        permission={permission}
        onRequestPermission={request}
        subscribed={subscribed}
        onSubscribedChange={async (on) => {
          await savePushSubscription(on);
          setSubscribed(on);
        }}
      />
    </>
  );
}
```

## Anatomy

```
InstallPrompt        data-slot="install-prompt" (data-platform), a Dialog
├─ icon + title      your icon, or the provider brand mark
├─ benefits          (prompt) three lines, or your own
├─ steps             (ios) Share, then Add to Home Screen
└─ Not now / Install

PushOptIn            data-slot="push-opt-in"
├─ NotificationPermissionPrompt   until the browser allows notifications
├─ this-device switch, test button
└─ devices list                   name, last seen, remove
```

## API

**useInstallPrompt()** returns `{ platform, install }`. `platform` is `"prompt" | "ios" | "installed" | "unsupported"`; `install()` opens the browser's dialog and resolves `"accepted" | "dismissed" | "unavailable"`. The pure `detectInstallPlatform(userAgent, standalone, hasPromptEvent)`, `nextAskAt(now, days)` and `shouldAsk(now, nextAsk)` are exported from `install-prompt-platform.ts`.

**InstallPrompt**: `open`, `onOpenChange`, `platform`, `appName`, `appIcon`, `benefits`, `onInstall`, `onDismiss`, `labels`.

**PushOptIn**: section props except `children`, plus `permission`, `onRequestPermission`, `subscribed`, `onSubscribedChange(on)`, `devices` (`PushDevice[]`: `id`, `name`, `kind`, `lastSeen`, `current`), `onRemoveDevice(id)`, `onTest`, `requiresInstall`, `onOpenSettings`, `labels`, `permissionLabels`. Async callbacks return `void` or `{ error }`.

## Examples

**Snooze "Not now" for two weeks**

```tsx
import { nextAskAt, shouldAsk } from "@fadymondy/nasaq/web";

const next = Number(localStorage.getItem("install-next-ask"));
if (shouldAsk(Date.now(), next || null)) setOpen(true);
// onDismiss: localStorage.setItem("install-next-ask", String(nextAskAt(Date.now())));
```

## Accessibility

- The dialog traps focus and closes with Escape. Steps are an ordered list; the switch is named and its state is announced.
- Install state is words, not colour alone.

## RTL & i18n

- English and Arabic follow the locale. Device names use `dir="auto"`. The Share icon is not mirrored: it is the system's own symbol.
- iPhone steps say Add to Home Screen: keep your own `labels` if the OS language differs from the page.

## Styling & tokens

- Uses `Dialog`, `Switch`, `Badge`, `Alert` and card tokens. Target `[data-slot="install-prompt"]`, `[data-slot="push-opt-in"]`.

## Do / Don't

- Do ask after a useful moment and remember "Not now".
- Do check `requiresInstall` on iPhone: push only works from the installed app.
- Don't open the browser's permission dialog on first load: use the soft ask.
- Don't show the install dialog when `platform` is `unsupported` unless you want the "use another browser" note.

## Related

- [`DesktopNotification`](../desktop-notification/README.md)
- [`InstallButton`](../install-button/README.md)
- [`AppUpdate`](../app-update/README.md)
