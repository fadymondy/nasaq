---
name: badge
title: Badge
category: data-display
status: stable
summary: Small chip for a status, brand or accent label, or a user-defined tag in one of nine hues.
exports: [Badge, badgeVariants, BadgeProps, TAG_HUES, TagHue]
related: [status, table, card, avatar]
story: components-data-display-badge
base-ui: []
keywords: [badge, chip, label, tag, pill, status, count]
---

# Badge

A 20px high chip (`h-5`, 4px radius, caption text) rendered as a `<span>`. Its `variant` sets the colour role.
Statuses use fixed hues shared by every brand. `brand` and `accent` are identity, not status. `tag` is for
user-defined categories, with a `hue` chosen from nine.

## When to use

- A status that needs its own chip: `success`, `warning`, `danger`, `info`.
- A short count or label: "Pro" (`brand`), "New" (`accent`), a delta (`outline`).
- User-defined labels or categories: `variant="tag"` with a `hue`.

## When not to use

- An inline status in a table cell, list row or header, where a chip is too heavy: use [`Status`](../status/README.md).
  Its icon shape differs per tone, so it reads without colour.
- A status carried by colour alone: every badge needs a label. Prefer an icon as well.
- Tags used as status: the `tag` hues are categories, never state.
- A clickable control: a badge is not interactive. Use `Button`.

## Import

```tsx
import { Badge, badgeVariants, TAG_HUES, type BadgeProps, type TagHue } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Badge } from "@fadymondy/nasaq/web";

export function IssueState() {
  return <Badge variant="warning">قيد المراجعة</Badge>;
}
```

## Anatomy

```
Badge        data-slot="badge"    <span>, optional leading svg (12px) then text
```

## API

### `Badge`

`BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"neutral" \| "outline" \| "brand" \| "accent" \| "success" \| "warning" \| "danger" \| "info" \| "tag"` | `"neutral"` | Colour role (table below). |
| `hue?` | `TagHue` | `"gray"` | Tag colour. Only used when `variant="tag"`; sets `--tag-solid` and `--tag-soft` from `--nq-tag-<hue>` and `--nq-tag-<hue>-soft`. |
| `className?` | `string` | none | Merged after the variant classes. |
| `style?` | `CSSProperties` | none | Merged after the tag custom properties. |
| `...props` | `ComponentProps<"span">` | none | Forwarded to the `<span>`. |

Variants (`badgeVariants`):

| Variant | Meaning | Classes |
| --- | --- | --- |
| `neutral` | Default, generic | `border-border bg-secondary text-foreground` |
| `outline` | Quiet, counts and deltas | `border-border text-muted-foreground` |
| `brand` | Product identity ("Pro", the tenant's brand). Not a status. | brand border at 40%, brand 14% fill, `text-foreground` |
| `accent` | Nasaq gold: featured, new. Not a status. | `border-nq-accent/40 bg-nq-accent/15 text-nq-accent-text` |
| `success` | Done, healthy, paid, live | `border-nq-success/40 bg-nq-success-soft text-nq-success-text` |
| `warning` | Needs attention, at risk, expiring | `border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text` |
| `danger` | Failed, overdue, error, revoked | `border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text` |
| `info` | Running, syncing, scheduled | `border-nq-info/40 bg-nq-info-soft text-nq-info-text` |
| `tag` | User-defined category | `border-transparent bg-[var(--tag-soft)] text-[var(--tag-solid)]` |

### Other exports

| Export | Type | Description |
| --- | --- | --- |
| `TAG_HUES` | `readonly ["gray","red","orange","amber","green","teal","blue","violet","pink"]` | The nine tag hues, in order. |
| `TagHue` | `"gray" \| "red" \| "orange" \| "amber" \| "green" \| "teal" \| "blue" \| "violet" \| "pink"` | Type of `hue`. |
| `badgeVariants` | `cva(...)` | Class generator: `badgeVariants({ variant })`. Use it to give another element badge styling. |
| `BadgeProps` | interface | Props of `Badge`. |

## Examples

### Statuses, with an icon

```tsx
import { Badge } from "@fadymondy/nasaq/web";
import { CircleCheck, CircleX } from "lucide-react";

export function Results() {
  return (
    <div className="flex gap-2">
      <Badge variant="success">
        <CircleCheck aria-hidden />
        مكتملة
      </Badge>
      <Badge variant="danger">
        <CircleX aria-hidden />
        متوقفة
      </Badge>
    </div>
  );
}
```

### User tags

```tsx
import { Badge, type TagHue } from "@fadymondy/nasaq/web";

export function Tags({ tags }: { tags: { name: string; hue: TagHue }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Badge key={t.name} variant="tag" hue={t.hue}>
          {t.name}
        </Badge>
      ))}
    </div>
  );
}
```

### Every tag hue

```tsx
import { Badge, TAG_HUES } from "@fadymondy/nasaq/web";

export function AllHues() {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_HUES.map((hue) => (
        <Badge key={hue} variant="tag" hue={hue}>
          {hue}
        </Badge>
      ))}
    </div>
  );
}
```

### Delta with an LTR figure

```tsx
import { Badge } from "@fadymondy/nasaq/web";
import { TrendingUp } from "lucide-react";

export function Delta() {
  return (
    <Badge variant="outline">
      <TrendingUp />
      <span dir="ltr">+12.4%</span>
    </Badge>
  );
}
```

### Badge styling on another element

```tsx
import { badgeVariants } from "@fadymondy/nasaq/web";

export function BadgeLink() {
  return (
    <a href="/pro" className={badgeVariants({ variant: "brand" })}>
      Pro
    </a>
  );
}
```

## Accessibility

A badge is a static `<span>` with no role. It is not focusable.

- The label is the meaning. Never rely on hue alone; pair status with text and, where possible, an icon.
- Mark decorative icons inside a badge with `aria-hidden`.
- For a bare count with no visible unit ("3"), put an accessible name nearby or use `aria-label`.
- Localise the text yourself.

## RTL & i18n

- The badge is `inline-flex` with `gap-1`, so an icon before the text follows `dir`.
- Directional icons (arrows, chevrons) need mirroring in RTL. Trend and status icons do not.
- Keep numbers, percentages and signs LTR inside Arabic text: `<span dir="ltr">+12.4%</span>` or `Num` from the numeric component.
- No built-in strings.

## Styling & tokens

- Status tokens: `--nq-{success,warning,danger,info}` with `-soft` and `-text`. Identity: `--nq-brand`, `--nq-accent`. Tags: `--nq-tag-<hue>` and `--nq-tag-<hue>-soft`.
- The status hues are fixed across brands. Do not remap them.
- Target with `[data-slot=badge]`. Extend with `className`; never override colours with raw hex.

## Do / Don't

- **Do** use `success` / `warning` / `danger` / `info` for state, and always include a label.
- **Do** use `brand` for product identity and `accent` for featured/new, never as a status.
- **Do** use `Status` instead of a badge inside dense table cells and lists.
- **Don't** use `tag` hues to mean state.
- **Don't** invent a variant with raw hex; use the tokens.
- **Don't** make a badge clickable.

## Related

- [Status](../status/README.md) · [Table](../table/README.md) · [Card](../card/README.md) · [Avatar](../avatar/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-badge--docs
