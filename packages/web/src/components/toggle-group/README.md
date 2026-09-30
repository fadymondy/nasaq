---
name: toggle-group
title: ToggleGroup
category: actions
status: beta
summary: Pressed-state buttons grouped as a segmented control, single or multiple selection, plus a standalone Toggle.
exports: [ToggleGroup, Toggle, ToggleGroupProps]
related: [tabs, radio-group, chip-group, button]
story: components-actions-toggle-group
base-ui: [toggle, toggle-group]
keywords: [toggle, toggle group, segmented control, pressed, view mode, alignment, formatting, bold, italic]
---

# ToggleGroup

A row of buttons that each hold a pressed state. With the default single selection it is a segmented control
(list / grid view, text alignment). With `multiple` several items can be pressed at once (bold, italic). `Toggle`
alone is a single pressed-state button (star, pin). Built on Base UI `Toggle` and `ToggleGroup`.

## When to use

- Choosing a view mode, alignment or density from two to five short options.
- Formatting toolbars where each option is independent (`multiple`).

## When not to use

- Switching between panels of content: use `Tabs`.
- A choice that is submitted with a form and needs descriptions: use `RadioGroup`.
- Filtering by category with many chips: use `ChipGroup`.
- An immediate on/off setting: use `Switch`.

## Import

```tsx
import { Toggle, ToggleGroup } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Toggle, ToggleGroup } from "@fadymondy/nasaq/web";

export function ViewMode() {
  return (
    <ToggleGroup defaultValue={["list"]} aria-label="View mode">
      <Toggle value="list">List</Toggle>
      <Toggle value="grid">Grid</Toggle>
    </ToggleGroup>
  );
}
```

## Anatomy

```
<ToggleGroup>   data-slot="toggle-group"   data-variant="segmented | outline"
└─ <Toggle>     data-slot="toggle"         data-pressed when on
```

## API

### ToggleGroup (`ToggleGroupProps`)

All Base UI `ToggleGroup` props, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"segmented" \| "outline"` | `"segmented"` | Tinted track with a raised pressed item, or joined bordered buttons. |
| `multiple` | `boolean` | `false` | Allow several pressed items. |
| `value` / `defaultValue` | `readonly string[]` | none | Values of the pressed items. Always an array, even in single mode. |
| `onValueChange` | `(value: string[], eventDetails) => void` | none | Called when the pressed set changes. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Arrow key axis. |
| `loopFocus` | `boolean` | `true` | Wrap focus at the ends. |
| `disabled` | `boolean` | `false` | Disable every item. |

### Toggle

All Base UI `Toggle` props: `value` (its id inside a group), `pressed` / `defaultPressed`, `onPressedChange`, `disabled`.
Outside a group it renders as an outline button.

## Examples

Multiple selection with icons (icon-only items need `aria-label`):

```tsx
import { Toggle, ToggleGroup } from "@fadymondy/nasaq/web";
import { Bold, Italic } from "lucide-react";

export function Format() {
  return (
    <ToggleGroup multiple variant="outline" aria-label="Formatting">
      <Toggle value="bold" aria-label="Bold"><Bold /></Toggle>
      <Toggle value="italic" aria-label="Italic"><Italic /></Toggle>
    </ToggleGroup>
  );
}
```

Controlled, in Arabic:

```tsx
import { useState } from "react";
import { Toggle, ToggleGroup } from "@fadymondy/nasaq/web";

export function ViewModeAr() {
  const [value, setValue] = useState<string[]>(["list"]);
  return (
    <ToggleGroup value={value} onValueChange={setValue} aria-label="طريقة العرض">
      <Toggle value="list">قائمة</Toggle>
      <Toggle value="grid">شبكة</Toggle>
    </ToggleGroup>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves focus into the group, then out. |
| Arrow keys | Move between items. In RTL, ArrowLeft moves to the next item. |
| Space / Enter | Toggles the focused item. |

- The group has `role="group"`; items expose `aria-pressed`. Name the group with `aria-label` and localise it.
- In single mode, pressing the pressed item again unpresses it and gives an empty array; guard in `onValueChange` if one must always stay selected.

## RTL & i18n

Items are laid out in reading order, so the first item sits at the inline start. The outline variant rounds the
inline-start and inline-end corners with logical classes.

## Styling & tokens

`bg-secondary` track, `bg-card` pressed item, `bg-nq-selected` and `border-primary` for pressed outline items,
`text-muted-foreground` idle text, focus ring `nq-focus`. State attributes: `data-pressed`, `data-disabled`.
`className` merges onto both parts.

## Do / Don't

- Do keep labels to one or two words.
- Don't use it for page navigation.

## Related

[tabs](../tabs/README.md), [radio-group](../radio-group/README.md), [chip-group](../chip-group/README.md), [button](../button/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-actions-toggle-group--docs
