---
name: desktop-icons
title: DesktopIconGrid
category: platforms
status: beta
summary: "Icons on a desktop surface. An auto grid, or free placement with drag and snap. Select, open, context menu and keyboard moves, with RTL built in."
exports: [DesktopIconsLabels, DesktopIconItem, DesktopIconPosition, DesktopIconOpenOn, DesktopIconProps, DesktopIcon, DesktopIconGridProps, DESKTOP_ICON_CELL, desktopIconSlot, DesktopIconGrid]
related: [desktop-os-shell, context-menu, desktop-locations]
story: components-apps-platforms-desktop-icons
base-ui: [context-menu]
keywords: [desktop, icons, shortcuts, drag, snap, grid, files, launcher, os]
---

# DesktopIconGrid

Shortcuts on a desktop: apps, files or folders, each an icon with a label. Without `onMove` the icons flow into a
grid. With `onMove` they can be dragged anywhere and snap to cells; you keep the positions.

## When to use

- The desktop area of a `DesktopShell`, or any web OS surface with launchable items.
- A "drop files here" desktop where people arrange their own items.

## When not to use

- A list of apps in a menu or a launcher: use `CommandPalette` or `Spotlight`.
- A file browser with columns and sorting: use a `DataTable`.

## Import

```tsx
import { DesktopIconGrid } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DesktopShell, DesktopIconGrid } from "@fadymondy/nasaq/web";

export function Desktop({ apps }: { apps: { id: string; title: string; icon: React.ReactNode }[] }) {
  return (
    <DesktopShell apps={apps}>
      {({ open }) => <DesktopIconGrid items={apps} onOpen={(item) => open(item.id)} />}
    </DesktopShell>
  );
}
```

## Anatomy

```
DesktopIconGrid            data-slot="desktop-icon-grid"  role="group"  data-free in free mode
└─ DesktopIcon             data-slot="desktop-icon"  <button aria-pressed>  (one per item)
   ├─ icon                 aria-hidden
   └─ label                two lines, then clamped
```

## API

`div` props plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `DesktopIconItem[]` | required | `{ id, title, icon }`. |
| `onOpen` | `(item) => void` | required | Double-click, Enter, or a tap on touch screens (`openOn="auto"`). |
| `openOn` | `"auto" \| "click" \| "double-click"` | `"auto"` | |
| `positions` / `onMove` | `Record<id, {x, y}>` / `(item, pos) => void` | | `onMove` turns on free placement. Icons without a position fill free cells. |
| `snap` | `boolean` | `true` | Snap dropped icons to cells (`DESKTOP_ICON_CELL`). |
| `hiddenIds` | `string[]` | | Items not shown. |
| `onRemove` | `(item) => void` | | Adds "Remove from desktop" to the context menu. |
| `actions` | `(item) => ContextMenuAction[]` | | More context-menu items, after Open. |
| `selected` / `defaultSelected` / `onSelectedChange` | `string \| null` | | |
| `labels` | `DesktopIconsLabels` | | |

`desktopIconSlot(index, height)` returns the `{x, y}` of a grid cell, for laying out saved positions.

## Accessibility

- The grid is a labelled `group` of buttons; each icon is named by its title and `aria-pressed` shows the selection. Arrow keys move, Enter or Space opens, Escape clears.
- The context menu opens from the keyboard too (Shift+F10 or the Menu key) and its actions are never the only way to do something.
- Dragging starts after 5px, so a click is never a drag. There is no drag-only action.

## RTL & i18n

- Arrow keys and free positions follow the reading direction: `x` is measured from the inline start.
- English and Arabic labels are built in.

## Styling & tokens

- Selection is a primary tint and ring; labels sit on a `bg-background/70` plate so they read on any wallpaper. No shadows.

## Do / Don't

- Do save `positions` per user, so the desktop looks the same next time.
- Don't put more than a few dozen icons on one desktop. Group them in a folder.

## Related

- [`desktop-os-shell`](../desktop-os-shell/README.md)
- [`context-menu`](../context-menu/README.md)
- [`desktop-locations`](../desktop-locations/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-apps-platforms-desktop-icons--docs
