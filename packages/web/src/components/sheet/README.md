---
name: sheet
title: Sheet
category: overlays
status: stable
summary: Side-over panel that slides from the inline-start, inline-end or bottom edge, with header, scrolling body and footer. Wraps Base UI Dialog.
exports: [Sheet, SheetTrigger, SheetClose, SheetBackdrop, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SheetContentProps]
related: [dialog, button, notification-item, app-shell]
story: components-overlays-sheet
base-ui: [dialog]
keywords: [drawer, side panel, sheet, slide-over, bottom sheet, notifications]
---

# Sheet

A panel that slides in from an edge of the screen. Use it for editing a record, filters, or a notification
list, where a centred dialog would be too small. Sides are **logical**: `end` is the right edge in LTR and
the left edge in RTL. It is built on Base UI `Dialog`, so it is modal with a focus trap.

## When to use

- A form with several fields, a detail view, filters, or a notifications list.
- Mobile action panels (`side="bottom"`).

## When not to use

- A short confirmation or one field: use [`Dialog`](../dialog/README.md).
- A list of actions: use [`DropdownMenu`](../dropdown-menu/README.md).
- Permanent side content: use the layout in [`AppShell`](../app-shell/README.md).

## Import

```tsx
import {
  Sheet, SheetTrigger, SheetClose, SheetContent,
  SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Button, Field, FieldLabel, Input, Sheet, SheetBody, SheetClose, SheetContent,
  SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@fadymondy/nasaq/web";

export function EditProject() {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>Edit project</SheetTrigger>
      <SheetContent side="end">
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>Changes save when you press Save.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 p-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue="Nasaq" />
          </Field>
        </SheetBody>
        <SheetFooter className="justify-end">
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <SheetClose render={<Button variant="primary" />}>Save</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

## Anatomy

```
Sheet                            Base UI Dialog.Root
├─ SheetTrigger                  Base UI Dialog.Trigger
└─ SheetContent                  data-slot="sheet-content", data-side="end|start|bottom"
   ├─ SheetBackdrop              data-slot="sheet-backdrop" (rendered for you)
   ├─ SheetHeader                data-slot="sheet-header"
   │  ├─ SheetTitle              data-slot="sheet-title"
   │  └─ SheetDescription        data-slot="sheet-description"
   ├─ SheetBody                  data-slot="sheet-body"  (scrolls)
   ├─ SheetFooter                data-slot="sheet-footer"
   │  └─ SheetClose              Base UI Dialog.Close
   └─ close (×) button           data-slot="sheet-close" (when showClose)
```

## API

### `Sheet`, `SheetTrigger`, `SheetClose`

Aliases of Base UI `Dialog.Root`, `Dialog.Trigger`, `Dialog.Close`. `Sheet` takes `open`, `defaultOpen`,
`onOpenChange`, `modal`, `disablePointerDismissal`. `SheetTrigger` and `SheetClose` accept `render`.

### `SheetContent`

`SheetContentProps` extends Base UI `Dialog.Popup` props and the `side` variant.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `"end" \| "start" \| "bottom"` | `"end"` | Edge the sheet slides from. Logical, so it mirrors in RTL. |
| `showClose?` | `boolean` | `true` | Renders the × button at the top inline-end corner. |
| `closeLabel?` | `string` | `"Close"` / `"إغلاق"` by locale | `aria-label` for the × button. Defaults from the Nasaq locale (`ar*` gives Arabic); pass your own to override. |
| `className?` | `string` | none | Merged onto the popup. |

Sizes: `start` / `end` are `h-dvh`, `w-[min(24rem,100vw)]`. `bottom` is full width, `max-h-[85dvh]`, with rounded top corners.

### `SheetBackdrop`

Takes Base UI `Dialog.Backdrop` props. Rendered by `SheetContent`; exported for custom compositions.

### `SheetHeader`, `SheetBody`, `SheetFooter`

`ComponentProps<"div">`. The header has a bottom border and `pe-12` for the close button. The body is
`flex-1 overflow-y-auto overscroll-contain` with no padding (add your own). The footer is a bordered row
with `gap-2`; add `justify-end` to align actions.

### `SheetTitle`, `SheetDescription`

Base UI `Dialog.Title` / `Dialog.Description`, styled with `text-label` and `text-caption`.

## Examples

### Each side

```tsx
import {
  Button, Sheet, SheetBody, SheetContent, SheetDescription,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@fadymondy/nasaq/web";

export function Sides() {
  return (
    <div className="flex gap-3">
      {(["end", "start", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button />}>Open {side}</SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow the list.</SheetDescription>
            </SheetHeader>
            <SheetBody className="p-4">Content</SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}
```

### Arabic, controlled

```tsx
import { Button, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function NotificationsAr() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>الإشعارات</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent closeLabel="إغلاق">
          <SheetHeader>
            <SheetTitle>الإشعارات</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-4">لا توجد إشعارات جديدة.</SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

## Accessibility

Same as Dialog (Base UI): `role="dialog"`, modal, focus trapped and restored, background inert.

| Key | Action |
| --- | --- |
| `Esc` | Closes the sheet. |
| `Tab` / `Shift+Tab` | Cycles focus inside the sheet. |
| `Enter` / `Space` | Activates the focused button. |

- Always render a `SheetTitle` (accessible name).
- The × button uses `aria-label={closeLabel}` (default "Close" / "إغلاق" by Nasaq locale).

## RTL & i18n

- `end` and `start` use `end-0` / `start-0`, logical borders, and a reversed slide offset under `rtl:`, so the sheet enters from the correct edge in both directions.
- `bottom` does not depend on direction.
- The only built-in string is the default `closeLabel`: "Close" in English, "إغلاق" when the Nasaq locale starts with `ar`.

## Styling & tokens

- Surface level 3 (`bg-popover`), `shadow-floating`, `border-border`, `rounded-t-floating` (bottom).
- Motion: 200ms translate (2rem) plus opacity. Backdrop `bg-nq-fg/10`, dark `bg-nq-bg/60`.
- Target `[data-slot=sheet-content][data-side=end]`, `[data-slot=sheet-backdrop]`.

## Do / Don't

- **Do** use the header / body / footer parts so long content scrolls while actions stay visible.
- **Do** prefer `end` for detail and edit panels, `bottom` for mobile.
- **Don't** hard-code `left` / `right`; use `start` / `end`.
- **Don't** use a sheet for a one-line confirmation.

## Related

- [Dialog](../dialog/README.md) · [Button](../button/README.md) · [AppShell](../app-shell/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-sheet--docs
