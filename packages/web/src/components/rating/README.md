---
name: rating
title: Rating
category: store
status: beta
summary: One star, the average score and an optional compact count ("4.8 · 2.1K workspaces"), with built-in English and Arabic screen reader text.
exports: [Rating, RatingProps]
related: [price, product-card, badge]
story: components-storefront-rating
base-ui: []
keywords: [rating, stars, score, reviews, average, count]
---

# Rating

Shows an average score as a single star, the number, and optionally how many people rated or use the thing:
"★ 4.8 · 2.1K workspaces". It is one star, not five, because a row of part-filled stars is hard to read at small
sizes and says nothing the number does not. It is read-only.

## When to use

- A store listing, product card or app detail header.
- An average score with an optional count.

## When not to use

- Collecting a rating from the user: build it with buttons or a radio group; `Rating` is display only.
- A status or state: use [`Status`](../status/README.md).
- A label such as "New" or "Pro": use [`Badge`](../badge/README.md).

## Import

```tsx
import { Rating, type RatingProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Rating } from "@fadymondy/nasaq/web";

export function AppRating() {
  return <Rating value={4.8} count={2140} countLabel="workspaces" />;
}
```

## Anatomy

```
Rating                  data-slot="rating"   <span>
├─ sr-only text         full sentence for screen readers
├─ star                 lucide Star, aria-hidden
├─ score                <bdi>, one decimal
└─ count (optional)     "·", <bdi> compact count, countLabel; aria-hidden
```

## API

### `Rating`

`RatingProps extends Omit<ComponentProps<"span">, "children">`. Remaining props go to the outer `<span>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | Average score, for example `4.8`. Always shown with one decimal. |
| `max?` | `number` | `5` | Top of the scale. Used in the screen reader text only ("out of 5"). |
| `count?` | `number` | none | How many people or workspaces rated or use it. Shown compact: `2.1K`. Omit to hide. |
| `countLabel?` | `string` | none | What `count` counts: "workspaces", "reviews". Localise it. |
| `className?` | `string` | none | Merged onto the outer span. |

## Examples

### Score only

```tsx
import { Rating } from "@fadymondy/nasaq/web";

export function Score() {
  return <Rating value={4.6} />;
}
```

### Arabic listing

```tsx
import { NasaqProvider, Rating } from "@fadymondy/nasaq/web";

export function ArabicRating() {
  return (
    <NasaqProvider locale="ar" dir="rtl">
      <Rating value={4.8} count={2140} countLabel="مساحة عمل" />
    </NasaqProvider>
  );
}
```

## Accessibility

- A `sr-only` sentence carries the meaning: "Rated 4.8 out of 5, 2.1K workspaces". The visible star, score and
  count are `aria-hidden` so they are not read twice.
- Without a `NasaqProvider` the sentence is English. With an `ar` locale it reads in Arabic ("التقييم 4.8 من 5").
- No keyboard interaction; it is not focusable.
- Localise `countLabel` yourself.

## RTL & i18n

- Layout uses `inline-flex` and logical spacing (`me-1.5`), so the star stays on the inline start in both
  directions.
- The score and count are wrapped in `<bdi>`, so digits keep their order inside Arabic text.
- Numbers go through the Nasaq number formatter (`useFormatNumber`), so the numeral set and compact notation
  follow the active locale.
- Built-in strings: the screen reader sentence in English and Arabic. `countLabel` is yours.

## Styling & tokens

- Tokens: `text-nq-accent` (star, filled), `text-muted-foreground` (count), `text-foreground` (score), `text-caption`.
- Target with `[data-slot=rating]`.
- Extend with `className`. The count truncates when space is tight.

## Do / Don't

- **Do** pass a `countLabel` when you pass `count`, so the number means something.
- **Do** keep the star single; it reads at every size.
- **Don't** use it as an input.
- **Don't** show a score without saying what it averages when it is not obvious.

## Related

- [Price](../price/README.md) · [ProductCard](../product-card/README.md) · [Badge](../badge/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-storefront-rating--docs
