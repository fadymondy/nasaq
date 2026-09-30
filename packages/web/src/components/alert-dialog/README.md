---
name: alert-dialog
title: AlertDialog
category: overlays
status: stable
summary: Modal that interrupts to ask for an explicit answer before a consequential action, plus a ConfirmButton shorthand. Wraps Base UI AlertDialog.
exports: [AlertDialog, AlertDialogTrigger, AlertDialogClose, AlertDialogBackdrop, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogActionProps, ConfirmButton, ConfirmButtonProps]
related: [dialog, button, toast, sheet]
story: components-overlays-alert-dialog
base-ui: [alert-dialog]
keywords: [confirm, destructive, delete, are you sure, modal, interrupt]
---

# AlertDialog

A modal that stops the user to confirm something consequential: deleting a project, discarding changes, publishing to
every customer. Unlike [`Dialog`](../dialog/README.md) it has no × button and an outside press does not close it, so the
only ways out are the two buttons (or `Esc`, which cancels). `ConfirmButton` is the shorthand for the common case: a
button that asks first.

## When to use

- A destructive or hard-to-undo action ("Delete this project?").
- A choice that affects other people or money, where an accidental click is costly.

## When not to use

- A small form or a non-critical prompt: use [`Dialog`](../dialog/README.md).
- Feedback after an action ("Deleted"): use [`toast`](../toast/README.md); prefer undo over confirm when the action is reversible.
- Every click. Confirm dialogs used on routine actions train people to click through them.

## Import

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, ConfirmButton } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ConfirmButton } from "@fadymondy/nasaq/web";

export function DeleteProject({ onDelete }: { onDelete: () => void }) {
  return (
    <ConfirmButton
      title="Delete this project?"
      description="Issues and files are removed. This cannot be undone."
      confirmLabel="Delete"
      onConfirm={onDelete}
    >
      Delete project
    </ConfirmButton>
  );
}
```

## Anatomy

```
AlertDialog                          Base UI AlertDialog.Root (no DOM)
├─ AlertDialogTrigger                Base UI AlertDialog.Trigger (use render={<Button />})
└─ AlertDialogContent                Portal + backdrop + popup   data-slot="alert-dialog-content"
   ├─ AlertDialogBackdrop            data-slot="alert-dialog-backdrop" (rendered for you)
   ├─ AlertDialogHeader              data-slot="alert-dialog-header"
   │  ├─ AlertDialogTitle            data-slot="alert-dialog-title"
   │  └─ AlertDialogDescription      data-slot="alert-dialog-description"
   └─ AlertDialogFooter              data-slot="alert-dialog-footer"
      ├─ AlertDialogCancel           data-slot="alert-dialog-cancel"
      └─ AlertDialogAction           data-slot="alert-dialog-action"
```

## API

### `AlertDialog`, `AlertDialogTrigger`, `AlertDialogClose`

Aliases of Base UI `AlertDialog.Root`, `.Trigger`, `.Close`. Common `AlertDialog` props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open?` | `boolean` | none | Controlled open state. |
| `defaultOpen?` | `boolean` | `false` | Initial state when uncontrolled. |
| `onOpenChange?` | `(open: boolean, details) => void` | none | Called when it opens or closes. |

Base UI fixes `modal` to true and disables outside-press dismissal.

### `AlertDialogContent`

Base UI `AlertDialog.Popup` props. The popup is `max-w-md`, centred, and scrolls if taller than the viewport. It has no close (×) button.

### `AlertDialogAction`, `AlertDialogCancel`

`AlertDialogActionProps` extends Base UI `AlertDialog.Close` props. Both close the dialog when pressed.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"primary" \| "danger" \| "secondary" \| "ghost"` | `"danger"` (action), `"ghost"` (cancel) | Button look, from `buttonVariants`. |
| `onClick?` | `MouseEventHandler` | none | Run the confirmed work here. |

### `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`

Same shape as the Dialog parts. The footer is a reversed column on mobile and an end-aligned row from `sm`.

### `ConfirmButton`

`ConfirmButtonProps` extends `Button` props (minus `title`, `onClick`, `children`), so `size`, `disabled` and `className` apply to the trigger.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | The trigger button's label. |
| `title` | `ReactNode` | required | The question. Name what is affected. |
| `description?` | `ReactNode` | none | What happens and whether it can be undone. |
| `confirmLabel?` | `ReactNode` | the trigger label if it is a string, else `"Confirm"` / `"تأكيد"` | Label of the confirming button. |
| `cancelLabel?` | `ReactNode` | `"Cancel"` / `"إلغاء"` | Label of the cancel button. |
| `variant?` | `ButtonProps["variant"]` | `"danger"` | Look of the trigger and the confirm button. |
| `onConfirm` | `() => void \| Promise<unknown>` | required | Runs on confirm. A promise keeps the dialog open with a loading confirm button; it closes on resolve and stays open on reject. |

## Examples

### Composed by hand

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Button,
} from "@fadymondy/nasaq/web";

export function DiscardChanges({ onDiscard }: { onDiscard: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="secondary" />}>Discard</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>Your edits to this page will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Async confirm, Arabic copy

```tsx
import { ConfirmButton } from "@fadymondy/nasaq/web";

export function PublishAr({ publish }: { publish: () => Promise<void> }) {
  return (
    <ConfirmButton
      variant="primary"
      title="نشر الإصدار؟"
      description="سيظهر الإصدار لجميع العملاء."
      confirmLabel="نشر"
      cancelLabel="إلغاء"
      onConfirm={publish}
    >
      نشر الإصدار
    </ConfirmButton>
  );
}
```

## Accessibility

Provided by Base UI AlertDialog: `role="alertdialog"`, modal, focus is trapped, page content is inert, and focus
returns to the trigger on close.

| Key | Action |
| --- | --- |
| `Esc` | Cancels and closes. |
| `Tab` / `Shift+Tab` | Cycles focus inside the dialog. |
| `Enter` / `Space` | Activates the focused button. |

- Always render `AlertDialogTitle` and `AlertDialogDescription`; they name and describe the dialog.
- Put `AlertDialogCancel` first in the footer so it takes initial focus and `Enter` never confirms by accident.
- Localise `title`, `description`, `confirmLabel` and `cancelLabel` yourself; only the default cancel/confirm labels are built in.

## RTL & i18n

- Header text uses `text-start`; the footer aligns with `sm:justify-end`, so both follow `dir`.
- Built-in strings (`ConfirmButton` only): "Cancel" / "إلغاء" and "Confirm" / "تأكيد", chosen when the Nasaq locale starts with `ar`.

## Styling & tokens

- Surface level 3: `bg-popover`, `text-popover-foreground`, `border-border`, `rounded-floating`. Backdrop `bg-nq-fg/15` (light), `bg-nq-bg/60` (dark).
- Motion: opacity only, 150ms, via `data-starting-style` / `data-ending-style`.
- Target `[data-slot=alert-dialog-content]`, `-backdrop`, `-header`, `-footer`, `-title`, `-description`, `-action`, `-cancel`. Extend with `className`.

## Do / Don't

- **Do** phrase the title as the question and name what is affected; make the action label a verb ("Delete"), not "OK".
- **Do** use `variant="danger"` for destructive actions.
- **Don't** put forms or long content in it; use [`Dialog`](../dialog/README.md).
- **Don't** confirm reversible actions; offer undo in a [`toast`](../toast/README.md).

## Related

- [Dialog](../dialog/README.md) · [Button](../button/README.md) · [Toast](../toast/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-overlays-alert-dialog--docs
