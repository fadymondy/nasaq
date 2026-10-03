---
name: button-group
title: ButtonGroup
category: actions
status: beta
summary: Buttons joined into one control with shared borders and only the outer corners rounded, horizontal or vertical, with a separator slot for split buttons.
exports: [ButtonGroup, ButtonGroupSeparator, ButtonGroupProps]
related: [button, toggle-group, dropdown-menu]
story: components-actions-button-group
base-ui: []
keywords: [button group, split button, joined buttons, toolbar, segmented]
---

# ButtonGroup

Fuses several `Button`s into one control. Borders overlap so they read as one edge, and only the outer corners are
rounded, using logical radii (inline start of the first, inline end of the last), so RTL is right without overrides.

## When to use

- Related actions side by side (Day / Week / Month) or a split button (action plus menu).

## When not to use

- Options with a pressed state: use `ToggleGroup`.
- Unrelated actions: keep them apart with normal spacing.

## Import

```tsx
import { Button, ButtonGroup } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Button, ButtonGroup } from "@fadymondy/nasaq/web";

export function Period() {
  return (
    <ButtonGroup aria-label="Period">
      <Button>Day</Button>
      <Button>Week</Button>
      <Button>Month</Button>
    </ButtonGroup>
  );
}
```

## Anatomy

```
<ButtonGroup>              data-slot="button-group"  data-orientation, role="group"
├─ <Button>                data-slot="button"
├─ <ButtonGroupSeparator>  data-slot="button-group-separator"
└─ <Button> / DropdownMenuTrigger render={<Button />}
```

## API

### ButtonGroup (`ButtonGroupProps`)

All `div` props, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Row or column. |

### ButtonGroupSeparator

A `div` with `role="separator"`. Use it between borderless buttons such as two `primary` ones.

## Examples

Split button with a menu:

```tsx
import {
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
} from "@fadymondy/nasaq/web";
import { ChevronDown } from "lucide-react";

export function SplitPublish() {
  return (
    <ButtonGroup aria-label="Publish">
      <Button variant="primary">Publish</Button>
      <ButtonGroupSeparator />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="primary" size="icon" aria-label="More publish options" />}>
          <Icon icon={ChevronDown} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Schedule publish</DropdownMenuItem>
          <DropdownMenuItem>Save as draft</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
```

Vertical, in Arabic:

```tsx
import { Button, ButtonGroup } from "@fadymondy/nasaq/web";

export function ActionsAr() {
  return (
    <ButtonGroup orientation="vertical" aria-label="الإجراءات">
      <Button>تعديل</Button>
      <Button>نسخ</Button>
    </ButtonGroup>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through each button in order. |
| Enter / Space | Activates the focused button. |

- The wrapper is `role="group"`. Give it an `aria-label` and localise it. Icon-only buttons need their own `aria-label`.

## RTL & i18n

Buttons follow reading order. Rounding uses `rounded-s-control` / `rounded-e-control` (vertical uses top and bottom), so the
first button sits at the right in Arabic with its right corners round.

## Styling & tokens

Radius token `--radius-control`; borders from each button's variant. Children are styled by `data-slot="button"`, so
children must be `Button`s (or triggers rendered as one). `className` merges onto the group.

## Do / Don't

- Do keep to two to five buttons.
- Don't mix sizes inside one group.

## Related

[button](../button/README.md), [toggle-group](../toggle-group/README.md), [dropdown-menu](../dropdown-menu/README.md).

## Lab

https://docs.nasaqui.com/?path=/docs/components-actions-button-group--docs
