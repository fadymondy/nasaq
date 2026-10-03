---
name: context-menu
title: ContextMenu
category: overlays
status: stable
summary: Right-click (or long-press) menu for a region, with items, checkbox and radio items, groups, shortcuts and submenus. Wraps Base UI ContextMenu and shares DropdownMenu styling.
exports: [ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuLabel, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuContentProps, ContextMenuItemProps, ContextMenuSubContentProps]
related: [dropdown-menu, popover, command-palette]
story: components-overlays-context-menu
base-ui: [context-menu, menu]
keywords: [context menu, right click, long press, menu, shortcuts, submenu]
---

# ContextMenu

A menu that opens at the pointer when the user right-clicks (or long-presses on touch) a region. It looks and
behaves like a [`DropdownMenu`](../dropdown-menu/README.md), sharing its item styles, but is anchored to a
region instead of a button.

## When to use

- Secondary actions on a row, card, canvas or file area, as a shortcut alongside a visible route.

## When not to use

- The only path to an action: context menus are hidden by nature. Offer a visible button or `DropdownMenu` too.
- Menus from a button: use a [`DropdownMenu`](../dropdown-menu/README.md).

## Import

```tsx
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@fadymondy/nasaq/web";
import { Copy, Trash2 } from "lucide-react";

export function FileRow() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="rounded-control border border-border p-4">report.pdf</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem shortcut="⌘C">
          <Copy /> Copy
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="danger">
          <Trash2 /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

## Anatomy

```
ContextMenu                         Base UI ContextMenu.Root
├─ ContextMenuTrigger               the region that listens for right-click / long-press
└─ ContextMenuContent               Portal + positioner + popup   data-slot="context-menu-content"
   ├─ ContextMenuGroup
   │  ├─ ContextMenuLabel           data-slot="context-menu-label"
   │  └─ ContextMenuItem            data-slot="context-menu-item", data-variant="default|danger"
   │     └─ ContextMenuShortcut     data-slot="dropdown-menu-shortcut" (from the shortcut prop)
   ├─ ContextMenuSeparator          data-slot="context-menu-separator"
   ├─ ContextMenuCheckboxItem       data-slot="context-menu-checkbox-item"
   ├─ ContextMenuRadioGroup
   │  └─ ContextMenuRadioItem       data-slot="context-menu-radio-item"
   └─ ContextMenuSub
      ├─ ContextMenuSubTrigger      data-slot="context-menu-sub-trigger" (chevron added)
      └─ ContextMenuSubContent      data-slot="context-menu-sub-content"
```

## API

Aliases: `ContextMenu` = `ContextMenu.Root`, `ContextMenuTrigger` = `ContextMenu.Trigger`,
`ContextMenuGroup` = `ContextMenu.Group`, `ContextMenuRadioGroup` = `ContextMenu.RadioGroup`,
`ContextMenuSub` = `ContextMenu.SubmenuRoot`, `ContextMenuShortcut` = `DropdownMenuShortcut`.

| Export | Common props |
| --- | --- |
| `ContextMenu` | `open?`, `defaultOpen?`, `onOpenChange?`, `loopFocus?`, `disabled?` |
| `ContextMenuTrigger` | `className?`, `render?` (a `div` by default; give it a size) |
| `ContextMenuRadioGroup` | `value?`, `defaultValue?`, `onValueChange?` |
| `ContextMenuContent` | Base UI `ContextMenu.Popup` props (`className`). It opens at the pointer; side and align are chosen automatically. |

### `ContextMenuItem`

`ContextMenuItemProps` is the same type as `DropdownMenuItemProps` (Base UI `Menu.Item` props).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"default" \| "danger"` | `"default"` | `danger` uses `text-nq-danger-text`. |
| `shortcut?` | `ReactNode` | none | Shortcut hint at the inline end. |

### Other parts

- `ContextMenuCheckboxItem`: `checked?`, `defaultChecked?`, `onCheckedChange?`, `disabled?`.
- `ContextMenuRadioItem`: `value` (required), `disabled?`. Inside `ContextMenuRadioGroup`.
- `ContextMenuLabel`: must be inside a `ContextMenuGroup`.
- `ContextMenuSeparator`: a 1px line bleeding to the popup edges.
- `ContextMenuSubContent`: `side?` (default `"inline-end"`), `align?` (`"start"`), `sideOffset?` (`-4`).

## Examples

### Toggles and a submenu

```tsx
import {
  ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Board() {
  const [pinned, setPinned] = useState(false);
  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-40 rounded-card border border-dashed border-border p-6">Right-click</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>Pin to top</ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Sort by</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Last updated</ContextMenuItem>
            <ContextMenuItem>Priority</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

### Arabic

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@fadymondy/nasaq/web";
import { Pencil } from "lucide-react";

export function BoardAr() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-40 rounded-card border border-dashed border-border p-6">انقر بزر الفأرة الأيمن</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>
          <Pencil /> تعديل
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

## ContextMenuActions

`<ContextMenuActions actions={[{ id, label, icon, onSelect, danger, group }]} render={<li />} />` turns any element into a context-menu trigger from a plain action list. It is what DataTable, EntityList, Inbox, FileExplorer, KanbanBoard and NotificationCenter use for their rows and cards. Right-click, Shift+F10 and the Menu key open it (from the keyboard at the element's inline start); Escape returns focus to the element (`focusTarget` picks another). Inputs, textareas, links, contenteditable and Shift+right-click keep the browser menu. Empty `actions` or `disabled` render the element untouched.

## Accessibility

Provided by Base UI: the popup has `role="menu"` and items `menuitem` / `menuitemcheckbox` / `menuitemradio`. Focus
moves into the menu on open and returns on close.

| Key | Action |
| --- | --- |
| Right-click / long-press / `Shift+F10` (browser) | Opens the menu. |
| `↑` / `↓` | Moves the highlight. |
| `Enter` / `Space` | Activates the highlighted item. |
| `→` (LTR) / `←` (RTL) on a sub-trigger | Opens the submenu. |
| `Esc` | Closes the menu. |

- The trigger region is not focusable by itself, so mirror every action in a visible, focusable control.
- Localise item text and labels.

## RTL & i18n

- Check/radio indicators use `start-2.5` / `ps-8`; shortcut and chevron use `ms-auto`. All flip with `dir`.
- Submenus open at `inline-end`, so they open to the left in RTL. The chevron mirrors.
- Shortcut text is forced `dir="ltr"`.
- No built-in strings.

## Styling & tokens

- Same tokens as DropdownMenu (shared internal class lists): `bg-popover`, `border-border`, `rounded-floating`, `shadow-floating`, `rounded-control`, `h-nav-row`, `data-highlighted:bg-nq-selected`.
- Danger: `text-nq-danger-text`. Target `[data-slot=context-menu-item][data-variant=danger]`.
- Extend with `className`; no raw hex.

## Do / Don't

- **Do** mirror context-menu actions in a visible control.
- **Do** put destructive items last, after a separator.
- **Don't** nest submenus more than one level.
- **Don't** use it on touch-only surfaces as the sole route to an action.

## Related

- [DropdownMenu](../dropdown-menu/README.md) · [Popover](../popover/README.md) · [CommandPalette](../command-palette/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-overlays-context-menu--docs
