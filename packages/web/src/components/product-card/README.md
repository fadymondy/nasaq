---
name: product-card
title: ProductCard
category: commerce
status: beta
summary: "Store card for a product (artwork, name, pitch, rating, price, install action) with no border; switches between tile and row by container width. Includes ProductGrid and a compact ProductList."
exports: [ProductCard, ProductGrid, ProductList, ProductListItem, ProductCardProps, ProductListItemProps]
related: [bundle-card, spotlight, product-artwork, price, rating, install-button, section-header]
story: components-commerce-product-card
base-ui: []
keywords: [product, store, catalogue, app, card, grid, shelf, install, price, container-query]
---

# ProductCard

A product in a store or catalogue: artwork, name, category, a two-line pitch, social proof, price and an install action. It has no border or card surface. The artwork carries the visual weight, so a grid of cards reads as a shelf. `ProductGrid` lays cards out in 1 to 4 columns and provides the container that `layout="auto"` measures. `ProductList` and `ProductListItem` are a compact, borderless list for long lists of modules or add-ons.

## When to use

- A store or catalogue of apps, with artwork, price and an install button.
- A dense list of modules, integrations or add-ons (`ProductList`).

## When not to use

- A featured product with a hero banner: use [`Spotlight`](../spotlight/README.md).
- Several products sold together: use [`BundleCard`](../bundle-card/README.md).
- Pricing tiers of one product: use [`PlanCard`](../plan-card/README.md).
- Generic content cards: use [`Card`](../card/README.md).

## Import

```tsx
import { ProductCard, ProductGrid, ProductList, ProductListItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { InstallButton, Price, ProductArtwork, ProductCard, ProductGrid, Rating } from "@fadymondy/nasaq/web";

export function Shelf() {
  return (
    <ProductGrid>
      <ProductCard
        artwork={<ProductArtwork brand="zekra" />}
        name="Zekra"
        category="AI memory"
        description="A memory organ for AI agents: what one session learns, the next one already knows."
        meta={<Rating value={4.9} count={860} />}
        price={<Price amount={9} period="month" />}
        action={<InstallButton appName="Zekra" />}
      />
    </ProductGrid>
  );
}
```

## Anatomy

```
ProductGrid                    data-slot="product-grid"        <div class="@container"> wrapping a grid
└─ ProductCard                 data-slot="product-card"        <article>, data-layout="<layout>"
   ├─ artwork                  data-slot="product-card-artwork"
   │  └─ badge (tile)          absolute, top-start of the artwork
   └─ details
      ├─ name                  <h3> (nameAs) + badge (row)
      ├─ category              <p>
      ├─ action                top-end
      ├─ description           <p>, two lines
      └─ meta … price          bottom row

ProductList                    data-slot="product-list"        <div class="@container"> wrapping a <ul>
└─ ProductListItem             data-slot="product-list-item"   <li>: icon, name + description, price, action
```

## API

### `ProductCard`

`ProductCardProps extends Omit<ComponentProps<"article">, "title">`. Remaining props go to the `<article>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `artwork` | `ReactNode` | required | Usually `<ProductArtwork brand="..." />`. Sized by the card. |
| `name` | `ReactNode` | required | Product name, rendered as a heading. |
| `category?` | `ReactNode` | none | Category or publisher line under the name. |
| `badge?` | `ReactNode` | none | "New", "Free". On the artwork in tile layout, beside the name in row layout. |
| `description?` | `ReactNode` | none | Clamped to two lines. |
| `meta?` | `ReactNode` | none | Bottom-start slot, usually `<Rating />`. |
| `price?` | `ReactNode` | none | Bottom-end slot, usually `<Price />`. |
| `action?` | `ReactNode` | none | Top-end slot, usually `<InstallButton />`. |
| `layout?` | `"auto" \| "tile" \| "row"` | `"auto"` | See below. |
| `nameAs?` | `"h2" \| "h3" \| "h4"` | `"h3"` | Heading element for the name. |
| `className?` | `string` | none | Merged onto the `<article>`. |

`layout`:

- `tile`: artwork on top at 16:10, full width.
- `row`: a small 5rem square artwork beside the details, for phones and dense lists.
- `auto`: a row in a narrow container and a tile from `36rem` (`@xl`) of the nearest `@container` ancestor. It measures the container, not the viewport. `ProductGrid` is such a container, and it also sets its own column count from its width. Outside a `ProductGrid`, wrap the cards in an element with the `@container` class, or the card stays a row.

### `ProductGrid`

`ComponentProps<"div">`. `className` and other props go to the inner grid.

Columns: 1, then 2 from `@xl` (36rem), 3 from `@4xl` (56rem), 4 from `@6xl` (72rem), measured on the grid's own width.

### `ProductListItem`

`ProductListItemProps extends Omit<ComponentProps<"li">, "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | required | `<AppGlyph />` or a small `<ProductMark />`. |
| `name` | `ReactNode` | required | Truncates. |
| `description?` | `ReactNode` | none | One line; truncates. |
| `price?` | `ReactNode` | none | Before the action. |
| `action?` | `ReactNode` | none | Last item in the row. |
| `className?` | `string` | none | Merged onto the `<li>`. |

### `ProductList`

`ComponentProps<"ul">`. Columns: 1, then 2 from `@3xl` (48rem), 3 from `@6xl` (72rem).

## Examples

### Arabic catalogue

```tsx
import { InstallButton, Price, ProductArtwork, ProductCard, ProductGrid, Rating } from "@fadymondy/nasaq/web";

export function ArabicShelf() {
  return (
    <ProductGrid>
      <ProductCard
        artwork={<ProductArtwork brand="mahaam" />}
        name="مهام"
        category="إدارة المشاريع"
        description="المشاريع والمهام والوقت والفواتير في مكان واحد."
        meta={<Rating value={4.8} count={2140} />}
        price={<Price amount={12} period="month" />}
        action={<InstallButton appName="مهام" />}
      />
    </ProductGrid>
  );
}
```

### Forced layouts

```tsx
import { ProductArtwork, ProductCard } from "@fadymondy/nasaq/web";

export function Forced() {
  return (
    <div className="flex flex-col gap-6">
      <ProductCard layout="tile" artwork={<ProductArtwork brand="seatfor" />} name="SeatFor" category="Bookings" />
      <ProductCard layout="row" artwork={<ProductArtwork brand="seatfor" />} name="SeatFor" category="Bookings" />
    </div>
  );
}
```

### Compact list of modules

```tsx
import { AppGlyph, Button, Price, ProductList, ProductListItem } from "@fadymondy/nasaq/web";
import { CreditCard, Users } from "lucide-react";

export function Modules() {
  return (
    <ProductList>
      <ProductListItem
        icon={<AppGlyph icon={Users} />}
        name="Customers"
        description="Contacts and companies"
        price={<Price amount={0} />}
        action={<Button size="sm" variant="secondary">Add</Button>}
      />
      <ProductListItem
        icon={<AppGlyph icon={CreditCard} />}
        name="Payments"
        description="Cards and bank transfers"
        price={<Price amount={5} period="month" />}
        action={<Button size="sm" variant="secondary">Add</Button>}
      />
    </ProductList>
  );
}
```

## Accessibility

- Each card is an `<article>` with the name as a heading. Set `nameAs` so the heading level fits the page outline.
- The card itself is not interactive. Focus and keyboard behaviour come from the `action` you pass (for example `InstallButton`).

| Key | Action |
| --- | --- |
| `Tab` | Moves to the action button, then the next card |
| `Enter` / `Space` | Activates the focused action |

- `ProductListItem` is a plain `<li>` with a hover tint. Put a real button or link in `action`.
- Localise `name`, `category`, `description` and the labels of `InstallButton`, `Price` and `Rating` yourself.

## RTL & i18n

- The badge on the artwork uses `start-3`, and the action sits at the inline end, so both mirror in RTL.
- Row layout puts the artwork on the inline start (right in RTL).
- Numbers and currency come from `Price` and `Rating`, which follow the provider locale.
- No built-in strings.

## Styling & tokens

- No border, no background. List items use `rounded-control` and the `bg-nq-hover` hover tint.
- Text tokens: `text-foreground`, `text-muted-foreground`; type: `text-body`, `text-body-sm`, `text-caption`, `text-label`.
- State attribute: `data-layout="auto|tile|row"` on the article. Target with `[data-slot=product-card]`.
- Extend with `className`. Do not restyle colours with raw hex.

## Do / Don't

- **Do** put cards in a `ProductGrid` and let `layout="auto"` choose tile or row.
- **Do** show one install action per card.
- **Don't** wrap cards or the shelf in a bordered card. Sections are separated by whitespace and a [`SectionHeader`](../section-header/README.md).
- **Don't** put a primary button on every card. One primary per view; keep `InstallButton` quiet in a grid.
- **Don't** use `layout="auto"` outside an `@container` and expect a tile.

## Related

- [BundleCard](../bundle-card/README.md) · [Spotlight](../spotlight/README.md) · [ProductArtwork](../product-artwork/README.md) · [Price](../price/README.md) · [Rating](../rating/README.md) · [InstallButton](../install-button/README.md) · [SectionHeader](../section-header/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-product-card--docs
