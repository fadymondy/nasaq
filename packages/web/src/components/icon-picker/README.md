---
name: icon-picker
title: IconPicker
category: pickers
status: beta
summary: A popover or inline panel to choose a lucide icon with search in English and Arabic, categories, recent icons, a capped grid with show more and full keyboard navigation. Returns the icon name.
exports: [IconPickerLabels, normalizeIconName, findIcon, boxiconClass, IconByName, IconByNameProps, IconPickerPanelProps, IconPickerPanel, IconPickerProps, IconPicker]
related: [emoji-picker, color-picker, popover]
story: components-pickers-icon-picker
keywords: [icon, picker, lucide, symbol, glyph, select icon, search, categories, recent]
---

# IconPicker

Lets people pick an icon for a project, a workspace, a tag or a list. It shows a searchable grid of lucide icons in
categories, remembers the ones used last, and hands back the icon's name (`"house"`, `"building-2"`) so you can
store a string and render it later with `IconByName`.

## When to use

- Choosing an icon for something the user creates.

## When not to use

- An emoji: use [`EmojiPicker`](../emoji-picker/README.md).
- A colour: use [`ColorPicker`](../color-picker/README.md).
- Picking from three or four icons: a small `ToggleGroup` is enough.

## Import

```tsx
import { IconPicker, IconByName } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { IconByName, IconPicker } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ProjectIcon() {
  const [icon, setIcon] = useState("rocket");
  return (
    <div className="flex items-center gap-3">
      <IconPicker value={icon} onValueChange={setIcon} />
      <IconByName name={icon} className="size-6" />
    </div>
  );
}
```

## Anatomy

```
IconPicker                     Popover; trigger is a button showing the chosen icon
└─ IconPickerPanel             data-slot="icon-picker"
   ├─ search                   type="search"
   ├─ categories               role="tablist" chips (All + one per category)
   ├─ recent                   data-slot="icon-picker-recent" (no query, no category)
   └─ grid                     role="listbox" of role="option" tiles, then "Show more"
```

## API

**IconPickerPanel** props (also accepted by `IconPicker`):

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `string \| null` | | The chosen icon's kebab-case name. |
| `onValueChange` | `(name, entry) => void` | | Called with the name, for example `"house"`. |
| `icons` | `IconEntry[]` | built-in ~220 | Your own list: `{ name, icon, category, keywords, keywordsAr? }`. |
| `recent` / `onRecentChange` | `string[]` | localStorage | Recent icons, controlled. |
| `recentKey` | `string \| null` | `"nasaq:icon-picker:recent"` | localStorage key, or `null` for memory only. |
| `columns` | `number` | `8` | Tiles per row. |
| `pageSize` | `number` | `96` | Tiles rendered before "Show more". |
| `labels` | | | Override strings and category names. |

**IconPicker** adds `trigger`, `closeOnSelect` (default true), `open` / `onOpenChange`, `side`, `align`, `disabled`.

**IconByName** renders an icon stored as a string.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string | null | undefined` | | `users`, `Users` or `lucide:users`; a Boxicons name (`bx:home`, `bxs:star`, `bxl:github`, or the legacy `bx-home`); or an image URL (`https://…`, `/…`, `data:image/…`), drawn as a decorative `<img>`. |
| `icons` | `readonly IconEntry[]` | `ICON_CATALOG` | The set to look the name up in. |
| `fallback` | `ReactNode` | `null` | Rendered for an empty or unknown name. |
| `size`, `className`, … | lucide props | | Passed to the icon (`size` also sizes an image). |

Boxicons names render `<i class="bx bx-home">` at `size` (default `1em`, so it follows the text). Nasaq does not
ship the Boxicons font: load its CSS yourself (`boxicons/css/boxicons.min.css`) or the glyph stays empty. Use it
for plugin manifests and menus stored before the move to lucide; prefer lucide names for new data.

**Helpers**: `normalizeIconName(name)` (to kebab-case, strips `lucide:`), `findIcon(name)`, `boxiconClass(name)` (the Boxicons class or `undefined`), `filterIcons(icons, query, category)`, `ICON_CATALOG`, `ICON_CATEGORIES`.

## Examples

**Your own icon set**

```tsx
import { IconPicker, toKebab } from "@fadymondy/nasaq/web";
import { Anchor, Ship } from "lucide-react";

const icons = [Anchor, Ship].map((icon) => ({ name: toKebab(icon.displayName ?? ""), icon, category: "sea", keywords: "boat harbor" }));

<IconPicker icons={icons} onValueChange={console.log} />;
```

### Icons sent by a server

Navigation and resource manifests often name their icon as a string. Give unknown names a neutral fallback so a typo never leaves a hole in the menu.

```tsx
import { IconByName } from "@fadymondy/nasaq/web";
import { Circle } from "lucide-react";

export function NavIcon({ icon }: { icon?: string }) {
  return <IconByName name={icon} className="size-4" fallback={<Circle aria-hidden className="size-4" />} />;
}
```

## Accessibility

- The grid is a `listbox` with one tab stop (roving `tabindex`). Arrow keys move by tile (swapped in RTL), Up and Down by row, Home and End to the row edges, Page Up and Page Down by four rows. Enter or Space chooses. Down from the search field enters the grid; Up from the first row returns to it.
- Every tile is named with the icon's name. Categories are a tablist; a live region reports the result count.
- Escape closes the popover and returns focus to the trigger.

## RTL & i18n

- English and Arabic strings and category names ship. The search understands Arabic keywords (`بريد` finds `mail`) and folds alef, yeh and diacritics.
- The returned name is always the English lucide name.
- Directional icons in the grid are shown as they are; mirror them where you render them if they carry direction.

## Styling & tokens

- Tiles use `nq-hover`, `nq-selected` and `nq-focus`. Extend with `className`.

## Do / Don't

- Do store the returned name string, not a component.
- Don't ship all 1,900 lucide icons for a picker; pass a curated `icons` list if you need more than the built-in set.

## Related

- [`EmojiPicker`](../emoji-picker/README.md)
- [`ColorPicker`](../color-picker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-icon-picker--docs
