---
name: hover-card
title: HoverCard
category: overlays
status: stable
summary: Rich preview card shown when a link is hovered or focused, for sighted pointer users. Wraps Base UI PreviewCard.
exports: [HoverCard, HoverCardTrigger, HoverCardContent, HoverCardContentProps]
related: [popover, tooltip, avatar]
story: components-overlays-hover-card
base-ui: [preview-card]
keywords: [hover card, preview, preview card, link preview, profile]
---

# HoverCard

A floating card that previews the destination of a link (a user profile, an issue summary) while the pointer
rests on it or the link has keyboard focus. Built on Base UI `PreviewCard`. The preview is a convenience only:
the trigger must be a real link that works without it.

## When to use

- Previewing a linked entity (person, issue, repo) inline in text.

## When not to use

- Content people must reach on touch or that holds actions: use a [`Popover`](../popover/README.md).
- A short label: use a [`Tooltip`](../tooltip/README.md).

## Import

```tsx
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@fadymondy/nasaq/web";

export function Mention() {
  return (
    <HoverCard>
      <HoverCardTrigger render={<a href="/people/sara" />}>@sara</HoverCardTrigger>
      <HoverCardContent>
        <p className="text-body-sm font-semibold">Sara Al-Harbi</p>
        <p className="text-caption text-muted-foreground">Design lead</p>
      </HoverCardContent>
    </HoverCard>
  );
}
```

## Anatomy

```
HoverCard                 Base UI PreviewCard.Root
├─ HoverCardTrigger       Base UI PreviewCard.Trigger (an <a>; use render={<a href />})
└─ HoverCardContent       Portal + positioner + popup   data-slot="hover-card-content"
```

## API

`HoverCard` = `PreviewCard.Root`, `HoverCardTrigger` = `PreviewCard.Trigger`.

| Export | Common props |
| --- | --- |
| `HoverCard` | `open?`, `defaultOpen?`, `onOpenChange?` |
| `HoverCardTrigger` | `delay?` (ms before open), `closeDelay?` (ms before close), `render?` |

### `HoverCardContent`

`HoverCardContentProps` extends Base UI `PreviewCard.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `PreviewCard.Positioner` `side` | `"bottom"` | Side of the trigger. Use `inline-start` / `inline-end` to mirror in RTL. |
| `align?` | `"start" \| "center" \| "end"` | `"center"` | Alignment against the trigger. |
| `sideOffset?` | `number` | `6` | Gap to the trigger in px. |
| `className?` | `string` | none | Merged onto the popup (`w-72` by default). |

## Examples

### Faster open, Arabic

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@fadymondy/nasaq/web";

export function MentionAr() {
  return (
    <p dir="rtl" lang="ar">
      أُسندت إلى{" "}
      <HoverCard>
        <HoverCardTrigger delay={200} render={<a href="/people/sara" />}>@سارة</HoverCardTrigger>
        <HoverCardContent align="start">
          <p className="text-body-sm font-semibold">سارة الحربي</p>
          <p className="text-caption text-muted-foreground">مسؤولة التصميم</p>
        </HoverCardContent>
      </HoverCard>
    </p>
  );
}
```

## Accessibility

The card opens on pointer hover and on keyboard focus of the trigger, and closes on blur, pointer leave and `Esc`.
It is hidden from touch and is not announced as a dialog, so never put the only route to information or an
action in it.

| Key | Action |
| --- | --- |
| `Tab` to the trigger | Opens the card after the delay. |
| `Esc` | Closes the card. |

- The trigger must be a real link with meaningful text.
- Localise all card copy.

## RTL & i18n

- Placement follows `dir`; prefer `inline-*` sides and `align="start"`.
- No built-in strings.

## Styling & tokens

- Same surface as Popover: `bg-popover`, `border-border`, `rounded-floating`, `shadow-floating`.
- State attributes: `data-starting-style`, `data-ending-style`, `data-side`.
- Extend with `className`; no raw hex.

## Do / Don't

- **Do** keep the card read-only and small.
- **Don't** put buttons or forms in it; use a `Popover`.
- **Don't** rely on it for information needed on touch.

## Related

- [Popover](../popover/README.md) · [Tooltip](../tooltip/README.md) · [Avatar](../avatar/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-overlays-hover-card--docs
