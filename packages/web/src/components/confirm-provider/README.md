---
name: confirm-provider
title: ConfirmProvider
category: overlays
status: beta
summary: One app-wide confirm dialog you can await from any handler, so `if (!(await confirm({ title }))) return;` replaces window.confirm with a styled, localised AlertDialog.
exports: [ConfirmProvider, ConfirmProviderProps, useConfirm, ConfirmOptions, ConfirmFn]
related: [alert-dialog, dialog, toast]
story: components-overlays-confirm-provider
base-ui: [alert-dialog]
keywords: [confirm, are you sure, dialog, await, promise, delete, destructive, window.confirm]
---

# ConfirmProvider

Mount it once, then call `useConfirm()` anywhere. `confirm(options)` opens an `AlertDialog` and resolves
`true` or `false`, so the code that deletes stays in one handler.

## When to use

- Handlers that need a "yes" first: delete from a menu, leave with unsaved changes, bulk actions.
- When the trigger is not a button you render (a keyboard shortcut, a context menu, a table action).

## When not to use

- One button that confirms before it acts: use `ConfirmButton` from [`AlertDialog`](../alert-dialog/README.md).
- Undoable actions: act at once and offer Undo in a [`Toast`](../toast/README.md).
- Dialogs with fields: use [`Dialog`](../dialog/README.md).

## Import

```tsx
import { ConfirmProvider, useConfirm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, ConfirmProvider, NasaqProvider, useConfirm } from "@fadymondy/nasaq/web";

declare function deleteProject(id: string): Promise<void>;

function DeleteProject({ id, name }: { id: string; name: string }) {
  const confirm = useConfirm();
  async function onDelete() {
    if (!(await confirm({ title: `Delete ${name}?`, description: "Its tasks and files are deleted too. This can't be undone.", confirmLabel: "Delete" }))) return;
    await deleteProject(id);
  }
  return <Button variant="danger" onClick={onDelete}>Delete</Button>;
}

export function App() {
  return (
    <NasaqProvider>
      <ConfirmProvider>
        <DeleteProject id="p1" name="Billing" />
      </ConfirmProvider>
    </NasaqProvider>
  );
}
```

## Anatomy

```
ConfirmProvider
├─ children
└─ AlertDialog                  data-slot="confirm-dialog"
   ├─ title, description
   └─ Cancel, Confirm           Confirm is danger unless `danger: false`
```

## API

**ConfirmProvider**: `{ children }`. Place it inside `NasaqProvider`.

**useConfirm(): ConfirmFn**: throws when there is no provider above.

**ConfirmOptions**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The question. Name what is affected. |
| `description` | `ReactNode` | | What happens, and whether it can be undone. |
| `confirmLabel` | `ReactNode` | "Confirm" | Use the verb: "Delete", "Leave". |
| `cancelLabel` | `ReactNode` | "Cancel" | |
| `danger` | `boolean` | `true` | `false` styles Confirm as primary. |

The promise resolves `false` on Cancel, Escape or a click outside. A new `confirm()` while one is open
resolves the first with `false`.

## Accessibility

- It is an `AlertDialog`: focus moves into it, starts on Cancel, and returns to the trigger on close.
- The title and description name the dialog.

## RTL & i18n

- Default button labels follow the Nasaq locale (English and Arabic). Pass localised `title` and `description`.

## Styling & tokens

- Inherits `AlertDialog` and `Button`. Target `[data-slot="confirm-dialog"]`.

## Do / Don't

- Do write the consequence in `description`.
- Do label Confirm with the verb, not "OK".
- Don't confirm things that can be undone; that teaches people to click through.

## Related

- [`AlertDialog`](../alert-dialog/README.md)
- [`Dialog`](../dialog/README.md)
- [`Toast`](../toast/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-overlays-confirm-provider--docs
