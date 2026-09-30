---
name: scroll-area
title: ScrollArea
category: layout
status: beta
summary: A bounded scroll container with a thin scrollbar on the inline-end edge, keyboard-scrollable and RTL-aware.
exports: [ScrollArea, ScrollBar, ScrollAreaProps]
related: [table, data-table, sheet, dropdown-menu]
story: components-layout-scroll-area
base-ui: [scroll-area]
keywords: [scroll, scrollbar, overflow, viewport, list, panel, sidebar]
---

# ScrollArea

A container that scrolls when its content is larger than the box you give it, with a slim scrollbar that
fades in on hover and while scrolling. It replaces the platform scrollbar with one that looks the same in every
browser, and it keeps the vertical bar on the inline-end edge, so in RTL it sits on the left.

## When to use

- A fixed-height panel, a long list inside a card, a code block, a sidebar section.
- A row that must scroll sideways without a native scrollbar.

## When not to use

- The page itself: let the document scroll.
- Content that should simply grow: don't bound it.
- Tables that need sticky headers: use `Table` / `DataTable`.

## Import

```tsx
import { ScrollArea } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ScrollArea } from "@fadymondy/nasaq/web";

export function Notes({ items }: { items: string[] }) {
  return (
    <ScrollArea aria-label="Notes" className="h-64 w-72 rounded-card border border-border">
      <ul className="flex flex-col gap-2 p-3 text-body-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </ScrollArea>
  );
}
```

## Anatomy

```
<ScrollArea>            data-slot="scroll-area"            bound its size with className
├─ viewport             data-slot="scroll-area-viewport"   role="region", focusable
├─ <ScrollBar>          data-slot="scroll-area-scrollbar"  vertical and/or horizontal
│  └─ thumb             data-slot="scroll-area-thumb"
└─ corner               data-slot="scroll-area-corner"     only with orientation="both"
```

## API

### ScrollArea (`ScrollAreaProps`)

All Base UI `ScrollArea.Root` props, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orientation` | `"vertical" \| "horizontal" \| "both"` | `"vertical"` | Which axes get a scrollbar. |
| `viewportClassName` | `string` | none | Classes for the viewport. |
| `aria-label` | `string` | none | Name of the scroll region. Provide it and localise it. |

### ScrollBar

All Base UI `ScrollArea.Scrollbar` props. `orientation` defaults to `"vertical"`. Only needed when composing manually.

## Examples

Horizontal strip in Arabic:

```tsx
import { ScrollArea } from "@fadymondy/nasaq/web";

export function Tags() {
  return (
    <ScrollArea orientation="horizontal" aria-label="الوسوم" className="w-64">
      <div className="flex w-max gap-2 pb-3">
        {["تصميم", "برمجة", "تسويق", "مبيعات", "دعم", "مالية"].map((t) => (
          <span key={t} className="rounded-full bg-secondary px-3 py-1 text-caption">{t}</span>
        ))}
      </div>
    </ScrollArea>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Focuses the scroll region. |
| Arrow keys, Page Up/Down, Home/End | Scroll the focused region. |

- The viewport is `role="region"` and focusable, so keyboard users can reach overflowing content that has no
  focusable child. Give it an `aria-label` and translate it.
- The scrollbar is a visual aid; it is not focusable.

## RTL & i18n

The vertical scrollbar uses `end-0`, so it is on the right in LTR and the left in RTL. Horizontal content starts at the
inline start and scrolls toward the inline end.

## Styling & tokens

Thumb `bg-nq-line-strong`, focus ring `nq-focus`. State attributes on the scrollbar: `data-hovering`, `data-scrolling`.
On the root and viewport: `data-has-overflow-x`, `data-has-overflow-y`, `data-overflow-y-start`, `data-overflow-y-end`
(useful for edge fades). `className` merges onto the root.

## Do / Don't

- Do set a height or width on the root, otherwise nothing overflows.
- Don't nest scroll areas on the same axis.

## Related

[table](../table/README.md), [sheet](../sheet/README.md), [dropdown-menu](../dropdown-menu/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-scroll-area--docs
