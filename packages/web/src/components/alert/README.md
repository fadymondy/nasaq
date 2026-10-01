---
name: alert
title: Alert
category: alerts
status: stable
summary: Quiet inline notice with a tone (info, success, warning, danger), optional title, description, action and dismiss.
exports: [Alert, AlertProps, AlertTone]
related: [attention, toast, status, badge, states]
story: components-alerts-notifications-alert
base-ui: []
keywords: [notice, banner, message, callout, warning, error, inline]
---

# Alert

A quiet, inline notice about the content next to it: a draft invoice that was not sent, a failed sync, a plan
limit that is close. It sits in the page flow, stays until the situation changes or the user dismisses it, and
never interrupts. Each tone has its own glyph, so it reads without colour.

**Relationship to Attention.** [`Attention`](../attention/README.md) is a sorted list of things the user should act
on across the product ("What needs my attention?"), fed by the product. `Alert` is one message about the local
context, written by the developer at the spot where it applies. If you have several items to triage, use
`Attention`; if you have one sentence about this page or form, use `Alert`.

## When to use

- A persistent message tied to a page, card or form: warnings, limits, results, background information.
- Something the user may want to act on, with one action button beside it.

## When not to use

- A list of things to do: use [`Attention`](../attention/README.md).
- A transient confirmation of something the user just did ("Saved"): use [`toast`](../toast/README.md).
- A field-level validation message: use the [`Field`](../field/README.md) error slot.
- A decision the user must make before continuing: use [`AlertDialog`](../alert-dialog/README.md).
- A status next to a value in a table or header: use [`Status`](../status/README.md) or [`Badge`](../badge/README.md).

## Import

```tsx
import { Alert } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Alert } from "@fadymondy/nasaq/web";

export function SyncFailed() {
  return (
    <Alert tone="danger" title="Sync failed">
      Could not reach the data source. Check the credentials.
    </Alert>
  );
}
```

## Anatomy

```
Alert                     role="alert" (warning, danger) or "status" (info, success)   data-slot="alert"
├─ icon                   tone glyph                                                   data-slot="alert-icon"
├─ body                                                                                data-slot="alert-body"
│  ├─ title               optional                                                     data-slot="alert-title"
│  └─ description         children                                                     data-slot="alert-description"
└─ actions                action and dismiss button                                    data-slot="alert-actions"
```

## API

### `Alert`

`AlertProps` extends `ComponentProps<"div">` (without `title`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tone?` | `"info" \| "success" \| "warning" \| "danger"` | `"info"` | Meaning, glyph and colour. |
| `title?` | `ReactNode` | none | Short heading. Omit for a one-line notice. |
| `children?` | `ReactNode` | none | The description. |
| `icon?` | `LucideIcon` | tone glyph | Replaces the glyph. |
| `action?` | `ReactNode` | none | One action at the inline end, e.g. `<Button size="sm">`. |
| `onDismiss?` | `() => void` | none | Shows a dismiss button; the host hides the alert. |
| `dismissLabel?` | `string` | `"Dismiss"` / `"تجاهل"` by locale | `aria-label` of the dismiss button. |
| `role?` | `AriaRole` | `"alert"` for warning and danger, else `"status"` | Override the live-region role. |
| `className?` | `string` | none | Merged onto the root. |

`AlertTone` is the union of the four tone names.

## Examples

### With action and dismiss

```tsx
import { Alert, Button } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function PaymentFailed() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Alert
      tone="danger"
      title="Payment failed"
      action={<Button size="sm">Update card</Button>}
      onDismiss={() => setOpen(false)}
    >
      The account is restricted in 3 days unless it is updated.
    </Alert>
  );
}
```

### Arabic, one line

```tsx
import { Alert } from "@fadymondy/nasaq/web";

export function DraftInvoice() {
  return <Alert tone="warning">هذه الفاتورة مسودة ولم تُرسل بعد.</Alert>;
}
```

## Accessibility

- `warning` and `danger` use `role="alert"`: assistive tech announces them immediately when they appear. `info` and `success` use `role="status"`: announced politely. Override with `role`.
- Tone is carried by a distinct glyph as well as colour. The glyph is `aria-hidden`; put the meaning in the text ("Sync failed", not just red).
- The dismiss button is a real `<button>` with an `aria-label`; localise `dismissLabel` when not using the Nasaq provider.

| Key | Action |
| --- | --- |
| `Tab` | Moves to the action and dismiss buttons. |
| `Enter` / `Space` | Activates the focused button. |

## RTL & i18n

- The grid is icon, body, actions in inline order, so it mirrors in RTL. Text uses `text-start`; the action gap uses `ms-3`.
- Built-in string: the dismiss label, "Dismiss" or "تجاهل" when the Nasaq locale starts with `ar`.

## Styling & tokens

- Surface: `bg-nq-{tone}-soft`, `border-nq-{tone}/30`, `rounded-card`; glyph `text-nq-{tone}-text`; text stays `text-foreground` / `text-muted-foreground`.
- Target `[data-slot=alert]`, `[data-tone=warning]`, `alert-title`, `alert-description`, `alert-actions`. Extend with `className`.

## Do / Don't

- **Do** say what happened and what to do, in the title or description.
- **Do** keep one action at most; put the primary next step there.
- **Don't** stack more than two alerts on a page; a list belongs in [`Attention`](../attention/README.md).
- **Don't** use `danger` for things that are merely unusual.

## Related

- [Attention](../attention/README.md) · [Toast](../toast/README.md) · [Status](../status/README.md) · [Badge](../badge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-alerts-notifications-alert--docs
