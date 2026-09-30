---
name: dialog
title: Dialog
category: overlays
status: stable
summary: Modal dialog for short focused tasks and confirmations, with backdrop, focus trap and a built-in close button. Wraps Base UI Dialog.
exports: [Dialog, DialogTrigger, DialogClose, DialogBackdrop, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogContentProps]
related: [sheet, button, dropdown-menu, toast]
story: components-overlays-dialog
base-ui: [dialog]
keywords: [modal, dialog, confirm, prompt, overlay, destructive]
---

# Dialog

A centred modal for one short task: rename something, confirm a destructive action. It blocks the page
behind a backdrop, traps focus, and closes on `Esc` or an outside press. The parts are thin styled wrappers
over Base UI `Dialog`; `Dialog`, `DialogTrigger` and `DialogClose` are the Base UI parts unchanged.

## When to use

- A confirmation ("Delete this project?") or a small form (one to three fields).
- A decision the user must make before continuing.

## When not to use

- Editing a record with many fields, or content that should sit beside the page: use [`Sheet`](../sheet/README.md).
- A list of actions: use [`DropdownMenu`](../dropdown-menu/README.md).
- Feedback after an action ("Saved"): use [`toast`](../toast/README.md).

## Import

```tsx
import {
  Dialog, DialogTrigger, DialogClose, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@fadymondy/nasaq/web";

export function DeleteProject() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="danger" />}>Delete project</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this project?</DialogTitle>
          <DialogDescription>Issues, time entries and files are removed. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Keep project</DialogClose>
          <DialogClose render={<Button variant="danger" />}>Delete</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Anatomy

```
Dialog                          Base UI Dialog.Root (no DOM)
├─ DialogTrigger                Base UI Dialog.Trigger (a button; use render={<Button />})
└─ DialogContent                Portal + backdrop + popup   data-slot="dialog-content"
   ├─ DialogBackdrop            data-slot="dialog-backdrop" (rendered for you)
   ├─ DialogHeader              data-slot="dialog-header"
   │  ├─ DialogTitle            data-slot="dialog-title"
   │  └─ DialogDescription      data-slot="dialog-description"
   ├─ your content
   ├─ DialogFooter              data-slot="dialog-footer"
   │  └─ DialogClose            Base UI Dialog.Close
   └─ close (×) button          data-slot="dialog-close" (when showClose)
```

## API

### `Dialog`, `DialogTrigger`, `DialogClose`

Aliases of Base UI `Dialog.Root`, `Dialog.Trigger`, `Dialog.Close`. Common `Dialog` props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open?` | `boolean` | none | Controlled open state. |
| `defaultOpen?` | `boolean` | `false` | Initial state when uncontrolled. |
| `onOpenChange?` | `(open: boolean, details) => void` | none | Called when it opens or closes. |
| `modal?` | `boolean \| "trap-focus"` | `true` | Base UI modal behaviour. |
| `disablePointerDismissal?` | `boolean` | `false` | Ignore outside presses. |

`DialogTrigger` and `DialogClose` accept `render` to render as a `Button`.

### `DialogContent`

`DialogContentProps` extends Base UI `Dialog.Popup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `showClose?` | `boolean` | `true` | Renders the × button at the inline-end top corner. |
| `closeLabel?` | `string` | `"Close"` / `"إغلاق"` by locale | `aria-label` of the × button. Defaults from the Nasaq locale (`ar*` gives Arabic); pass your own to override. |
| `className?` | `string` | none | Merged onto the popup. |
| `children?` | `ReactNode` | none | Header, body, footer. |

The popup is `fixed inset-0 m-auto`, `max-w-lg`, `w-[calc(100%-2rem)]`, and scrolls when taller than the viewport.

### `DialogBackdrop`

Takes Base UI `Dialog.Backdrop` props. Rendered by `DialogContent`; exported for custom compositions.

### `DialogHeader`, `DialogFooter`

`ComponentProps<"div">`. The header reserves `pe-8` for the close button. The footer is a reversed column on
mobile and an end-aligned row from `sm`.

### `DialogTitle`, `DialogDescription`

Base UI `Dialog.Title` / `Dialog.Description` props. Base UI links them to the popup as its accessible name and description.

## Examples

### Small form

```tsx
import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, Field, FieldLabel, Input,
} from "@fadymondy/nasaq/web";

export function RenameProject() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="primary" />}>Rename project</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>The new name shows everywhere the project appears.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input defaultValue="Nasaq" />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <DialogClose render={<Button variant="primary" />}>Save</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Controlled, Arabic copy

```tsx
import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ConfirmAr() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>حذف المشروع</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel="إغلاق">
          <DialogHeader>
            <DialogTitle>حذف هذا المشروع؟</DialogTitle>
            <DialogDescription>ستُحذف المهام والملفات. لا يمكن التراجع.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>إبقاء المشروع</DialogClose>
            <DialogClose render={<Button variant="danger" />}>حذف</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Accessibility

Provided by Base UI Dialog: `role="dialog"`, modal, focus moves into the popup on open, is trapped, and
returns to the trigger on close. Content behind it is made inert.

| Key | Action |
| --- | --- |
| `Esc` | Closes the dialog. |
| `Tab` / `Shift+Tab` | Cycles focus inside the dialog. |
| `Enter` / `Space` | Activates the focused button (trigger, close, footer actions). |

- Always render a `DialogTitle` so the dialog has an accessible name; add a `DialogDescription` for context.
- The × button has `aria-label={closeLabel}`. The default follows the Nasaq locale ("Close" / "إغلاق"; English without a `NasaqProvider`).

## RTL & i18n

- The × button and header use logical properties (`end-3`, `pe-8`, `text-start`), so they flip in RTL.
- The footer row aligns to the end via `sm:justify-end`, which follows `dir`.
- The only built-in string is the default `closeLabel`: "Close" in English, "إغلاق" when the Nasaq locale starts with `ar`.

## Styling & tokens

- Surface level 3: `bg-popover`, `text-popover-foreground`, `border-border`, `rounded-floating`.
- Backdrop: `bg-nq-fg/15` (light), `bg-nq-bg/60` (dark).
- Motion: opacity only, 150ms (`data-starting-style` / `data-ending-style`). The dialog does not move.
- Target `[data-slot=dialog-content]`, `[data-slot=dialog-backdrop]`, `[data-slot=dialog-close]`.

## Do / Don't

- **Do** put the confirming action last in the footer; use `variant="danger"` for destructive ones and name what is destroyed.
- **Do** keep it short; move long forms to a [`Sheet`](../sheet/README.md).
- **Don't** nest dialogs.
- **Don't** use a dialog for success or error messages; use [`toast`](../toast/README.md).

## Related

- [Sheet](../sheet/README.md) · [Button](../button/README.md) · [Toast](../toast/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-dialog--docs
