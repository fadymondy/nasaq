---
name: dropdown-menu
title: DropdownMenu
category: overlays
status: stable
summary: Action menu opened from a trigger, with items, checkbox and radio items, groups, shortcuts and submenus. Wraps Base UI Menu.
exports: [DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuContentProps, DropdownMenuItemProps, DropdownMenuSubContentProps]
related: [button, user-menu, dialog, command-palette]
story: components-overlays-dropdown-menu
base-ui: [menu]
keywords: [menu, dropdown, context actions, kebab, checkbox item, radio item, submenu]
---

# DropdownMenu

A menu of actions that opens from a trigger button. Built on Base UI `Menu`, so it has roving focus,
typeahead, submenus and full keyboard support. Use it to collect secondary actions on a row, card or header.

## When to use

- Secondary actions for one object (edit, duplicate, delete).
- Small view options: toggles (checkbox items) and one-of-many choices (radio items).

## When not to use

- Primary or single actions: use a [`Button`](../button/README.md).
- Navigating the whole app or searching for commands: use [`CommandPalette`](../command-palette/README.md).
- The signed-in user's account menu: use [`UserMenu`](../user-menu/README.md).
- Form selection: use a select or field component.

## Import

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@fadymondy/nasaq/web";
import { ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";

export function IssueActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        Actions <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem shortcut="E">
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem shortcut="⌘D">
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Anatomy

```
DropdownMenu                        Base UI Menu.Root
├─ DropdownMenuTrigger              Base UI Menu.Trigger (use render={<Button />})
└─ DropdownMenuContent              Portal + positioner + popup   data-slot="dropdown-menu-content"
   ├─ DropdownMenuGroup             Base UI Menu.Group
   │  ├─ DropdownMenuLabel          data-slot="dropdown-menu-label"
   │  └─ DropdownMenuItem           data-slot="dropdown-menu-item", data-variant="default|danger"
   │     └─ DropdownMenuShortcut    data-slot="dropdown-menu-shortcut" (from the shortcut prop)
   ├─ DropdownMenuSeparator         data-slot="dropdown-menu-separator"
   ├─ DropdownMenuCheckboxItem      data-slot="dropdown-menu-checkbox-item"
   ├─ DropdownMenuRadioGroup
   │  └─ DropdownMenuRadioItem      data-slot="dropdown-menu-radio-item"
   └─ DropdownMenuSub               Base UI Menu.SubmenuRoot
      ├─ DropdownMenuSubTrigger     data-slot="dropdown-menu-sub-trigger" (chevron added)
      └─ DropdownMenuSubContent     data-slot="dropdown-menu-sub-content"
```

## API

### Base UI aliases

`DropdownMenu` = `Menu.Root`, `DropdownMenuTrigger` = `Menu.Trigger`, `DropdownMenuGroup` = `Menu.Group`,
`DropdownMenuRadioGroup` = `Menu.RadioGroup`, `DropdownMenuSub` = `Menu.SubmenuRoot`. They take the
Base UI props.

| Export | Common props |
| --- | --- |
| `DropdownMenu` | `open?`, `defaultOpen?`, `onOpenChange?`, `modal?`, `loopFocus?`, `disabled?` |
| `DropdownMenuTrigger` | `render?` (e.g. `<Button />`), `disabled?` |
| `DropdownMenuRadioGroup` | `value?`, `defaultValue?`, `onValueChange?` |
| `DropdownMenuSub` | `open?`, `defaultOpen?`, `onOpenChange?` |

### `DropdownMenuContent`

`DropdownMenuContentProps` extends Base UI `Menu.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `Menu.Positioner` `side` (`"top" \| "bottom" \| "left" \| "right" \| "inline-start" \| "inline-end"`) | `"bottom"` | Which side of the trigger to open on. |
| `align?` | `"start" \| "center" \| "end"` | `"start"` | Alignment against the trigger. |
| `sideOffset?` | `number` | `4` | Gap to the trigger in px. |
| `className?` | `string` | none | Merged onto the popup. |

Popup: `min-w-44`, `max-h-[var(--available-height)]`, scrolls when needed.

### `DropdownMenuItem`

`DropdownMenuItemProps` extends Base UI `Menu.Item` props (`onClick`, `disabled`, `closeOnClick`, `label`, `render`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"default" \| "danger"` | `"default"` | `danger` uses `text-nq-danger-text`. Sets `data-variant`. |
| `shortcut?` | `ReactNode` | none | Renders a `DropdownMenuShortcut` at the inline end. |
| `children?` | `ReactNode` | none | Icon and label. |

### `DropdownMenuCheckboxItem`

Base UI `Menu.CheckboxItem` props: `checked?`, `defaultChecked?`, `onCheckedChange?(checked: boolean)`,
`disabled?`, `closeOnClick?` (default `false`). A check icon shows at the inline-start.

### `DropdownMenuRadioItem`

Base UI `Menu.RadioItem` props: `value` (required), `disabled?`, `closeOnClick?`. A dot shows at the
inline-start when selected. Place inside `DropdownMenuRadioGroup`.

### `DropdownMenuLabel`

Inside a `DropdownMenuGroup` it is Base UI `Menu.GroupLabel` and labels the group (`aria-labelledby`). Outside a group it renders a plain presentational heading (`role="presentation"`) with the same style, so it no longer throws. Wrap a label and its items in `<DropdownMenuGroup>` when you want the group announced.

### `DropdownMenuSeparator`

Base UI `Menu.Separator` props. A 1px line that bleeds to the popup edges (`-mx-1.5`).

### `DropdownMenuShortcut`

`ComponentProps<"span">`. Rendered with `dir="ltr"`, monospace, at the end (`ms-auto`). Shortcut hints are
not mirrored.

### `DropdownMenuSubTrigger`

Base UI `Menu.SubmenuTrigger` props. Appends a directional chevron (`<Icon directional />`) that flips in RTL.

### `DropdownMenuSubContent`

`DropdownMenuSubContentProps` extends Base UI `Menu.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | as `Menu.Positioner` `side` | `"inline-end"` | Preferred side of the sub-trigger. Logical, so it mirrors in RTL. |
| `align?` | as `Menu.Positioner` `align` | `"start"` | Alignment on the cross axis. |
| `sideOffset?` | `number` | `-4` | Gap to the trigger in px (negative overlaps slightly). |

## Examples

### Toggles, radio choices and a submenu

```tsx
import {
  Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ViewOptions() {
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState("updated");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>View</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked={archived} onCheckedChange={setArchived}>
          Show archived
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenuRadioItem value="updated">Last updated</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Labelled group, Arabic, aligned to the end

```tsx
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@fadymondy/nasaq/web";
import { Pencil, Trash2 } from "lucide-react";

export function RowActionsAr() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>إجراءات</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>المهمة</DropdownMenuLabel>
          <DropdownMenuItem>
            <Pencil /> تعديل
          </DropdownMenuItem>
          <DropdownMenuItem variant="danger">
            <Trash2 /> حذف
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Accessibility

Provided by Base UI Menu: trigger has `aria-haspopup="menu"` and `aria-expanded`; the popup has
`role="menu"`; items have `role="menuitem"`, `"menuitemcheckbox"` or `"menuitemradio"` with
`aria-checked`. Focus moves into the menu on open and returns to the trigger on close.

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `↓` on trigger | Opens the menu and focuses the first item. |
| `↑` / `↓` | Moves the highlight between items. |
| `Home` / `End` | First / last item. |
| Typing characters | Typeahead to the matching item. |
| `Enter` / `Space` | Activates the highlighted item (closes the menu, except checkbox items). |
| `→` (LTR) / `←` (RTL) on a sub-trigger | Opens the submenu. |
| `←` (LTR) / `→` (RTL) inside a submenu | Closes the submenu. |
| `Esc` | Closes the menu. |

- Give an icon-only trigger an `aria-label`.
- Item text and labels are the caller's; localise them.
- Disabled items are skipped by `data-disabled` styling and Base UI.

## RTL & i18n

- Check/radio indicators use `start-2.5` / `ps-8`; the shortcut and sub-trigger chevron use `ms-auto`. All flip with `dir`.
- The submenu opens at `inline-end`, so it opens to the left in RTL.
- The sub-trigger chevron is `directional` and mirrors.
- Shortcut text is forced `dir="ltr"`.
- No built-in strings.

## Styling & tokens

- Surface level 3: `bg-popover`, `border-border`, `rounded-floating`, `shadow-floating`. Items `rounded-control`, `h-nav-row`, `text-body-sm`.
- Highlighted item: `data-highlighted:bg-nq-selected`. Open sub-trigger: `data-popup-open:bg-nq-selected`. Disabled: `data-disabled`.
- Danger items: `text-nq-danger-text`.
- Target `[data-slot=dropdown-menu-content]`, `[data-slot=dropdown-menu-item][data-variant=danger]`.

## Do / Don't

- **Do** put destructive items last, after a separator, with `variant="danger"` and a destructive icon.
- **Do** confirm irreversible actions in a [`Dialog`](../dialog/README.md) rather than acting on click.
- **Don't** hide the only path to an important action inside a menu.
- **Don't** nest submenus more than one level deep.
- **Don't** use `left` / `right` for `side` when `inline-start` / `inline-end` is meant.

## Related

- [Button](../button/README.md) · [UserMenu](../user-menu/README.md) · [Dialog](../dialog/README.md)
- [CommandPalette](../command-palette/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-dropdown-menu--docs
