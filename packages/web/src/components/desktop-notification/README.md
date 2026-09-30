---
name: desktop-notification
title: DesktopNotification
category: feedback
status: beta
summary: Notification cards drawn like macOS and Windows system alerts for Electron apps and previews, a corner stack with auto dismiss, and the notification permission flow with a soft ask, waiting, granted and blocked steps.
exports: [DesktopNotificationLabels, DesktopPlatform, DesktopNotificationAction, DesktopNotificationProps, DesktopNotification, DesktopNotificationEntry, DesktopNotificationStackProps, DesktopNotificationStack, DesktopPermission, DesktopPermissionStep, permissionStep, useNotificationPermission, NotificationPermissionPromptProps, NotificationPermissionPrompt]
related: [toast, notification-item, notification-center]
story: components-feedback-desktop-notification
base-ui: []
keywords: [desktop notification, electron, macos, windows, system notification, permission, push, native, toast]
---

# DesktopNotification

A card that looks like the notification your operating system shows. Use it in an Electron app's settings screen ("this
is what alerts look like"), in an onboarding tour, or in a web preview of a desktop app. It draws the card. It does
not raise a real system notification: for that call `new Notification()` in the renderer or `Notification` in the
Electron main process. `NotificationPermissionPrompt` and `useNotificationPermission` handle the permission part.

## When to use

- Previewing or documenting what a desktop alert will look like.
- Asking for notification permission politely before the system dialog.

## When not to use

- Alerts inside the page: use [`Toast`](../toast/README.md).
- A history of past alerts: use [`NotificationCenter`](../notification-center/README.md).

## Import

```tsx
import { DesktopNotification } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DesktopNotification } from "@fadymondy/nasaq/web";

export const Preview = () => (
  <DesktopNotification
    platform="windows"
    appName="Nasaq"
    title="Deploy finished"
    body="Production is on v1.4.2."
    actions={[{ id: "open", label: "Open" }]}
    onAction={(id) => console.log(id)}
    onClose={() => {}}
  />
);
```

## Anatomy

```
DesktopNotification              data-slot="desktop-notification" (data-platform), role="alert"
├─ app tile                      your icon, or the first letter of appName
├─ text button                   title and body (macOS: title first. Windows: app name, then title)
├─ time                          "now" or a localised time
├─ close                         macOS: on hover or focus, at the leading corner. Windows: always, with an options button
├─ image                         optional picture
└─ actions                       secondary buttons

DesktopNotificationStack         corner, top on macOS and bottom on Windows, inline-end side
NotificationPermissionPrompt     data-slot="desktop-notification-permission" (data-step)
```

## API

**DesktopNotification**: every `div` prop except `title`, `children` and `onClick`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `platform` | `"macos" \| "windows"` | `"macos"` | Which look to draw. |
| `appName` | `string` | required | Sender, and the tile letter without `appIcon`. |
| `appIcon` | `ReactNode` | letter tile | Your own app icon. |
| `title` / `body` | `ReactNode` | | Text, three lines at most for the body. |
| `image` | `ReactNode` | | Picture, on the trailing side (mac) or under the text (Windows). |
| `time` | `number \| Date \| string` | "now" | When it arrived. |
| `actions` / `onAction` | `{ id, label }[]` / `(id) => void` | | Buttons. |
| `onActivate` / `onClose` | `() => void` | | Body click, close button, or `dismissAfter`. |
| `dismissAfter` | `number` | `0` | Milliseconds until it closes itself. Hover and focus pause it. |
| `labels` | `Partial<DesktopNotificationLabels>` | | Override any string. |

**DesktopNotificationStack**: `items: DesktopNotificationEntry[]` (each has an `id` plus card props), `platform`, `onClose(id)`, `onAction(id, action)`, `onActivate(id)`, `max` (3), `placement` (`"absolute"` or `"fixed"`).

**NotificationPermissionPrompt**: `permission` (`"default" | "granted" | "denied" | "unsupported"`), `onRequest`, `onDismiss`, `onTest`, `onOpenSettings`, `labels`.

**useNotificationPermission()**: `{ permission, request }`, reading `Notification.permission`. `permissionStep(permission, asking)` is the pure step function.

## Examples

**Ask first, then send**

```tsx
import { NotificationPermissionPrompt, useNotificationPermission } from "@fadymondy/nasaq/web";

export function EnableAlerts() {
  const { permission, request } = useNotificationPermission();
  return (
    <NotificationPermissionPrompt
      permission={permission}
      onRequest={request}
      onTest={() => new Notification("Nasaq", { body: "It works." })}
    />
  );
}
```

## Accessibility

- Each card is `role="alert"`, so a new one is announced. Buttons have names, and the close button is reachable by keyboard even when it is hidden until hover.
- `dismissAfter` pauses on hover and on focus, so a keyboard user is not raced. Do not use it for alerts that need an answer.
- The permission steps are announced through a polite live region. State is text, never only an icon.

## RTL & i18n

- English and Arabic follow the Nasaq locale. The stack sits on the left in Arabic and the macOS close button moves to the right corner. Titles and bodies use `dir="auto"`.
- No operating system logos are drawn, on purpose. The tile is your app icon.

## Styling & tokens

- Uses `bg-popover`, `bg-card`, `border-border`, `shadow-floating`. The macOS blur needs the card to sit over something.
- Target `[data-slot="desktop-notification"]`, `[data-slot="desktop-notification-stack"]`.

## Do / Don't

- Do ask with `NotificationPermissionPrompt` after the user did something that makes alerts useful, not on first load.
- Do keep titles short: real systems cut them off.
- Don't rely on this card to deliver alerts. It only draws them.
- Don't ask again after `denied`: show how to unblock instead.

## Related

- [`Toast`](../toast/README.md)
- [`NotificationItem`](../notification-item/README.md)
- [`NotificationCenter`](../notification-center/README.md)
