---
name: extension-popup
title: ExtensionPopup
category: platforms
status: beta
summary: Browser extension surfaces, a popup with connect and pair, mini status cards, a pause switch and quick actions, plus an options page with a save bar.
exports: [ExtensionPopupLabels, ExtensionStatus, isServerAddress, ExtensionPopupProps, ExtensionPopup, ExtensionConnectValues, ExtensionConnectProps, ExtensionConnect, ExtensionMiniCardProps, ExtensionMiniCard, ExtensionQuickAction, ExtensionQuickActionsProps, ExtensionQuickActions, ExtensionOptionsSection, ExtensionOptionsPageProps, ExtensionOptionsPage, ExtensionOptionRowProps, ExtensionOptionRow]
related: [switch, field, button, badge, glance-surfaces]
story: components-apps-platforms-pages-extension-popup
base-ui: [switch]
keywords: [extension, popup, browser, chrome, connect, pair, options, quick actions, pause]
---

# ExtensionPopup

The small surfaces of a browser extension. `ExtensionPopup` is the 360px popup frame with a brand, a connection
badge, a pause switch and a footer. `ExtensionConnect` signs in to a server or pairs with a code. Inside the popup
use `ExtensionMiniCard` and `ExtensionQuickActions`. `ExtensionOptionsPage` and `ExtensionOptionRow` build the
options page with a save bar.

## When to use

- The popup, sign-in and options page of a browser extension.
- Any compact companion window that shows a few live numbers and actions.

## When not to use

- A tray or menu-bar popover: use `TrayPopover` in [glance-surfaces](../glance-surfaces/README.md).

## Import

```tsx
import { ExtensionConnect, ExtensionMiniCard, ExtensionPopup } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ExtensionMiniCard, ExtensionPopup } from "@fadymondy/nasaq/web";

export function Popup() {
  return (
    <ExtensionPopup brand="Nasaq" status="connected" paused={false} onPausedChange={() => {}}>
      <ExtensionMiniCard title="Today" value="12" hint="tasks" />
    </ExtensionPopup>
  );
}
```

## Anatomy

```
ExtensionPopup                  data-slot="extension-popup"
├─ header                       brand, status Badge
├─ pause row                    Switch
├─ children                     mini cards, quick actions
└─ footer                       version, options link
ExtensionConnect                server address or pairing code form
ExtensionOptionsPage            sections of ExtensionOptionRow and a save bar
```

## API

### `ExtensionPopup`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand?` | `ReactNode` | none | Logo and name. |
| `status?` | `"connected" \| "disconnected" \| "error"` | `"connected"` | Badge state. |
| `paused?` / `onPausedChange?` | `boolean` / `(paused) => void` | none | Shows the pause switch when given. |
| `onOpenOptions?` | `() => void` | none | Options link in the footer. |
| `footer?` | `ReactNode` | none | Replaces the footer. |
| `labels?` | `ExtensionPopupLabels` | built-in en/ar | String overrides. |

### `ExtensionConnect`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mode?` | `"server" \| "pair"` | `"server"` | Address form or pairing code. |
| `defaultServer?` | `string` | `""` | Starting address. |
| `onConnect` | `(values) => Promise<void \| { error?: string }>` | required | Return an error string to show it. |

`isServerAddress(value)` is the validator the form uses.

### Other parts

`ExtensionMiniCard` (title, icon, status, value, hint), `ExtensionQuickActions` (actions, columns),
`ExtensionOptionsPage` (title, description, brand, sections, onSave, dirty), `ExtensionOptionRow` (label,
description, control).

## Examples

Pair mode asks for a code; the story shows the failing path when the address contains "fail".

## Accessibility

Errors are announced in a live region, the pause switch is labelled, and quick actions are buttons.

## RTL & i18n

Logical spacing throughout. Server addresses and codes are set `ltr`. Strings via `useOptionalNasaq()`.

## Styling & tokens

Only `--nq-*` tokens. The popup width is 360px; override with `className`.

## Do / Don't

- Do return `{ error }` from `onConnect` instead of throwing.
- Don't put more than four quick actions in the popup.

## Related

[`Switch`](../switch/README.md), [`Field`](../field/README.md), [glance-surfaces](../glance-surfaces/README.md).

## Lab

`Pages / App / Extension Popup` in the lab: Default, Arabic, Mobile.
