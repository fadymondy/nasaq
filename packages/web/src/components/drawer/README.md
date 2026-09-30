---
name: drawer
title: Drawer
category: overlays
status: beta
summary: Mobile bottom sheet on Base UI Dialog with a drag handle and swipe-down-to-close; snaps back below the threshold and respects reduced motion.
exports: [Drawer, DrawerTrigger, DrawerClose, DrawerBackdrop, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle, DrawerDescription, DrawerProps, DrawerContentProps]
related: [sheet, dialog, popover]
story: components-overlays-drawer
base-ui: [dialog]
keywords: [drawer, bottom sheet, mobile, swipe, drag handle, modal]
---

# Drawer

A modal panel that slides up from the bottom edge, made for touch screens. It has a drag handle: drag it down and the drawer follows your finger. Release past 30% of its height, or with a quick flick, and it closes; release earlier and it snaps back. It is a Base UI Dialog, so focus is trapped, `Esc` and the backdrop close it, and the title and description are wired for screen readers.

## Drawer versus Sheet

| | Drawer | Sheet |
| --- | --- | --- |
| Edge | Bottom only | `end`, `start` or `bottom` |
| Gesture | Drag handle, swipe down to close | None; buttons, `Esc`, backdrop |
| Best for | Mobile actions, pickers, short forms | Desktop side panels, settings, notifications |
| Width | Full width, up to `max-w-xl`, centred | 24rem side panel |

Pick **Drawer** when the primary device is a phone and the user expects to swipe it away. Pick **Sheet** for side-over panels on wide screens; its `side="bottom"` variant is a static panel without the gesture. Both can be used in one app: `Sheet` at `md` and up, `Drawer` below.

## When to use

- Contextual actions, filters or a short form on mobile.
- Any bottom panel that should feel native to a touch UI.

## When not to use

- A side panel or a desktop-first surface: use [`Sheet`](../sheet/README.md).
- A blocking question or a confirmation: use `Dialog` or `AlertDialog`.
- Small anchored content: use [`Popover`](../popover/README.md).

## Import

```tsx
import { Drawer, DrawerContent /* … */ } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Button, Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@fadymondy/nasaq/web";

export function Example() {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="secondary" />}>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit project</DrawerTitle>
          <DrawerDescription>Drag the handle down to dismiss.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="p-4">Content</DrawerBody>
        <DrawerFooter className="justify-end">
          <DrawerClose render={<Button variant="ghost" />}>Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

## Anatomy

```
Drawer                        state owner (open / defaultOpen / onOpenChange), Base UI Dialog.Root
├─ DrawerTrigger              Dialog.Trigger
└─ DrawerContent              data-slot="drawer-content", data-dragging while dragging   (portal + backdrop + popup)
   ├─ handle                  data-slot="drawer-handle"     the only drag surface
   ├─ DrawerHeader            data-slot="drawer-header"
   │  ├─ DrawerTitle          data-slot="drawer-title"
   │  └─ DrawerDescription    data-slot="drawer-description"
   ├─ DrawerBody              data-slot="drawer-body"       scrolls
   ├─ DrawerFooter            data-slot="drawer-footer"
   └─ close button            data-slot="drawer-close"
```

## API

### `Drawer`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open?` | `boolean` | uncontrolled | Controlled open state. |
| `defaultOpen?` | `boolean` | `false` | Initial state when uncontrolled. |
| `onOpenChange?` | `(open: boolean) => void` | none | Called on every open or close, including swipe. |
| `children?` | `ReactNode` | none | Trigger and content. |

### `DrawerContent`

`DrawerContentProps extends ComponentProps<typeof BaseDialog.Popup>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `showHandle?` | `boolean` | `true` | Shows the handle and enables swipe-down-to-close. |
| `showClose?` | `boolean` | `true` | Shows the × button. |
| `closeLabel?` | `string` | `"Close"` / `"إغلاق"` by locale | Accessible name of the × button. |
| `className?` | `string` | none | Merged onto the popup. |

`DrawerTrigger` and `DrawerClose` are the Base UI `Dialog.Trigger` and `Dialog.Close` (use `render` to make them Buttons). `DrawerHeader`, `DrawerBody`, `DrawerFooter` are `div`s; `DrawerTitle` and `DrawerDescription` wrap the Base UI parts.

## Examples

### Controlled

```tsx
import { Button, Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>افتح الدرج</Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent closeLabel="إغلاق">
          <DrawerHeader>
            <DrawerTitle>تعديل المشروع</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Esc` | Closes the drawer. |
| `Tab` / `Shift+Tab` | Cycles focus inside the drawer (trapped). |
| `Enter` / `Space` on the × button | Closes it. |

- Swiping is a pointer-only enhancement. The handle is `aria-hidden`; the × button, `Esc` and the backdrop are the accessible ways to close.
- Only the handle drags, so scrolling the body never closes the drawer by accident.
- With `prefers-reduced-motion: reduce`, the slide animations are off and a swipe past the threshold closes immediately.
- Give every drawer a `DrawerTitle`. Localise `closeLabel` for languages other than English and Arabic.

## RTL & i18n

- The drawer is centred on the bottom edge and lays out logically; the × button and header padding sit on the inline end.
- Built-in string: the close label, `"Close"` or `"إغلاق"` by provider locale.

## Styling & tokens

- Surface `bg-popover` with `border-border`, `rounded-t-floating` and `shadow-floating`; handle `bg-nq-line-strong`; backdrop tinted with `nq-fg` / `nq-bg`.
- State: `data-dragging` on `[data-slot=drawer-content]`; `data-starting-style` and `data-ending-style` from Base UI drive the enter and exit.
- Extend with `className`; never use raw hex.

## Do / Don't

- **Do** keep the content short; it is capped at 85% of the viewport height and the body scrolls.
- **Do** provide a visible Cancel or × for people who do not swipe.
- **Don't** put a drag-sensitive control (a slider) on the handle strip.
- **Don't** stack drawers.

## Related

- [Sheet](../sheet/README.md) · [Dialog](../dialog/README.md) · [Popover](../popover/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-drawer--docs
