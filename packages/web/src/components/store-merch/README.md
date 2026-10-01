---
name: store-merch
title: Store merchandising
category: store
status: beta
summary: "Storefront home blocks: category tiles, hero and promo banners, a flash-deal strip with a live countdown and stock progress, a reusable product carousel for related and recently viewed items, and a brand strip."
exports: [StoreCategoryTile, StoreCategoryTilesProps, StoreCategoryTiles, StoreBanner, StoreHeroBannerProps, StoreHeroBanner, StorePromoBannersProps, StorePromoBanners, StoreCountdownProps, StoreCountdown, StoreFlashDeal, StoreFlashDealsProps, StoreFlashDeals, StoreProductCarouselProps, StoreProductCarousel, StoreBrand, StoreBrandStripProps, StoreBrandStrip]
related: [store-chrome, store-listing, carousel]
story: components-storefront-store-merchandising
base-ui: []
keywords: [store, home, merchandising, banner, hero, promo, flash deal, countdown, carousel, related products, recently viewed, brands, categories]
---

# Store merchandising

The blocks that make a storefront home page. `StoreCategoryTiles`, `StoreHeroBanner` and `StorePromoBanners` lead shoppers in. `StoreFlashDeals` shows time-limited offers with a countdown. `StoreProductCarousel` is a scroll-snapping row of the storefront product card and is reused for related products, recently viewed and new arrivals on any page. `StoreBrandStrip` lists brands as text or official logos.

Everything takes plain data (`CommerceProduct`, banner objects) and reports through callbacks.

## When to use

- Home and landing pages of a shop.
- `StoreProductCarousel` under a product page or in a cart.

## When not to use

- The main results grid with filters: use `StoreListing`.
- A general image carousel: use `Carousel`.

## Import

```tsx
import { StoreProductCarousel, StoreFlashDeals } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StoreHeroBanner items={hero} />
<StoreCategoryTiles items={tiles} />
<StoreFlashDeals deals={deals} currency="EGP" onAddToCart={add} />
<StoreProductCarousel title="Recently viewed" products={merchViewedProducts(all, viewedIds, current.id)} currency="EGP" onAddToCart={add} />
```

## API

| Component | Key props |
| --- | --- |
| `StoreCategoryTiles` | `items` (`id`, `label`, `image?`, `count?`, `href?`), `title?`, `onSelect?`, `ratio?` |
| `StoreHeroBanner` | `items: StoreBanner[]` (one is static, several become a carousel), `autoplay?` (6000 or `false`) |
| `StorePromoBanners` | `items: StoreBanner[]`, `onSelect?` |
| `StoreCountdown` | `endsAt` (epoch ms), `onExpire?`, `now?` |
| `StoreFlashDeals` | `deals` (`product`, `endsAt`, `startsAt?`, `sold?`, `total?`), `currency`, `title?`, `viewAllHref?`, `onAddToCart?`, `onQuickView?`, `onExpire?` |
| `StoreProductCarousel` | `products`, `currency`, `title?`, `viewAllHref?`, `perView?` (2 to 6), `getHref?`, `wishlistIds?`, `onToggleWishlist?`, `onAddToCart?`, `onQuickView?`, `onNavigate?` |
| `StoreBrandStrip` | `brands` (`name`, `href?`, `logo?`), `title?`, `onSelect?` |

`StoreBanner`: `id`, `title`, `description?`, `cta?`, `href?`, `image?`, `imageAlt?`, `eyebrow?`, `tone?` (`brand`, `soft`, `dark`).

### Model helpers

Pure functions, importable in Node: `merchCountdownParts`, `merchNextTick`, `merchActiveDeals`, `merchDealProgress`, `merchRecordViewed`, `merchViewedProducts`, `merchRelatedProducts`.

## Accessibility

- Every block is a labelled region; the carousel uses slide groups with "n of total" names and arrow buttons.
- The countdown is `role="timer"` with a label that changes by the minute, so it is not read every second. When time is up it says the deal has ended.
- Hero autoplay stops on hover, focus and under reduced motion; the image zoom on hover is off under reduced motion.
- Brand names are text unless you supply an official logo.
- Images lazy-load with a token-coloured placeholder when missing or broken.

## RTL and Arabic

Slides, arrows and swipe direction mirror. Numbers in the countdown follow the locale's digits; the readout itself keeps a fixed left-to-right order so units line up.
