---
name: install-button
title: InstallButton
category: actions
status: beta
summary: The install call to action for an app; controlled through four states, with built-in English and Arabic labels, and a quiet "Open" once installed.
exports: [InstallButton, InstallState, InstallButtonProps]
related: [button, product-card, plan-card, price]
story: components-actions-install-button
base-ui: []
keywords: [install, get, open, update, app, store, cta, button]
---

# InstallButton

A button that tracks an app through its lifecycle in a workspace: `available`, `installing`, `installed`, `update`.
It is controlled: your code owns `state` and moves it forward. Once installed it becomes a quiet "Open" button, so
an app the user already owns does not compete with apps still to install. It is built on
[`Button`](../button/README.md).

## When to use

- The install, get, open or update action on a store card, listing or app detail page.

## When not to use

- Any other action: use [`Button`](../button/README.md).
- Subscribing to a plan: use the call to action in [`PlanCard`](../plan-card/README.md).
- Long-running work outside install: use `Button` with `loading`.

## Import

```tsx
import { InstallButton, type InstallButtonProps, type InstallState } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { InstallButton, type InstallState } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function InstallZekra() {
  const [state, setState] = useState<InstallState>("available");

  function install() {
    setState("installing");
    setTimeout(() => setState("installed"), 1500);
  }

  return <InstallButton appName="Zekra" state={state} onInstall={install} onOpen={() => {}} />;
}
```

## Anatomy

```
InstallButton           data-slot="install-button", data-state="<state>"   <Button>
├─ spinner              while state="installing" (Button loading)
├─ check icon           only when installed, aria-hidden
└─ label                Install | Get | Update | Open
```

## API

### `InstallButton`

`InstallButtonProps extends Omit<ButtonProps, "children" | "onClick" | "loading">`. Other `Button` props (such as
`disabled`, `className`, `type`) are forwarded.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `appName` | `string` | required | The app's name, appended to the accessible name: "Install Mahaam". |
| `state?` | `InstallState` | `"available"` | Where the app is in its lifecycle for this workspace. |
| `free?` | `boolean` | `false` | Free apps say "Get" instead of "Install". |
| `onInstall?` | `() => void` | none | Called on click when state is `available` or `installing`. |
| `onOpen?` | `() => void` | none | Called on click when state is `installed`. |
| `onUpdate?` | `() => void` | none | Called on click when state is `update`. |
| `labels?` | `Partial<{ install: string; get: string; open: string; update: string }>` | built-in | Override the English or Arabic labels. |
| `variant?` | `ButtonProps["variant"]` | `"secondary"` | Button variant. Ignored when installed (always `"ghost"`). |
| `size?` | `ButtonProps["size"]` | `"sm"` | Button size. |

### `InstallState`

`"available" | "installing" | "installed" | "update"`

| State | Renders | Click calls |
| --- | --- | --- |
| `available` | "Install" (or "Get" when `free`) | `onInstall` |
| `installing` | Spinner, disabled, `aria-busy` | none (disabled) |
| `installed` | Ghost "Open" with a check icon | `onOpen` |
| `update` | "Update" | `onUpdate` |

## Examples

### Free app

```tsx
import { InstallButton } from "@fadymondy/nasaq/web";

export function GetApp() {
  return <InstallButton appName="Moharrik" free onInstall={() => {}} />;
}
```

### Arabic with a custom label

```tsx
import { InstallButton, NasaqProvider } from "@fadymondy/nasaq/web";

export function ArabicInstall() {
  return (
    <NasaqProvider locale="ar" dir="rtl">
      <InstallButton appName="حسبة" state="available" onInstall={() => {}} />
      <InstallButton appName="حسبة" state="update" labels={{ update: "تحديث متاح" }} onUpdate={() => {}} />
    </NasaqProvider>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` / `Space` | Activates the current action |
| `Tab` | Moves focus to and from the button |

- It is a native button. The accessible name is `"<label> <appName>"` ("Install Zekra"), so several install
  buttons on one page are distinguishable.
- While installing the button is disabled with `aria-busy`, but stays focusable so focus is not lost.
- The check icon is `aria-hidden`.
- Localise `appName`; the labels are built in for English and Arabic.

## RTL & i18n

- Built-in labels in English and Arabic (`تثبيت`, `احصل عليه`, `فتح`, `تحديث`), chosen by the provider locale
  (English without a provider). Override any with `labels`.
- Spinner and check icon sit on the inline start through the button's flex layout, so they mirror in RTL.

## Styling & tokens

- Inherits `Button` styling. The check icon uses `text-nq-success-text`.
- Target with `[data-slot=install-button]` or `[data-state=installed]`.
- Extend with `className`. Pass `variant="primary"` for the single main action on a page.

## Do / Don't

- **Do** own `state` in your code and move it as the install progresses.
- **Do** pass `appName` so the button has a distinct accessible name.
- **Do** use `free` for apps that cost nothing.
- **Don't** make an installed app's button loud; it stays a quiet "Open".
- **Don't** use more than one `primary` install button in a view.

## Related

- [Button](../button/README.md) · [ProductCard](../product-card/README.md) · [PlanCard](../plan-card/README.md) · [Price](../price/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-actions-install-button--docs
