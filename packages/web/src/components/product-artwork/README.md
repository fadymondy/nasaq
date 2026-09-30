---
name: product-artwork
title: ProductArtwork
category: brand
status: beta
summary: A product's official mark on a gradient field of its own brand colour, plus AppGlyph, a line-icon tile for modules that have no mark.
exports: [ProductArtwork, AppGlyph, ProductArtworkProps, AppGlyphProps]
related: [product-mark, product-card, product-switcher, bundle-card]
story: components-brand-product-artwork
base-ui: []
keywords: [artwork, brand, product, mark, hero, cover, glyph, module, icon]
---

# ProductArtwork

`ProductArtwork` is a cover image for a product: the official mark, centred on a field tinted with the product's
own brand colour. The field is a CSS gradient built from the product manifest, so there are no raster assets, and
it follows light, dark and every brand. `AppGlyph` is the counterpart for apps or modules that have no official
mark (Inventory, Payments): a line icon on a brand tint.

## When to use

- A card cover, store listing hero or banner for a product that has a mark.
- A larger field where a bare `ProductMark` would float on an empty surface.
- `AppGlyph`: a small icon tile for a module or feature that is not a product.

## When not to use

- Just the mark, inline or small: use [`ProductMark`](../product-mark/README.md).
- A product that has an official mark: never fake it with `AppGlyph`. Use `ProductMark` or `ProductArtwork`.
- A launcher or list of installed products: use [`ProductSwitcher`](../product-switcher/README.md).
- A full listing card with name, price and install action: use [`ProductCard`](../product-card/README.md).

## Import

```tsx
import { AppGlyph, ProductArtwork } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProductArtwork } from "@fadymondy/nasaq/web";

export function MahaamCover() {
  return <ProductArtwork brand="mahaam" className="aspect-[16/10] w-80" />;
}
```

## Anatomy

```
ProductArtwork          data-slot="product-artwork", data-brand="<brand>"   <div>
├─ ring                 inset 1px ring in the brand tint, aria-hidden
└─ children             default: <ProductMark brand size={markSize} title="" />

AppGlyph                data-slot="app-glyph", data-brand="<brand>"         <span aria-hidden>
└─ icon                 lucide icon, sized by `size`
```

## API

### `ProductArtwork`

`ProductArtworkProps extends ComponentProps<"div">`. Remaining props go to the outer `<div>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `BrandKey \| (string & {})` | required | The product whose manifest tints the field. Also sets `data-brand`, so `--nq-brand` inside is that product's colour. |
| `markSize?` | `number` | `48` | Size of the centred mark in px. Ignored when `children` is given. |
| `children?` | `ReactNode` | `ProductMark` | Replaces the centred mark: a badge plus the mark, a product glimpse, a whole banner layout. |
| `className?` | `string` | none | Merged onto the outer div. Give it a size or an `aspect-*`; the component has no intrinsic size. |
| `style?` | `CSSProperties` | none | Merged after the gradient, so it can override the field. |

### `AppGlyph`

`AppGlyphProps extends Omit<ComponentProps<"span">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `icon` | `LucideIcon \| ReactElement` | required | A lucide icon component or an element. |
| `brand?` | `BrandKey \| (string & {})` | surrounding brand | Tint with this product's brand instead of the surrounding one. |
| `size?` | `"sm" \| "md" \| "lg"` | `"md"` | `sm` is 28px, `md` 36px, `lg` 44px. |
| `className?` | `string` | none | Merged onto the span. |

## Examples

### Custom content on the field

```tsx
import { Badge, ProductArtwork, ProductMark } from "@fadymondy/nasaq/web";

export function FeaturedCover() {
  return (
    <ProductArtwork brand="zekra" className="aspect-[16/10] w-80 flex-col gap-3">
      <ProductMark brand="zekra" size={56} title="Zekra" />
      <Badge variant="brand">جديد</Badge>
    </ProductArtwork>
  );
}
```

### Glyphs for modules without a mark

```tsx
import { AppGlyph } from "@fadymondy/nasaq/web";
import { ReceiptText, Users } from "lucide-react";

export function Modules() {
  return (
    <div className="flex items-center gap-3">
      <AppGlyph icon={Users} size="sm" />
      <AppGlyph icon={ReceiptText} size="lg" brand="mahaam" />
    </div>
  );
}
```

## Accessibility

- `ProductArtwork` is decorative by default: the default mark is drawn with `title=""`, and there is no role.
  Put the product name in adjacent text (a card title, a heading).
- If you pass your own `children` that carry meaning, give them their own accessible names.
- `AppGlyph` is `aria-hidden`. Always pair it with a visible label.
- Neither component is focusable. There are no keyboard interactions.

## RTL & i18n

- The gradient's light source sits at the inline-start top corner. It flips to the left in RTL through the
  `--art-x` variable, and the softer bounce flips to the opposite corner.
- The mark and glyph icons are not directional and are not mirrored.
- No built-in strings.

## Styling & tokens

- Tokens: `--nq-brand` (from `data-brand`), `--nq-surface-raised`, `text-nq-brand`, radius `rounded-card`
  (`rounded-control` for small glyphs).
- Target with `[data-slot=product-artwork]`, `[data-slot=app-glyph]` or `[data-brand=mahaam]`.
- Extend with `className` (size, aspect ratio, radius). Do not recolour with raw hex; the tint comes from the
  brand manifest.

## Do / Don't

- **Do** let the field come from `brand`; it is derived from the manifest.
- **Do** use `AppGlyph` only for modules and apps without a mark.
- **Don't** recolour, crop, stretch, rotate or add effects to `ProductMark`.
- **Don't** use `AppGlyph` as a stand-in logo for a product that has a mark.
- **Don't** replace the field with a raster or your own gradient.

## Related

- [ProductMark](../product-mark/README.md) · [ProductCard](../product-card/README.md) · [ProductSwitcher](../product-switcher/README.md) · [BundleCard](../bundle-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-brand-product-artwork--docs
