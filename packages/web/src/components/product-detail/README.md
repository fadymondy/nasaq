---
name: product-detail
title: ProductDetail
category: store
status: beta
summary: "A complete product page from one CommerceProduct: gallery with zoom and swipe, availability-aware variant picker, quantity, price with percent off, stock and delivery lines, add to cart, buy now, sticky mobile bar, size guide and content sections."
exports: [ProductDetail, ProductDetailProps, ProductBreadcrumb, ProductSpec, ProductDeliveryCity, ProductDeliveryConfig, ProductTrustIcon, ProductTrustBadge, ProductActionResult]
related: [product-reviews, product-card, price, rating, dialog, tabs, accordion]
story: components-storefront-product-detail
base-ui: [radio, radio-group, dialog, tabs, accordion, select]
keywords: [product, pdp, product page, gallery, variant, size, colour, swatch, quantity, add to cart, buy now, wishlist, delivery, store]
---

# ProductDetail

The product page of a store. Give it a whole `CommerceProduct` and it renders the breadcrumb, a gallery, the title and rating, the price (with compare-at and percent off), the variant picker, a quantity stepper, stock and delivery lines, add to cart and buy now, wishlist and share, trust badges, a size guide, and the description, specifications and shipping sections. It holds no cart: `onAddToCart(variant, qty)` is the only way out. Slots take the reviews block and the related products.

The pieces are exported too: `ProductGallery`, `ProductVariantPicker`, `ProductQuantityStepper` and `ProductSizeGuide`, and the pure helpers behind them (`initialSelection`, `selectOptionValue`, `imageForSelection`, `stockState`, `displayPrice`, `deliveryWindow`, and more).

## When to use

- The page for one product with variants (colour, size) that are sold from a store.
- Any place a single product needs a buy box with live availability.

## When not to use

- A product in a shelf or grid: use [`ProductCard`](../product-card/README.md).
- A subscription plan: use [`PlanCard`](../plan-card/README.md).
- Cart and checkout: they belong to the cart and checkout components.

## Import

```tsx
import { ProductDetail } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProductDetail } from "@fadymondy/nasaq/web";

export function Page({ product }: { product: CommerceProduct }) {
  return (
    <ProductDetail
      product={product}
      currency="USD"
      onAddToCart={async (variant, quantity) => {
        await cart.add(variant.id, quantity); // return { error } to show a failure
      }}
    />
  );
}
```

## Anatomy

```
ProductDetail                  data-slot="product-detail"
├─ Breadcrumb                  optional
├─ ProductGallery              thumbnails, zoom, swipe, lightbox, video badge
└─ buy box
   ├─ title, brand, Rating (links to #reviews)
   ├─ price, compare-at, percent-off Badge
   ├─ ProductVariantPicker     radio group per option; optionAction holds the size guide link
   ├─ ProductQuantityStepper   clamped to stock and maxPerOrder
   ├─ stock line, delivery line with a city Select
   ├─ Add to cart, Buy now, wishlist, share
   └─ trust badges
sections                       Tabs from 768px, Accordion below (description, specifications, shipping)
reviews slot                   id="reviews"
related slot
sticky add bar                 phones only, after the main buttons scroll away
```

## API

### `ProductDetail`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `product` | `CommerceProduct` | required | Options, variants, images, rating. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code. Money is integer minor units. |
| `currencyExponent?` | `number` | `2` | Digits of the minor unit. |
| `defaultVariantId?` | `string` | first in stock | Opening variant. |
| `blankSelection?` | `boolean` | `false` | Open with nothing picked. Add to cart then asks for a pick. |
| `onVariantChange?` | `(variant, selection) => void` | none | After each pick. |
| `onAddToCart` | `(variant, qty) => void \| { error? } \| Promise` | required | Return `{ error }` or throw to show a failure. |
| `onBuyNow?` | same | none | Omit to hide Buy now. |
| `wishlisted?`, `defaultWishlisted?`, `onWishlistChange?` | | none | Omit all to hide the heart. |
| `onShare?`, `shareUrl?` | | Web Share, else copy link | |
| `breadcrumbs?` | `{ label, href? }[]` | none | The last item is the current page. |
| `sizeGuide?`, `sizeGuideOptionId?` | `ProductSizeGuideData`, `string` | `"size"` | Table shown in a dialog next to the size axis. |
| `impossible?` | `"hide" \| "disable"` | `"hide"` | What to do with values no variant offers together with the current picks. |
| `lowStockThreshold?` | `number` | `5` | At or below this the stock line reads "Only N left". |
| `maxPerOrder?` | `number` | none | Cap on top of stock. |
| `delivery?` | `{ cities, defaultCityId?, skipWeekdays?, cutoffHour?, now? }` | none | Estimate by city. Pass a fixed `now` in stories and tests. |
| `description?`, `specs?`, `shippingInfo?` | | `product.description` | Content sections. |
| `sections?` | `"auto" \| "tabs" \| "accordion"` | `"auto"` | |
| `trustBadges?` | `ProductTrustBadge[] \| false` | four defaults | |
| `reviews?`, `related?`, `relatedTitle?` | `ReactNode`, `string` | none | Slots. |
| `stickyBar?` | `boolean` | `true` | Mobile add bar. |
| `labels?` | `ProductDetailLabels` | en or ar | Override any string. |

### Sub-components

- `ProductGallery`: `images`, `index?`, `defaultIndex?`, `onIndexChange?`, `zoom?`, `name?`, `labels?`.
- `ProductVariantPicker`: `product`, `selection`, `onSelectionChange`, `impossible?`, `optionAction?`, `invalid?`, `labels?`. Sold-out values are crossed out and stay selectable.
- `ProductQuantityStepper`: `value`, `onValueChange`, `max?`, `disabled?`, `labels?`.
- `ProductSizeGuide`: `guide` (`columns`, `rows`, `highlight?`, `footer?`, `title?`, `description?`), `selectedSize?`, `labels?`.

## Examples

### Arabic page with delivery by city

```tsx
<ProductDetail
  product={product}
  currency="USD"
  delivery={{ cities: [{ id: "cairo", label: "القاهرة", etaDays: [1, 2], fee: 0 }], skipWeekdays: [5, 6] }}
  onAddToCart={add}
/>
```

Set the provider locale to `ar`; everything, including numbers and dates, follows.

### Reviews in the slot

```tsx
<ProductDetail product={product} currency="USD" onAddToCart={add} reviews={<ProductReviews reviews={reviews} />} />
```

## Accessibility

- Each option is a radio group (arrow keys move, `Space` picks). Sold-out values are announced as unavailable and drawn with a line, not colour alone.
- The gallery has previous and next buttons, arrow keys, a live position, and a lightbox dialog. Swipe is an extra, never the only way.
- The stock line, the add result and quantity limits are in live regions.
- Reduced motion turns off the zoom and slide transitions.

## RTL & i18n

- English and Arabic strings are built in; pass `labels` to override.
- Prices, SKUs, quantities and dates use `<bdi>` and locale digits. Swipe direction and the previous/next arrows mirror.
- The size table keeps measurements left to right.

## Styling & tokens

- Tokens only (`text-foreground`, `bg-secondary`, `border-border`, `text-nq-*-text`). Swatch colours come from `CommerceOption` values, which should be tokens or CSS colours from your data.
- Images show a token-coloured placeholder when missing or broken, and reserve their aspect ratio.

## Do / Don't

- **Do** pass the whole product and let availability drive the picker.
- **Do** return `{ error }` from `onAddToCart` when the cart refuses.
- **Don't** hide sold-out values: cross them out so shoppers know they exist.
- **Don't** compute stock or price yourself; use `stockState` and `displayPrice`.

## Related

- [ProductReviews](../product-reviews/README.md) · [ProductCard](../product-card/README.md) · [Price](../price/README.md) · [Rating](../rating/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-storefront-product-detail--docs
