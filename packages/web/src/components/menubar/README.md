---
name: menubar
title: Menubar
category: navigation
status: beta
summary: Desktop-app menu bar (File, Edit, View) on Base UI Menubar and Menu, with submenus, checkbox and radio items and Kbd shortcuts. Uses the same item styles as DropdownMenu.
exports: [MenubarMenu, MenubarGroup, MenubarRadioGroup, MenubarSub, Menubar, MenubarTrigger, MenubarContentProps, MenubarContent, MenubarShortcut, MenubarItemProps, MenubarItem, MenubarCheckboxItemProps, MenubarCheckboxItem, MenubarRadioItem, MenubarLabel, MenubarSeparator, MenubarSubTrigger, MenubarSubContentProps, MenubarSubContent]
related: [dropdown-menu, context-menu, command-palette, text]
story: components-navigation-menubar
base-ui: [menubar, menu]
keywords: [menubar, menu bar, desktop, file, edit, view, shortcuts, electron, app menu]
---

# Menubar

A horizontal bar of menus such as File, Edit and View, as in a desktop application. Arrow keys move between the
menus, and once one is open, moving to a neighbour opens that one. Items look exactly like
[`DropdownMenu`](../dropdown-menu/README.md) items because both share `menu-styles.ts`.

## When to use

- A desktop-style app or Electron window that needs a menu bar under the title bar.
- Many commands grouped by area, each with a keyboard shortcut.

## When not to use

- One menu behind a button: use [`DropdownMenu`](../dropdown-menu/README.md).
- A right-click menu: use [`ContextMenu`](../context-menu/README.md).
- Site navigation with links and cards: use [`NavigationMenu`](../navigation-menu/README.md).
- Search-driven commands: use [`CommandPalette`](../command-palette/README.md).

## Import

```tsx
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@fadymondy/nasaq/web";

export function AppMenu() {
  return (
    <Menubar aria-label="Application">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem shortcut={["Ctrl", "N"]}>New file</MenubarItem>
          <MenubarItem shortcut={["Ctrl", "S"]}>Save</MenubarItem>
          <MenubarSeparator />
          <MenubarItem variant="danger">Quit</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
```

## Anatomy

```
Menubar                 data-slot="menubar"
└─ MenubarMenu          (Base UI Menu.Root)
   ├─ MenubarTrigger    data-slot="menubar-trigger"
   └─ MenubarContent    data-slot="menubar-content"
      ├─ MenubarItem / MenubarCheckboxItem / MenubarRadioItem   data-slot="menubar-item" | "menubar-checkbox-item" | "menubar-radio-item"
      │  └─ MenubarShortcut   data-slot="menubar-shortcut" (Kbd)
      ├─ MenubarGroup > MenubarLabel   data-slot="menubar-label"
      ├─ MenubarRadioGroup
      ├─ MenubarSeparator   data-slot="menubar-separator"
      └─ MenubarSub
         ├─ MenubarSubTrigger    data-slot="menubar-sub-trigger"
         └─ MenubarSubContent    data-slot="menubar-sub-content"
```

## API

**Menubar**: Base UI `Menubar` props (`modal`, `disabled`, `orientation`, `loopFocus`) plus `className`.

**MenubarMenu, MenubarGroup, MenubarRadioGroup, MenubarSub**: Base UI `Menu.Root`, `Menu.Group`, `Menu.RadioGroup` and `Menu.SubmenuRoot`, unchanged.

**MenubarTrigger**: Base UI `Menu.Trigger` with the bar styling.

**MenubarContent / MenubarSubContent**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side` | Base UI `side` | `"bottom"` / `"inline-end"` | Which side of the trigger the popup opens on. `inline-end` follows direction. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment against the trigger. |
| `sideOffset` | `number` | `6` / `-4` | Gap to the trigger. |

**MenubarItem**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"default" \| "danger"` | `"default"` | Danger colours a destructive command. |
| `shortcut` | `string \| readonly string[]` | | Shown at the inline end as `Kbd`. A string is one key cap (`"⌘O"`); an array is one cap per key (`["Ctrl", "S"]`). |

**MenubarCheckboxItem**: Base UI `Menu.CheckboxItem` (`checked`, `defaultChecked`, `onCheckedChange`) plus `shortcut`.

**MenubarRadioItem**: Base UI `Menu.RadioItem` (`value`). Wrap in `MenubarRadioGroup` (`value`, `onValueChange`).

**MenubarLabel**: a group label. Must be inside a `MenubarGroup`.

**MenubarShortcut**: `span` with `keys?: readonly string[]`; a string child renders one `Kbd`.

Also exported: `MenubarContentProps`, `MenubarSubContentProps`, `MenubarItemProps`, `MenubarCheckboxItemProps`.

## Examples

**Checkbox and radio items**

```tsx
import {
  Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarLabel, MenubarMenu,
  MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarTrigger,
} from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ViewMenu() {
  const [toolbar, setToolbar] = useState(true);
  const [zoom, setZoom] = useState("normal");
  return (
    <Menubar aria-label="Application">
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem checked={toolbar} onCheckedChange={setToolbar}>Show toolbar</MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarLabel>Zoom</MenubarLabel>
            <MenubarRadioGroup value={zoom} onValueChange={setZoom}>
              <MenubarRadioItem value="small">Small</MenubarRadioItem>
              <MenubarRadioItem value="normal">Normal</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
```

**Submenu, in Arabic**

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@fadymondy/nasaq/web";

export function ShareMenu() {
  return (
    <Menubar aria-label="التطبيق">
      <MenubarMenu>
        <MenubarTrigger>ملف</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>مشاركة</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>رابط بالبريد</MenubarItem>
              <MenubarItem>الرسائل</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Left / Right | Moves between menu triggers. Swapped in RTL. |
| Down / Enter / Space | Opens the menu on a trigger and focuses the first item. |
| Up / Down | Moves between items. |
| Right (Left in RTL) | Opens a submenu from its trigger. |
| Left (Right in RTL) | Closes a submenu. |
| Home / End | First or last item. |
| Type a letter | Focuses the next item starting with it. |
| Escape | Closes the menu and returns focus to its trigger. |

- Roles: `menubar` on the bar, `menuitem`, `menuitemcheckbox` and `menuitemradio` on items. Give the bar an `aria-label`.
- The caller must localise the bar label, trigger and item text. Key caps are not translated.
- Show a `shortcut` only when that shortcut really is bound.

## RTL & i18n

- The bar, the items, the check indicators and the submenu direction all mirror. The submenu opens on the left in Arabic and the chevron flips.
- Key caps always render left-to-right, so `Ctrl` `S` keeps its order in an Arabic menu.
- Direction comes from `NasaqProvider` (Base UI `DirectionProvider`), so arrow keys follow it.

## Styling & tokens

- Popup and items use `menuPopupClass` and `menuItemClass`, the same lists as `DropdownMenu`: `popover`, `border`, `shadow-floating`, `nq-selected`.
- The bar uses `border`, `card`, `control` height and `nq-hover`. Trigger state: `data-popup-open`. Item state: `data-highlighted`, `data-disabled`.
- Extend with `className`; use tokens, never raw hex.

## Do / Don't

- Do keep menu names to one word and commands to a verb phrase.
- Do bind every shortcut you display.
- Don't nest submenus deeper than one level.
- Don't use it for site navigation: use `NavigationMenu`.

## Related

- [`DropdownMenu`](../dropdown-menu/README.md)
- [`ContextMenu`](../context-menu/README.md)
- [`NavigationMenu`](../navigation-menu/README.md)
- [`CommandPalette`](../command-palette/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-navigation-menubar--docs
