---
name: tooltip
title: Tooltip
category: overlays
status: stable
summary: Short supplementary label shown on hover and keyboard focus of a trigger. Shorthand plus composable parts over Base UI Tooltip.
exports: [Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, TooltipProps, TooltipContentProps]
related: [button, dropdown-menu, product-switcher]
story: components-overlays-tooltip
base-ui: [tooltip]
keywords: [tooltip, hint, label, hover, icon button]
---

# Tooltip

A small inverted label that appears when the user hovers or focuses a trigger. `Tooltip` is the shorthand
(`content` + one child); `TooltipProvider`, `TooltipRoot`, `TooltipTrigger` and `TooltipContent` are the parts when you
need control.

Tooltips are **supplementary**. They do not appear on touch, so never put essential information in one.

## When to use

- Naming an icon-only button (in addition to its `aria-label`).
- A keyboard shortcut hint or a short clarification.

## When not to use

- Essential information, errors or instructions: put it in the page or a field description.
- Interactive content (links, buttons): use a popover or [`Dialog`](../dialog/README.md).
- Long text: max width is `max-w-64`.

## Import

```tsx
import { Tooltip, TooltipProvider } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Tooltip } from "@fadymondy/nasaq/web";
import { Settings } from "lucide-react";

export function SettingsButton() {
  return (
    <Tooltip content="Settings">
      <Button size="icon" variant="ghost" aria-label="Settings">
        <Settings />
      </Button>
    </Tooltip>
  );
}
```

## Anatomy

```
Tooltip (shorthand)
├─ TooltipRoot                 Base UI Tooltip.Root
│  ├─ TooltipTrigger           Base UI Tooltip.Trigger, render={children}
│  └─ TooltipContent           Portal + positioner + popup   data-slot="tooltip-content"
TooltipProvider                Base UI Tooltip.Provider (optional; shares delay across tooltips)
```

## API

### `Tooltip`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `ReactNode` | required | The tooltip text. |
| `children` | `ReactElement` | required | The trigger element. It is passed to `render`, so it must be a single element that accepts a ref and props and is focusable. |
| `side?` | `"top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"` | `"top"` in `TooltipContent` | Preferred side. Prefer `inline-start` / `inline-end`: they mirror in RTL; physical `left` / `right` are accepted but do not. |
| `align?` | `"start" | "center" | "end"` | `"center"` (Base UI) | Alignment along the trigger edge. |
| `sideOffset?` | `number` | `6` | Gap to the trigger in px. |
| `delay?` | `number` | Base UI default, or the `TooltipProvider` delay | Hover delay before opening, passed to `Tooltip.Trigger`. |
| `open?` | `boolean` | uncontrolled | Controlled open state (Base UI `Tooltip.Root`). |
| `onOpenChange?` | `(open, details) => void` | none | Called when the tooltip opens or closes. |

### `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`

Aliases of Base UI `Tooltip.Provider`, `Tooltip.Root`, `Tooltip.Trigger`.

| Export | Common props |
| --- | --- |
| `TooltipProvider` | `delay?`, `closeDelay?`, `timeout?`: shared open delay for a group of tooltips. |
| `TooltipRoot` | `open?`, `defaultOpen?`, `onOpenChange?`, `disabled?` |
| `TooltipTrigger` | `render?`, plus native attributes. |

### `TooltipContent`

`TooltipContentProps` extends Base UI `Tooltip.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | as `Tooltip.Positioner` `side` | `"top"` | Preferred side. Prefer `inline-start` / `inline-end`. |
| `align?` | as `Tooltip.Positioner` `align` | Base UI default (`"center"`) | Alignment along the trigger edge. |
| `sideOffset?` | `number` | `6` | Gap to the trigger in px. |
| `className?` | `string` | none | Merged onto the popup. |
| `children?` | `ReactNode` | none | Tooltip content. |

## Examples

### Placement

```tsx
import { Button, Tooltip } from "@fadymondy/nasaq/web";

export function Placement() {
  return (
    <div className="flex gap-3 p-10">
      <Tooltip content="Shown below" side="bottom">
        <Button>Hover me</Button>
      </Tooltip>
      <Tooltip content="Beside, at the inline end" side="inline-end">
        <Button>Inline end</Button>
      </Tooltip>
    </div>
  );
}
```

### Shared delay with a provider, Arabic

```tsx
import { Button, Tooltip, TooltipProvider } from "@fadymondy/nasaq/web";
import { Pencil, Trash2 } from "lucide-react";

export function Toolbar() {
  return (
    <TooltipProvider delay={300}>
      <div className="flex gap-1">
        <Tooltip content="تعديل">
          <Button size="icon-sm" variant="ghost" aria-label="تعديل">
            <Pencil />
          </Button>
        </Tooltip>
        <Tooltip content="حذف">
          <Button size="icon-sm" variant="ghost" aria-label="حذف">
            <Trash2 />
          </Button>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

### Composed parts

```tsx
import { Button, TooltipContent, TooltipRoot, TooltipTrigger } from "@fadymondy/nasaq/web";

export function Composed() {
  return (
    <TooltipRoot>
      <TooltipTrigger render={<Button variant="ghost" />}>Info</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={10}>
        Extra detail
      </TooltipContent>
    </TooltipRoot>
  );
}
```

## Accessibility

Base UI opens the tooltip on pointer hover and on keyboard focus of the trigger, and closes it on blur, pointer leave and `Esc`.

| Key | Action |
| --- | --- |
| `Tab` | Focusing the trigger opens the tooltip. |
| `Esc` | Closes the tooltip. |

- The tooltip is not a substitute for a label. An icon-only trigger still needs its own `aria-label`.
- Tooltips do not open on touch devices.
- Localise `content`.

## RTL & i18n

- Use `side="inline-start"` / `"inline-end"` for horizontal placement so it mirrors; `"left"` / `"right"` are still accepted but physical, so they do not flip. Prefer the logical sides.
- Text follows the document `dir`. No built-in strings.

## Styling & tokens

- Inverted surface: `bg-foreground`, `text-background`, `rounded-control`, `text-caption`, `max-w-64`.
- Motion: 150ms opacity via `data-starting-style` / `data-ending-style`.
- Target `[data-slot=tooltip-content]`.

## Do / Don't

- **Do** keep tooltips to a few words.
- **Do** pair an icon-only button's tooltip with the same `aria-label`.
- **Don't** put essential or interactive content in a tooltip.
- **Don't** attach a tooltip to a non-focusable element.

## Related

- [Button](../button/README.md) · [DropdownMenu](../dropdown-menu/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-overlays-tooltip--docs
