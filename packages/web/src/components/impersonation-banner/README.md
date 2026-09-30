---
name: impersonation-banner
title: ImpersonationBanner
category: account
status: beta
summary: A sticky bar that says you are viewing as another user, or previewing, with an exit button. It is a status region, pinned so it cannot scroll away, and AdminArea uses it.
exports: [ImpersonationBanner, ImpersonationBannerProps, ImpersonationBannerLabels]
related: [admin-area, admin-users, alert]
story: components-account-impersonation-banner
base-ui: []
keywords: [impersonation, impersonate, view as, preview, support, admin, sticky, banner, exit]
---

# ImpersonationBanner

The bar that keeps an admin honest while they use the product as someone else, and that tells a person
previewing a role that nothing is saved. Show it on every screen for as long as the session lasts.

## When to use

- An admin or support agent acts as a customer (`mode="impersonate"`).
- A designer or owner previews the app as another role or plan (`mode="preview"`).

## When not to use

- A general notice: use `Alert`.
- Switching your own account: use `UserMenu`.

## Import

```tsx
import { ImpersonationBanner } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
{session.impersonating ? (
  <ImpersonationBanner as={{ name: "Omar Khalid", email: "omar@example.com" }} startedAt={session.startedAt} onExit={endImpersonation} />
) : null}
```

## Anatomy

```
ImpersonationBanner    data-slot="impersonation-banner", data-mode, role="status"
├─ icon                shield (impersonate) or eye (preview)
├─ message             "You are viewing the app as {name}" + email + hint + "Since 5 minutes ago"
└─ Button              exit, with a loading state
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `as` | `{ name, email? }` | required | Whose view this is. |
| `mode` | `"impersonate" \| "preview"` | `"impersonate"` | Warning colour with "actions count as this user", or info colour with "nothing is saved". |
| `startedAt` | `string \| number \| Date` | none | Shows "Since 5 minutes ago". |
| `onExit` | `() => void \| Promise<void>` | required | Ends the session. A rejection keeps the bar and shows a failure. |
| `sticky` | `boolean` | `true` | Pin to the top of the scroll container. |
| `hint` | `ReactNode` | by mode | Replaces the second sentence. |
| `labels` | `ImpersonationBannerLabels` | en / ar | Every string; `impersonating` and `previewing` are functions of the name. |

## Examples

- **Preview**: `mode="preview" as={{ name: "Viewer role" }}`.
- **Inside AdminArea**: pass `impersonating` and `onStopImpersonating`; the frame renders this component.

## Accessibility

A `role="status"` region announces when it appears. The exit button is a real button with a loading state; a
failed exit is announced with `role="alert"`. The tone is never the only cue: each mode has its own icon and text.

## RTL & i18n

Built-in English and Arabic. The email stays left-to-right inside an Arabic sentence; the time uses `DateTime`.

## Styling & tokens

`bg-nq-warning-soft` / `text-nq-warning-text` for impersonation, `bg-nq-info-soft` / `text-nq-info-text` for preview.

## Do / Don't

- Do render it above every screen while the session lasts.
- Do not let the exit button be hidden behind a menu.

## Related

- [AdminArea](../admin-area/README.md)
- [AdminUsers](../admin-users/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-impersonation-banner--docs
