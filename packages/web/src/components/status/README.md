---
name: status
title: Status
category: data-display
status: stable
summary: Inline status, an icon plus a label with no container; each of five tones has its own icon shape so it reads without colour.
exports: [Status, StatusProps, StatusTone]
related: [badge, table, card]
story: components-data-display-status
base-ui: []
keywords: [status, state, tone, inline, indicator, success, warning, danger, info]
---

# Status

Shows the state of a thing as a small icon followed by a label. There is no pill or background. Products map
their own states onto five generic tones that are the same in every brand: `neutral`, `info`, `warning`,
`success`, `danger`. Each tone has its own icon shape, so the status is readable for colour-blind users and
where a brand colour is close to a status hue.

## When to use

- A status in a table cell, list row, header or detail view.
- Anywhere a chip would be too heavy.

## When not to use

- A status that needs its own chip or surface: use [`Badge`](../badge/README.md) with `variant="success"` etc.
- Categories, tags or identity ("Pro", "New"): use `Badge` (`tag`, `brand`, `accent`).
- Loading or work in progress: use [`Spinner`](../spinner/README.md) or [`LoadingState`](../states/README.md).
- A status with no label: `Status` always needs children.

## Import

```tsx
import { Status, type StatusProps, type StatusTone } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Status } from "@fadymondy/nasaq/web";

export function IssueStatus() {
  return <Status tone="success">مكتملة</Status>;
}
```

## Anatomy

```
Status                  data-slot="status", data-tone="<tone>"   <span>
├─ icon                 lucide icon, size-3.5, aria-hidden, tone colour
└─ label                <span class="truncate"> (children)
```

## API

### `Status`

`StatusProps extends ComponentProps<"span">`. Remaining props go to the outer `<span>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tone?` | `"neutral" \| "info" \| "success" \| "warning" \| "danger"` | `"neutral"` | Generic meaning. Sets the icon and its colour. |
| `icon?` | `LucideIcon` | tone icon | Product-specific glyph (for example a half-filled circle for "In progress"). Overrides the tone's shape; the tone colour still applies. Keep it distinct per state. |
| `tinted?` | `boolean` | `false` | Also colour the label with the tone text token. By default the label stays `text-foreground` and only the icon carries the tone. |
| `children?` | `ReactNode` | none | The label. Truncates with an ellipsis. |
| `className?` | `string` | none | Merged onto the outer span. |

### `StatusTone`

`"neutral" | "info" | "success" | "warning" | "danger"`

Default icons and meaning:

| Tone | Icon | Meaning |
| --- | --- | --- |
| `neutral` | `Circle` | Not started, draft, archived |
| `info` | `CircleDot` | Running, syncing, scheduled |
| `warning` | `CircleAlert` | Needs attention, at risk, expiring |
| `success` | `CircleCheck` | Completed, healthy, paid, live |
| `danger` | `CircleX` | Failed, overdue, error, revoked |

## Examples

### Mapping product states onto tones

```tsx
import { Status, type StatusTone } from "@fadymondy/nasaq/web";

const STATUS: Record<string, { tone: StatusTone; label: string }> = {
  todo: { tone: "neutral", label: "للتنفيذ" },
  progress: { tone: "info", label: "قيد التنفيذ" },
  review: { tone: "warning", label: "قيد المراجعة" },
  done: { tone: "success", label: "مكتملة" },
  blocked: { tone: "danger", label: "متوقفة" },
};

export function IssueStatus({ state }: { state: keyof typeof STATUS }) {
  const s = STATUS[state];
  return <Status tone={s.tone}>{s.label}</Status>;
}
```

### Custom glyph and tinted label

```tsx
import { Status } from "@fadymondy/nasaq/web";
import { CircleDashed } from "lucide-react";

export function Draft() {
  return (
    <Status tone="neutral" icon={CircleDashed} tinted>
      Draft
    </Status>
  );
}
```

## Accessibility

- The icon is `aria-hidden`; the label is the accessible content. There is no role and no live region.
- The tone is not exposed to assistive tech by itself, so write labels that carry the meaning ("Blocked", not "Red").
- Meaning does not depend on colour: each tone has its own icon shape.
- A custom `icon` replaces the tone shape. Keep it visually distinct from the others in the same list.
- The label truncates. When `children` is a string it also gets a `title` tooltip with the full text; for non-string children give the column enough width.
- Localise the label yourself.

## RTL & i18n

- The icon sits on the inline start (right in RTL) through `inline-flex` and `gap-1.5`.
- The icons are not directional and are not mirrored.
- Numbers in labels ("3 blocked"): isolate with `Num` from the numeric component.
- No built-in strings.

## Styling & tokens

- Tone text tokens: `text-muted-foreground` (neutral), `text-nq-info-text`, `text-nq-success-text`, `text-nq-warning-text`, `text-nq-danger-text`.
- Target with `[data-slot=status]` or `[data-tone=success]`.
- Extend with `className`. Do not remap tone colours with raw hex.

## Do / Don't

- **Do** map product states onto the five tones so "failed" looks the same in every product.
- **Do** use `Status` in dense views and `Badge` where a chip is needed.
- **Do** keep custom icons distinct per state.
- **Don't** show a status without a label.
- **Don't** use tones for categories; those are `Badge` tags.
- **Don't** wrap `Status` in a container to fake a badge; use `Badge`.

## Related

- [Badge](../badge/README.md) · [Table](../table/README.md) · [Card](../card/README.md) · [Spinner](../spinner/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-status--docs
