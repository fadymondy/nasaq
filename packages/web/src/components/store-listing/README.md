---
name: store-listing
title: Store product listing
category: commerce
status: beta
summary: "A storefront results page: facet sidebar with live counts, active chips, sort, grid and list views, pagination or load more, empty results with suggestions, a mobile filter sheet, plus the storefront product card, quick view and compare tray and table."
exports: [storeChipLabel, StoreFacetSidebarProps, StoreFacetSidebar, StoreActiveChipsProps, StoreActiveChips, StoreFilterSheetProps, StoreFilterSheet, StoreListingView, StoreListingDensity, StoreListingToolbarProps, StoreListingToolbar, StoreListingProps, StoreListing, StoreCompareDialog, StoreCompareTable, StoreCompareTray, StoreProductImage, StoreOptionPicker, StorePrice, StoreProductCard, storeCurrencyDigits, StoreQuickView]
related: [store-chrome, store-merch, product-detail, pagination, sheet]
story: components-commerce-store-listing
base-ui: [dialog, checkbox, slider, toggle-group, select]
keywords: [store, listing, category, search results, facets, filters, sort, grid, product card, quick view, compare, wishlist, ecommerce]
---

# Store product listing

`StoreListing` is a whole results page in one component: a facet sidebar with counts, removable filter chips, sort, grid and list views, pagination or load more, an empty state that suggests how to loosen the search, and a filter sheet on phones. It is fed a `CommerceProduct[]` and does the filtering, sorting and paging itself (or take control of any part).

The parts are also exported and are meant to be reused elsewhere: `StoreProductCard`, `StoreQuickView`, `StoreCompareTray`, `StoreCompareTable`, `StoreOptionPicker` and `StorePrice`.

## When to use

- Category pages, search results, brand pages, collections.
- `StoreProductCard` in any grid or carousel of products.

## When not to use

- An admin product table: use the products admin.
- One product's page: use `ProductDetail`.

## Import

```tsx
import { StoreListing, StoreProductCard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StoreListing
  title="Clothing"
  products={products}
  currency="EGP"
  categoryTree={tree}
  defaultFilters={{ ...EMPTY_LISTING_FILTERS, category: "Clothing" }}
  onAddToCart={(product, variant, qty) => cart.add(variant.id, qty)}
  compare
/>
```

Prices in `CommerceProduct` are integer minor units (piastres for EGP); the components convert with the currency's own digits.

## API

### `StoreListing`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `CommerceProduct[]` | required | The full result set. Drafts and archived items are ignored. |
| `currency` | `string` | required | ISO 4217 code. |
| `categoryTree?` | `ListingCategoryNode[]` | none | Category facet. Node ids equal `product.category`. |
| `filters?` / `defaultFilters?` / `onFiltersChange?` | `ListingFilters` | empty | Query, category, brands, options, price range, rating, in stock, on sale. |
| `sort?` / `defaultSort?` / `onSortChange?` | `ListingSort` | `relevance` | Relevance, price, newest, top rated, biggest discount, name. |
| `view?` / `defaultView?` / `density?` | | `grid` | Grid or list; comfortable or compact. |
| `pageSize?` / `paging?` | `number` / `"pages" \| "load-more"` | `12` / `pages` | |
| `loading?` / `error?` / `onRetry?` | | | Skeleton grid and error state. |
| `onAddToCart?` | `(product, variant, qty)` | none | Shows quick add on cards and in quick view. |
| `wishlistIds?` / `onToggleWishlist?` | | own state | |
| `compare?` / `compareMax?` / `compareIds?` / `onCompareChange?` | | off / 4 | Compare boxes, a tray, and a table with a differences-only switch. |
| `getHref?` / `onNavigate?` | | | Card links. |
| `popularSearches?` / `onSearch?` | | | Suggestions in the empty state. |
| `labels?` | `ListingLabels` | locale | Override any string. |

### `StoreProductCard`

`product`, `currency`, `href?`, `layout?` (`grid`, `list`), `ratio?`, `wishlisted?`, `compared?`, `onToggleWishlist?`, `onToggleCompare?`, `onQuickView?`, `onAddToCart?(product, variant, qty)`, `onNavigate?`, `maxSwatches?`, `menu?`, `priority?`, `labels?`. Shows a second image on hover, colour swatches that preview the variant image, badges, a discount, a from-price, a heart and quick add (which asks for any option still open). Context-click, Shift+F10 or the Menu key open its actions.

### `StoreQuickView`

`product`, `open`, `onOpenChange`, `currency`, `href?`, `onAddToCart?`, `closeOnAdd?`, `lowStockAt?`, `labels?`. A dialog with gallery, options, quantity, stock note and add to cart.

### Model helpers

Pure functions, importable in Node and covered by tests: `listingFilter`, `listingSort`, `listingFacets` (disjunctive counts: a facet does not count against its own selection), `listingActiveChips`, `listingRemoveChip`, `listingClear`, `listingRelaxations`, `listingPage`, `listingToggleCompare`, `listingCompareRows`, `listingCompareDifferences`, `listingToMajor`, `listingToMinor`.

## Accessibility

- Options are a radio group; arrow keys move and mirror in RTL. Unavailable values are marked, not hidden.
- Quantity steppers and results counts are live regions; the quick view is a modal dialog with focus returned to the card.
- Facet groups are fieldsets with a legend; the price range slider has named thumbs. The phone sheet applies filters only on Apply.
- The card image is not a link, so context-click works; the name is the link. Hover-only actions are also reachable by keyboard focus.
- Motion (image swap, transitions) is off under reduced motion; images lazy-load with a token placeholder.

## RTL and Arabic

Logical layout, mirrored arrows and sheets, Arabic search normalisation (diacritics, alef and taa marbuta variants), and Arabic strings for every label.
