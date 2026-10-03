---
name: desktop-os-shell
title: DesktopShell
category: platforms
status: beta
summary: A desktop for the browser with a wallpaper, menu bar, dock, launchpad and a window manager that drags, resizes, snaps, maximises and minimises. Windows are plain data.
exports: [DesktopShellLabels, DesktopApp, DesktopMenuItem, DesktopMenu, DesktopAppIcon, DesktopMenuBarProps, DesktopMenuBar, DesktopDockProps, DesktopDock, DesktopLaunchpadProps, DesktopLaunchpad, DesktopShellProps, DesktopShell, DesktopShellApi]
related: [menubar, context-menu, command-palette, dialog, desktop-icons]
story: components-apps-platforms-pages-desktop-os-shell
base-ui: [menubar, context-menu]
keywords: [desktop, os, shell, dock, launchpad, window manager, menu bar, wallpaper, windows, snap, power, sleep, restart, shut down, log out, system menu]
---

# DesktopShell

A desktop metaphor for admin tools and demos. `DesktopShell` draws a wallpaper, a menu bar (built on
[`Menubar`](../menubar/README.md)), a dock and a launchpad, and manages floating windows. Apps are plain React
nodes and the window list is plain data (`DesktopWindowState[]`), controlled or not. `DesktopMenuBar`,
`DesktopDock` and `DesktopLaunchpad` are exported to build a different arrangement.

## When to use

- A multi-app workspace where users keep several tools open at once.
- A product demo or a kiosk that should feel like an operating system.

## When not to use

- A normal page layout: use the app shell and navigation components.
- One modal task: use [`Dialog`](../dialog/README.md).

## Import

```tsx
import { DesktopAppIcon, DesktopShell } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FolderIcon } from "lucide-react";
import { DesktopAppIcon, DesktopShell } from "@fadymondy/nasaq/web";

const apps = [
  { id: "files", title: "Files", icon: <DesktopAppIcon><FolderIcon /></DesktopAppIcon>, content: <p>Files</p>, single: true },
];

export function Desktop() {
  return <div className="h-dvh"><DesktopShell apps={apps} /></div>;
}
```

## Anatomy

```
DesktopShell                    data-slot="desktop-shell"
├─ wallpaper                    a node or a token gradient
├─ DesktopMenuBar               app name, menus, start and end slots
├─ windows                      title bar, 8 resize handles, snap preview
├─ children                     desktop content behind the windows
├─ DesktopDock                  app icons, running dot, context-click actions
└─ DesktopLaunchpad             icon grid with search
```

## API

### `DesktopShell`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `apps` | `DesktopApp[]` | required | Id, title, icon, content, size, single, pinned, keywords. |
| `windows?` / `defaultWindows?` | `DesktopWindowState[]` | `[]` | Controlled or starting window list, back to front. |
| `onWindowsChange?` | `(windows) => void` | none | Fires on every change. |
| `menus?` | `DesktopMenu[] \| (focused) => DesktopMenu[]` | none | Menus after the app name. |
| `wallpaper?` | `ReactNode` | token gradient | Any node. |
| `menuBarStart?` / `menuBarEnd?` | `ReactNode` | none | Logo, clock, battery. |
| `launchpadOpen?` / `onLaunchpadOpenChange?` | `boolean` / `(open) => void` | uncontrolled | Launchpad state. |
| `compactBelow?` | `number` | `640` | Container width under which windows go full size. |
| `children?` | `ReactNode \| ({ open }) => ReactNode` | none | Desktop content behind the windows. As a function it gets `open(appId)`, so a [`DesktopIconGrid`](../desktop-icons/README.md) can launch apps. |
| `labels?` | `DesktopShellLabels` | built-in en/ar | String overrides. |

The pure window functions (`openWindow`, `snapWindow`, `resizeRect` and more) live in `desktop-math.ts` and are
covered by node tests.

### System menu: `desktopPowerMenu`

A pure helper in `desktop-power-menu.ts` that builds the menu a desktop keeps at its leading corner. Pass it in
`menus`, usually first.

```tsx
const confirm = useConfirm(); // inside a <ConfirmProvider>
const system = desktopPowerMenu({
  appName: "ToGO",
  locale,
  onAbout, onSettings, onSleep, onRestart, onShutDown, onLogOut,
  confirm,
});

<DesktopShell apps={apps} menus={(focused) => [system, ...appMenus(focused)]} />;
```

| Option | Type | Notes |
| --- | --- | --- |
| `onAbout`, `onSettings`, `onSleep`, `onRestart`, `onShutDown`, `onLogOut` | `() => void` | Only the actions with a handler appear, in that order. |
| `appName?` | `string` | About reads "About {appName}". |
| `confirm?` | `(prompt) => boolean \| Promise<boolean>` | Asked before Restart, Shut Down and Log out; `false` cancels. The prompt has `title`, `description`, `confirmLabel` and `danger`, so `useConfirm()` fits as is. Sleep never asks. |
| `locale?` | `string` | Built-in English and Arabic strings. Default English. |
| `id?`, `label?` | `string` | Default `"system"` and "System". |
| `labels?` | `Partial<DesktopPowerMenuLabels>` | Item names and the confirm texts. |

Sleep, Restart and Shut Down start after a separator, and Log out starts its own group and is marked danger. Also
exported: `desktopPowerLabels`, `desktopPowerConfirm`, `DESKTOP_POWER_ACTIONS`, `DESKTOP_POWER_CONFIRMED`.

## Examples

Control the list to persist it: keep `windows` in state and save it in `onWindowsChange`.

## Accessibility

- The dock is a `nav`; icons are buttons with the app name, and a dot marks running apps.
- Window controls have labels; the title bar drags with the pointer and double-click maximises.
- The launchpad closes with Escape.

## RTL & i18n

Window `x` is measured from the inline start edge, so a saved layout mirrors in Arabic. Snap zones are "start"
and "end", not left and right. Strings come from `useOptionalNasaq()` with a `labels` override.

## Styling & tokens

Only `--nq-*` tokens. Override the wallpaper with the `wallpaper` prop.

## Do / Don't

- Do give each app a stable `id`.
- Do set `single` for apps that should have one window.
- Don't put a full page router inside a window without a fixed size.

## Related

[`Menubar`](../menubar/README.md), [`ContextMenu`](../context-menu/README.md), [`Dialog`](../dialog/README.md), [`DesktopIconGrid`](../desktop-icons/README.md).

## Lab

`Pages / App / Desktop OS Shell` in the lab: Default, Arabic, Mobile, Power Menu, Power Menu Arabic.
