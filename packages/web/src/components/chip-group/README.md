---
name: chip-group
title: ChipGroup
category: forms
status: beta
summary: A single-select row of filter chips for categories or views; scrolls sideways on narrow screens instead of wrapping.
exports: [ChipGroup, Chip, ChipGroupProps, ChipProps]
related: [tabs, switch, button]
story: components-forms-chip-group
base-ui: []
keywords: [chips, filter, category, single-select, pills, toggle, group]
---

# ChipGroup

A row of chips where exactly one is selected. Use it to filter a list by category or to pick one of a few views.
It is controlled: you pass `value` and `onValueChange`. On narrow screens the row scrolls sideways with the
scrollbar hidden, instead of wrapping into a block.

## When to use

- Filtering a store or list by category ("All", "Productivity", "Finance").
- A small set of mutually exclusive filters.

## When not to use

- Navigating between views of the same content: use [`Tabs`](../tabs/README.md).
- A setting that turns on or off: use [`Switch`](../switch/README.md).
- Multi-select filters: this component allows one value only.
- A form choice among options: use a radio group.

## Import

```tsx
import { Chip, ChipGroup, type ChipGroupProps, type ChipProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Chip, ChipGroup } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function CategoryFilter() {
  const [category, setCategory] = useState("all");
  return (
    <ChipGroup aria-label="Categories" value={category} onValueChange={setCategory}>
      <Chip value="all">All</Chip>
      <Chip value="productivity">Productivity</Chip>
      <Chip value="finance">Finance</Chip>
    </ChipGroup>
  );
}
```

## Anatomy

```
ChipGroup               data-slot="chip-group", role="group"   <div>, scrolls on the inline axis
└─ Chip (one or more)   data-slot="chip", data-selected, aria-pressed   <Button>
   ├─ icon              optional leading element
   └─ children          label
```

`Chip` throws if it is rendered outside a `ChipGroup`.

## API

### `ChipGroup`

`ChipGroupProps extends Omit<ComponentProps<"div">, "onChange">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | The selected chip's value. |
| `onValueChange` | `(value: string) => void` | required | Called with the value of the chip that was pressed. |
| `aria-label` | `string` | required | Accessible name of the group: "Categories". Localise it. |
| `className?` | `string` | none | Merged onto the row. |
| `children?` | `ReactNode` | none | `Chip` elements. |

### `Chip`

`ChipProps extends Omit<ComponentProps<typeof Button>, "value" | "variant" | "size">`. Other `Button` props are forwarded.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | This chip's value. Selected when it equals the group's `value`. |
| `icon?` | `ReactNode` | none | Leading icon element. |
| `className?` | `string` | none | Merged onto the chip. |
| `children?` | `ReactNode` | none | The label. |

## Examples

### With icons

```tsx
import { Chip, ChipGroup } from "@fadymondy/nasaq/web";
import { LayoutGrid, Wallet } from "lucide-react";
import { useState } from "react";

export function IconChips() {
  const [view, setView] = useState("all");
  return (
    <ChipGroup aria-label="Views" value={view} onValueChange={setView}>
      <Chip value="all" icon={<LayoutGrid />}>
        All
      </Chip>
      <Chip value="billing" icon={<Wallet />}>
        Billing
      </Chip>
    </ChipGroup>
  );
}
```

### Arabic

```tsx
import { Chip, ChipGroup, NasaqProvider } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ArabicChips() {
  const [category, setCategory] = useState("all");
  return (
    <NasaqProvider locale="ar" dir="rtl">
      <ChipGroup aria-label="التصنيفات" value={category} onValueChange={setCategory}>
        <Chip value="all">الكل</Chip>
        <Chip value="productivity">الإنتاجية</Chip>
        <Chip value="finance">المالية</Chip>
      </ChipGroup>
    </NasaqProvider>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Moves between chips (each chip is a tab stop) |
| `Enter` / `Space` | Selects the focused chip |

- The group has `role="group"` and requires an `aria-label`.
- Each chip is a button with `aria-pressed` set to whether it is selected. There are no arrow-key shortcuts.
- Selection is shown by background and text colour as well as `aria-pressed`. Pressing the selected chip again
  keeps it selected.
- Localise `aria-label` and chip labels yourself.

## RTL & i18n

- The row is a flex container, so chips start on the inline start (right in RTL) and the horizontal scroll
  follows the direction.
- The negative margin and padding of the row are symmetrical.
- Icons are your own; mirror directional ones with `rtl:-scale-x-100`.
- No built-in strings.

## Styling & tokens

- Tokens: `bg-nq-selected` and `text-foreground` when selected, `text-muted-foreground` otherwise.
- Target with `[data-slot=chip]`, `[data-selected]` or `[aria-pressed=true]`.
- Extend with `className`. Do not override the selected colours with raw hex.

## Do / Don't

- **Do** give the group an `aria-label`.
- **Do** keep chip labels short so several fit on screen.
- **Do** include an "All" chip when the filter can be cleared.
- **Don't** use chips for navigation between views; use `Tabs`.
- **Don't** use them for on/off settings; use `Switch`.

## Related

- [Tabs](../tabs/README.md) · [Switch](../switch/README.md) · [Button](../button/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-chip-group--docs
