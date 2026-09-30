---
name: spotlight
title: Spotlight
category: brand
status: beta
summary: "Featured-product banner on the product's own artwork field, with mark, name, pitch and call to action; scopes the product's brand so one primary button takes its colour."
exports: [Spotlight, SpotlightProps]
related: [product-card, bundle-card, product-artwork, product-mark, section-header]
story: components-brand-spotlight
base-ui: []
keywords: [spotlight, hero, featured, banner, product, brand, store, editors-pick]
---

# Spotlight

A banner that features one product. It renders the product's artwork field with its mark, name, pitch, buttons and a quiet meta line. The whole banner sits in that product's brand scope (`data-brand`), so a Mahaam spotlight shows Mahaam's colour even inside another product's store, and a primary `Button` inside it takes the product colour.

## When to use

- The hero of a store or product page (`size="lg"`).
- A compact featured tile next to or under the hero (`size="md"`).

## When not to use

- A list of products: use [`ProductCard`](../product-card/README.md) in a `ProductGrid`.
- A bundle: use [`BundleCard`](../bundle-card/README.md).
- A generic marketing hero with no product: compose your own layout.

## Import

```tsx
import { Spotlight } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Badge, Button, Spotlight } from "@fadymondy/nasaq/web";

export function StoreHero() {
  return (
    <Spotlight
      brand="mahaam"
      title="Mahaam"
      eyebrow={<Badge variant="accent">Editor's pick</Badge>}
      description="Projects, tasks, time and invoices in one place."
      actions={
        <>
          <Button>Start free trial</Button>
          <Button variant="ghost">Details</Button>
        </>
      }
    />
  );
}
```

## Anatomy

```
Spotlight                    data-slot="spotlight", data-size="lg|md"   <section aria-labelledby>
└─ ProductArtwork            the product's field; @container
   ├─ eyebrow
   ├─ mark + title           ProductMark (or `mark`) and the heading (id for aria-labelledby)
   ├─ description
   ├─ actions
   ├─ meta
   └─ media                  size "lg" only, from 48rem of banner width
```

## API

### `Spotlight`

`SpotlightProps extends Omit<ComponentProps<"section">, "title">`. Remaining props go to the `<section>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `BrandKey \| (string & {})` | required | The featured product. Its manifest tints the banner and its primary button. |
| `size?` | `"lg" \| "md"` | `"lg"` | `lg` is the page hero with room for `media`. `md` is a compact tile. |
| `eyebrow?` | `ReactNode` | none | Small line above the title. A `Badge` reads well. |
| `mark?` | `ReactNode` | product mark | Replaces the `ProductMark` beside the title. |
| `title` | `ReactNode` | required | Product name; the section's heading. |
| `description?` | `ReactNode` | none | The pitch. Clamped to two lines in `md`. |
| `actions?` | `ReactNode` | none | Buttons. At most one primary in the whole view. |
| `meta?` | `ReactNode` | none | Price, trial, rating: one quiet line. |
| `media?` | `ReactNode` | none | A product glimpse beside the copy. `lg` only, from `@md` of banner width; hidden on the narrowest screens. |
| `titleAs?` | `"h1" \| "h2" \| "h3"` | `"h2"` | Heading element for the title. |
| `className?` | `string` | none | Merged onto the `<section>`. |

## Examples

### Hero with media, price and rating

```tsx
import { Badge, Button, Price, Rating, ScreenshotFrame, Spotlight } from "@fadymondy/nasaq/web";

export function Hero() {
  return (
    <Spotlight
      brand="mahaam"
      titleAs="h1"
      title="مهام"
      eyebrow={<Badge variant="accent">اختيار المحررين</Badge>}
      description="المشاريع والمهام والوقت والفواتير في مكان واحد."
      actions={
        <>
          <Button>ابدأ التجربة</Button>
          <Button variant="ghost">التفاصيل</Button>
        </>
      }
      meta={
        <>
          <Price amount={12} period="seat-month" size="sm" />
          <Rating value={4.8} count={2140} />
        </>
      }
      media={
        <ScreenshotFrame variant="window" title="Mahaam" label="Mahaam board" className="w-72">
          <div className="h-32" />
        </ScreenshotFrame>
      }
    />
  );
}
```

### Compact tile

```tsx
import { Button, Spotlight } from "@fadymondy/nasaq/web";

export function Tile() {
  return (
    <Spotlight
      size="md"
      brand="zekra"
      title="Zekra"
      description="A memory organ for AI agents."
      actions={<Button size="sm" variant="secondary">Open</Button>}
    />
  );
}
```

## Accessibility

- A `<section>` labelled by the title heading (`aria-labelledby`), so it is a named landmark region.
- The default mark is decorative (`title=""`). Put the product name in `title`.
- Pass `titleAs="h1"` when the banner is the page title; keep heading levels in order.

| Key | Action |
| --- | --- |
| `Tab` | Moves through the buttons in `actions` |
| `Enter` / `Space` | Activates the focused button |

- Localise `title`, `eyebrow`, `description`, button labels and `meta`.

## RTL & i18n

- Layout uses logical properties and grid, so the copy sits at the inline start and `media` at the end; both swap in RTL.
- Directional icons in buttons need `rtl:-scale-x-100`.
- Numbers in `meta` come from `Price` and `Rating` and follow the locale.
- No built-in strings.

## Styling & tokens

- The banner is a `ProductArtwork` field. `--nq-brand` inside the banner is the product's colour, so a primary `Button` picks it up.
- Text: `text-display` (lg title), `text-h3` (md), `text-body`, `text-caption`, `text-foreground`, `text-muted-foreground`.
- Target with `[data-slot=spotlight]` or `[data-size=md]`.
- Extend with `className`. Do not recolour with raw hex; change `brand`.

## Do / Don't

- **Do** use at most one primary button per view. In a Spotlight it takes the product colour.
- **Do** keep `meta` to one quiet line.
- **Don't** wrap the Spotlight in a bordered card.
- **Don't** put several Spotlights of different brands side by side with a primary button each.
- **Don't** pass a `title` that names a different product than `brand`.

## Related

- [ProductCard](../product-card/README.md) · [BundleCard](../bundle-card/README.md) · [ProductArtwork](../product-artwork/README.md) · [SectionHeader](../section-header/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-brand-spotlight--docs
