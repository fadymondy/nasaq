---
name: section-header
title: SectionHeader
category: typography
status: beta
summary: "Title row of a page section: heading, one line of context and an optional action at the inline end. Separates sections without bordered cards."
exports: [SectionHeader, SectionHeaderProps]
related: [product-card, text, page-actions, card]
story: components-typography-section-header
base-ui: []
keywords: [section, header, heading, title, see-all, page, outline]
---

# SectionHeader

The heading row of a page section. It shows a title, an optional line of description and an optional action at the inline end ("See all", a toggle). Sections are separated by whitespace and this header, not by wrapping each one in a bordered card.

## When to use

- Above a shelf, table or list on a page with several sections.
- When a section needs a "See all" link or a small toggle beside the title.

## When not to use

- The title of the page itself with primary actions: use [`PageActions`](../page-actions/README.md) and page-level layout.
- Titles inside a card or dialog: use those components' own header parts.
- Plain body text: use [`Text`](../text/README.md).

## Import

```tsx
import { SectionHeader } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { SectionHeader } from "@fadymondy/nasaq/web";

export function Essentials() {
  return <SectionHeader title="Essentials" description="The apps most businesses install first." />;
}
```

## Anatomy

```
SectionHeader                data-slot="section-header"   <div>, flex, items-end, justify-between
├─ text
│  ├─ heading                <h2> (as), optional id (headingId)
│  └─ description            <p>
└─ action                    inline end
```

## API

### `SectionHeader`

`SectionHeaderProps extends Omit<ComponentProps<"div">, "title">`. Remaining props go to the outer `<div>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The heading. |
| `description?` | `ReactNode` | none | One line under the title. |
| `action?` | `ReactNode` | none | Inline-end slot: a "See all" link button, a toggle. |
| `as?` | `"h1" \| "h2" \| "h3"` | `"h2"` | Heading element. Choose the level for the page outline; the look stays the same. |
| `headingId?` | `string` | none | Id on the heading, so the section can use `aria-labelledby`. |
| `className?` | `string` | none | Merged onto the outer `<div>`. |

## Examples

### With a "See all" action

```tsx
import { Button, SectionHeader } from "@fadymondy/nasaq/web";
import { ArrowRight } from "lucide-react";

export function Featured() {
  return (
    <SectionHeader
      title="Essentials"
      description="The apps most businesses install first."
      action={
        <Button variant="link" size="sm">
          See all <ArrowRight className="rtl:-scale-x-100" />
        </Button>
      }
    />
  );
}
```

### Labelled section, Arabic

```tsx
import { Button, SectionHeader } from "@fadymondy/nasaq/web";

export function Essentials() {
  return (
    <section aria-labelledby="essentials-title" className="flex flex-col gap-5">
      <SectionHeader
        headingId="essentials-title"
        title="الأساسيات"
        description="التطبيقات التي تثبّتها معظم الأعمال أولاً."
        action={<Button variant="link" size="sm">عرض الكل</Button>}
      />
    </section>
  );
}
```

## Accessibility

- Renders a real heading. Pick `as` so levels stay in order (one `h1` per page).
- Give the heading an id with `headingId` and point the `<section>` at it with `aria-labelledby`.
- The container has no role; the action keeps its own semantics.

| Key | Action |
| --- | --- |
| `Tab` | Moves to the action, if any |
| `Enter` / `Space` | Activates the action |

- Localise `title`, `description` and the action label.

## RTL & i18n

- The action sits at the inline end (left in RTL) through flex; nothing else needs changing.
- Directional icons in the action need `rtl:-scale-x-100`.
- No built-in strings.

## Styling & tokens

- Heading: `text-h2 text-foreground`. Description: `text-body-sm text-muted-foreground`.
- Target with `[data-slot=section-header]`.
- Extend with `className` (for example spacing). Do not restyle the heading with raw hex.

## Do / Don't

- **Do** separate sections with whitespace and a `SectionHeader`.
- **Do** keep the description to one line.
- **Don't** wrap each section in a bordered card.
- **Don't** put a primary button in `action`; use a `link` or `ghost` button. One primary per view.
- **Don't** pick `as` for its size; the look is the same at every level.

## Related

- [ProductCard](../product-card/README.md) · [Text](../text/README.md) · [PageActions](../page-actions/README.md) · [Card](../card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-typography-section-header--docs
