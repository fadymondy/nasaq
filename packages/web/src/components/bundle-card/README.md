---
name: bundle-card
title: BundleCard
category: commerce
status: beta
summary: "Several apps sold together for less; shows the overlapping artwork stack, what it is for, the computed saving and the price against the separate total."
exports: [BundleCard, BundleCardProps]
related: [product-card, spotlight, price, plan-card, product-artwork]
story: components-commerce-bundle-card
base-ui: []
keywords: [bundle, kit, package, saving, discount, price, apps, store]
---

# BundleCard

Sells several apps as one purchase. It shows the products' artwork as an overlapping stack, a title, a short pitch, a line naming what is included, a "Save X" badge computed from `compareAt - price`, and the bundle price with the separate total struck through. It stacks vertically in a narrow container and becomes a row from `36rem` of its own width.

## When to use

- A named set of apps sold together at a lower price.

## When not to use

- A single product: use [`ProductCard`](../product-card/README.md).
- Tiers of one product (Free, Pro, Team): use [`PlanCard`](../plan-card/README.md).
- A featured product hero: use [`Spotlight`](../spotlight/README.md).

## Import

```tsx
import { BundleCard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BundleCard, Button, ProductArtwork } from "@fadymondy/nasaq/web";

export function AgencyKit() {
  return (
    <BundleCard
      items={[
        <ProductArtwork key="m" brand="mahaam" markSize={24} />,
        <ProductArtwork key="z" brand="zekra" markSize={24} />,
      ]}
      title="Agency kit"
      description="Run client projects and remember every decision."
      includes="Mahaam · Zekra"
      price={18}
      compareAt={21}
      action={<Button size="sm">Get the kit</Button>}
    />
  );
}
```

## Anatomy

```
BundleCard                 data-slot="bundle-card"   <div class="@container">
└─ <article>               rounded-card surface, column below @xl, row from @xl
   ├─ stack                aria-hidden; items overlap with a ring
   ├─ text
   │  ├─ <h3> title + Badge (saving)
   │  ├─ description       <p>
   │  └─ includes          <p>
   └─ Price (lg) + action
```

## API

### `BundleCard`

`BundleCardProps extends Omit<ComponentProps<"article">, "title">`. Remaining props and `className` go to the inner `<article>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `ReactNode[]` | required | The bundled products' artwork or glyphs, in order. Each is sized 3.5rem and overlaps the previous one. |
| `title` | `ReactNode` | required | Bundle name, an `<h3>`. |
| `description?` | `ReactNode` | none | What the bundle is for. |
| `includes?` | `ReactNode` | none | A line of names. |
| `price` | `number` | required | Bundle price. |
| `compareAt` | `number` | required | The same apps bought separately. The saving is `compareAt - price`; no badge when it is 0 or less. |
| `currency?` | `string` | `"USD"` | ISO currency code. |
| `period?` | `PricePeriod` | `"month"` | `"month" \| "year" \| "seat-month" \| "once"`. |
| `savingsLabel?` | `ReactNode` | "Save $18" / "وفّر 18 US$" | Replaces the saving badge text. |
| `action?` | `ReactNode` | none | Usually one `Button`. |

## Examples

### Arabic

```tsx
import { BundleCard, Button, ProductArtwork } from "@fadymondy/nasaq/web";

export function AgencyKitAr() {
  return (
    <BundleCard
      items={[<ProductArtwork key="m" brand="mahaam" markSize={24} />, <ProductArtwork key="z" brand="zekra" markSize={24} />]}
      title="حزمة الوكالات"
      description="أدِر مشاريع العملاء، وتذكّر كل قرار."
      includes="مهام · ذكرة"
      price={18}
      compareAt={21}
      action={<Button size="sm" variant="secondary">احصل على الحزمة</Button>}
    />
  );
}
```

### Yearly price with a custom saving label

```tsx
import { BundleCard, Button, ProductArtwork } from "@fadymondy/nasaq/web";

export function YearlyKit() {
  return (
    <BundleCard
      items={[<ProductArtwork key="m" brand="mahaam" markSize={24} />]}
      title="Yearly kit"
      price={180}
      compareAt={252}
      period="year"
      savingsLabel="2 months free"
      action={<Button size="sm">Get the kit</Button>}
    />
  );
}
```

## Accessibility

- The artwork stack is `aria-hidden`; name the products in `includes` so the content is available as text.
- The title is an `<h3>`. The card is not interactive; the `action` is.

| Key | Action |
| --- | --- |
| `Tab` | Moves to the action |
| `Enter` / `Space` | Activates the action |

- Localise `title`, `description`, `includes`, `savingsLabel` and the action label.

## RTL & i18n

- The stack overlaps with `-ms-3`, so it mirrors in RTL and the price sits at the opposite end.
- The saving badge and the `Price` follow the provider locale: "Save $18" becomes "وفّر 18 US$". The amount is inside `<bdi>` and uses tabular numerals.
- Built-in strings: only "Save" / "وفّر", chosen when the locale starts with `ar`.

## Styling & tokens

- Uses `bg-nq-surface`, `rounded-card`, `text-h3`, `text-body-sm`, `text-caption` and `text-muted-foreground`. The saving is a `Badge variant="success"`.
- Target with `[data-slot=bundle-card]`.
- Extend with `className` (applied to the `<article>`). Do not override colours with raw hex.

## Do / Don't

- **Do** pass a real `compareAt`, so the saving is true.
- **Do** keep one action; if it is primary, it is the only primary in the view.
- **Don't** wrap the card in another bordered card.
- **Don't** use it for a single app.

## Related

- [ProductCard](../product-card/README.md) · [Spotlight](../spotlight/README.md) · [Price](../price/README.md) · [PlanCard](../plan-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-bundle-card--docs
