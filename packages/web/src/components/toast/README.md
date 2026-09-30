---
name: toast
title: Toaster
category: feedback
status: stable
summary: Transient notifications. A themed, RTL-aware Sonner Toaster plus the re-exported toast() function.
exports: [Toaster, toast]
related: [dialog, notification-item, status, button]
story: components-feedback-toast
base-ui: []
keywords: [toast, notification, snackbar, feedback, sonner, undo]
---

# Toaster

Short-lived feedback after an action ("Project renamed", "Could not reach the server"). It wraps
[Sonner](https://sonner.emilkowal.ski): `Toaster` mounts the stack, themed from Nasaq tokens, and
`toast` is Sonner's function, re-exported. **You must mount `<Toaster />` yourself, once, near the app root**: without it `toast()` shows nothing.

## When to use

- Confirming a completed action, or reporting a background failure.
- A reversible action with an "Undo" button.

## When not to use

- Errors the user must fix in a form: show them on the field.
- Anything the user must decide on: use [`Dialog`](../dialog/README.md).
- Persistent notifications: use [`NotificationItem`](../notification-item/README.md) in a [`Sheet`](../sheet/README.md).

## Import

```tsx
import { Toaster, toast } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Toaster, toast } from "@fadymondy/nasaq/web";

export function App() {
  return (
    <>
      <Button onClick={() => toast.success("Invoice sent")}>Send invoice</Button>
      <Toaster />
    </>
  );
}
```

`Toaster` is not mounted for you by `NasaqProvider` or `AppShell`; render it yourself, exactly once (two mounted Toasters show every toast twice).

## Anatomy

```
Toaster                     Sonner Toaster (fixed stack, bottom inline-end)
└─ toast                    Sonner toast, styled via toastOptions.classNames
   ├─ icon                  [data-icon], coloured for success / error / warning
   ├─ title
   ├─ description
   └─ action / cancel       buttons
```

There is no Nasaq `data-slot`; Sonner's own attributes (`data-sonner-toast`, `data-type`) apply.

## API

### `Toaster`

`ComponentProps<typeof Sonner>`: all Sonner `Toaster` props pass through (`duration`, `visibleToasts`,
`closeButton`, `expand`, `richColors`, `offset`, `toastOptions`, ...). Set from Nasaq context (when a
`NasaqProvider` is present):

| Prop | Value | Description |
| --- | --- | --- |
| `theme` | `resolvedTheme` or `"system"` | Follows the Nasaq light/dark theme. |
| `dir` | `"rtl"` or `"ltr"` | Follows `isRtl`. |
| `position` | `"bottom-left"` in RTL, else `"bottom-right"` | Inline-end corner. |
| `containerAriaLabel` | `"Notifications"` or `"الإشعارات"` | Accessible name of the toast region; Arabic when the Nasaq locale starts with `ar`. |
| `toastOptions` | Nasaq `classNames`, merged with yours | Themed surface, description, action, cancel and status icon colours. |

Props you pass are spread after these defaults and override them. `toastOptions` is the exception: your
other options (`duration`, `style`, ...) pass through, and each of your `toastOptions.classNames` entries is
merged (`cn`) after the Nasaq class for the same slot, so you extend the theme instead of wiping it.

### `toast`

Sonner's function, unchanged.

| Call | Use |
| --- | --- |
| `toast(message, options?)` | Neutral. |
| `toast.success(message)` | Success (icon uses `nq-success-text`). |
| `toast.error(message)` | Error (icon uses `nq-danger-text`). |
| `toast.warning(message)` | Warning (icon uses `nq-warning-text`). |
| `toast.info(message)` | Info. |
| `toast.loading(message)` | Pending state. |
| `toast.promise(promise, { loading, success, error })` | Follows a promise. |
| `toast.dismiss(id?)` | Dismisses one or all. |

Common `options`: `description`, `duration`, `id`, `action: { label, onClick }`, `cancel: { label, onClick }`.

## Examples

### Undo action

```tsx
import { Button, Toaster, toast } from "@fadymondy/nasaq/web";

export function DeleteWithUndo() {
  return (
    <>
      <Button
        onClick={() =>
          toast("Issue deleted", { action: { label: "Undo", onClick: () => toast("Restored") } })
        }
      >
        Delete issue
      </Button>
      <Toaster />
    </>
  );
}
```

### Promise, Arabic copy

```tsx
import { Button, Toaster, toast } from "@fadymondy/nasaq/web";

export function SendAr() {
  return (
    <>
      <Button
        variant="primary"
        onClick={() =>
          toast.promise(new Promise((r) => setTimeout(r, 1200)), {
            loading: "جارٍ الإرسال…",
            success: "تم إرسال الفاتورة",
            error: "تعذّر الاتصال بالخادم",
          })
        }
      >
        إرسال الفاتورة
      </Button>
      <Toaster />
    </>
  );
}
```

## Accessibility

Sonner renders a labelled `<section aria-live="polite">` region; each toast is announced by screen readers.

| Key | Action |
| --- | --- |
| `Alt+T` | Focuses the toast region (Sonner default hotkey). |
| `Tab` | Moves to the action / cancel / close buttons of a toast. |

- Toasts auto-dismiss; do not rely on them for anything the user must read. Persist important results elsewhere.
- Every status toast should carry text, not only an icon or colour.
- The region label is localised through `containerAriaLabel` ("Notifications" / "الإشعارات"); pass your own to override.
- Localise the message, action and cancel labels.

## RTL & i18n

- With `NasaqProvider`, the stack moves to the bottom-left in RTL and toast content flows right to left.
- Without a provider it defaults to LTR, bottom-right.
- The only built-in string is the region label (`containerAriaLabel`), English or Arabic by Nasaq locale.

## Styling & tokens

- Surface: `bg-popover`, `text-popover-foreground`, `border-border`, `rounded-floating`, `text-body-sm`. Shadow: `shadow-floating`, as other overlays.
- Action button: `bg-primary`; cancel: `bg-secondary`. Icon colours: `nq-success-text`, `nq-danger-text`, `nq-warning-text`.
- Sonner classes are overridden with `!` important modifiers. Extend through `toastOptions.classNames` (merged with ours) or `className`.

## Do / Don't

- **Do** keep messages short and specific ("Invoice sent").
- **Do** offer Undo instead of a confirm dialog for reversible actions.
- **Don't** use toasts for errors that need action; keep them inline.
- **Don't** fire several toasts for one action.
- **Don't** mount more than one `<Toaster />`.

## Related

- [Dialog](../dialog/README.md) · [NotificationItem](../notification-item/README.md) · [Status](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-feedback-toast--docs
