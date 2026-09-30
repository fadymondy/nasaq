---
name: popover
title: Popover
category: overlays
status: stable
summary: Anchored floating panel opened by a click on a trigger, holding rich content such as text, forms or actions. Wraps Base UI Popover.
exports: [Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, PopoverClose, PopoverContentProps]
related: [dropdown-menu, tooltip, hover-card, dialog]
story: components-overlays-popover
base-ui: [popover]
keywords: [popover, floating panel, anchored, dropdown, info, overlay]
---

# Popover

A small panel that opens next to a trigger when it is clicked. It holds arbitrary content (an explanation, a
mini form, a set of actions) without leaving the page. Built on Base UI `Popover`, so it handles positioning,
collision flipping, focus and dismissal.

## When to use

- Extra detail or a small form attached to one control.
- Content that needs to be interactive, so a tooltip is not enough.

## When not to use

- A list of actions: use a [`DropdownMenu`](../dropdown-menu/README.md).
- A one-line hint on hover or focus: use a [`Tooltip`](../tooltip/README.md).
- A preview shown on hover: use a [`HoverCard`](../hover-card/README.md).
- Blocking decisions or long forms: use a [`Dialog`](../dialog/README.md).

## Import

```tsx
import { Popover, PopoverTrigger, PopoverContent } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@fadymondy/nasaq/web";

export function DeployInfo() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Details</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Deployment window</PopoverTitle>
        <PopoverDescription>Releases go out Sunday to Thursday.</PopoverDescription>
        <PopoverClose render={<Button size="sm" />}>Got it</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
```

## Anatomy

```
Popover                     Base UI Popover.Root
├─ PopoverTrigger           Base UI Popover.Trigger (use render={<Button />})
└─ PopoverContent           Portal + positioner + popup   data-slot="popover-content"
   ├─ PopoverTitle          data-slot="popover-title"
   ├─ PopoverDescription    data-slot="popover-description"
   └─ PopoverClose          Base UI Popover.Close
```

## API

`Popover` = `Popover.Root`, `PopoverTrigger` = `Popover.Trigger`, `PopoverClose` = `Popover.Close`. They take the Base UI props.

| Export | Common props |
| --- | --- |
| `Popover` | `open?`, `defaultOpen?`, `onOpenChange?`, `modal?` |
| `PopoverTrigger` | `render?`, `openOnHover?`, `delay?`, `disabled?` |
| `PopoverClose` | `render?` |

### `PopoverContent`

`PopoverContentProps` extends Base UI `Popover.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `Popover.Positioner` `side` (`"top" \| "bottom" \| "left" \| "right" \| "inline-start" \| "inline-end"`) | `"bottom"` | Side of the trigger to open on. |
| `align?` | `"start" \| "center" \| "end"` | `"center"` | Alignment against the trigger. |
| `sideOffset?` | `number` | `6` | Gap to the trigger in px. |
| `className?` | `string` | none | Merged onto the popup (width is `w-72` by default). |

### `PopoverTitle` / `PopoverDescription`

Base UI `Popover.Title` / `Popover.Description` props. They label the popup for assistive tech (`aria-labelledby`, `aria-describedby`).

## Examples

### Controlled

```tsx
import { Button, Popover, PopoverContent, PopoverTrigger } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button />}>{open ? "Hide" : "Show"}</PopoverTrigger>
      <PopoverContent side="inline-end" align="start">Opens at the inline end.</PopoverContent>
    </Popover>
  );
}
```

### Arabic

```tsx
import { Button, Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@fadymondy/nasaq/web";

export function DeployInfoAr() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>التفاصيل</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverTitle>نافذة النشر</PopoverTitle>
        <PopoverDescription>تُنشر الإصدارات من الأحد إلى الخميس.</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
```

## Accessibility

Base UI sets `aria-expanded` and `aria-controls` on the trigger, and the popup is labelled by `PopoverTitle` and described by `PopoverDescription`.

| Key | Action |
| --- | --- |
| `Enter` / `Space` on trigger | Toggles the popover. |
| `Tab` | Moves through the popup content, then on. |
| `Esc` | Closes and returns focus to the trigger. |

- Give an icon-only trigger an `aria-label`.
- Localise the title, description and close text.

## RTL & i18n

- Use `side="inline-start"` / `"inline-end"` so the placement mirrors with `dir`. `align="start"` follows the reading direction.
- The popup inherits direction from the app provider; portalled content outside a `dir` wrapper needs `dir` set on `PopoverContent` in isolated demos.
- No built-in strings.

## Styling & tokens

- Surface level 3: `bg-popover`, `text-popover-foreground`, `border-border`, `rounded-floating`, `shadow-floating`.
- State attributes on the popup: `data-starting-style`, `data-ending-style`, `data-side`, `data-open`.
- Extend with `className`; never override colours with raw hex.

## Do / Don't

- **Do** keep it short; move long content to a [`Dialog`](../dialog/README.md).
- **Do** give the trigger a visible label or `aria-label`.
- **Don't** put a menu of actions in it; use a `DropdownMenu`.
- **Don't** use `left` / `right` for `side` when `inline-start` / `inline-end` is meant.

## Related

- [DropdownMenu](../dropdown-menu/README.md) · [Tooltip](../tooltip/README.md) · [HoverCard](../hover-card/README.md) · [Dialog](../dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-popover--docs
