---
name: store-chrome
title: Store header and footer
category: store
status: beta
summary: "The storefront frame: announcement bar, sticky header with mega menu, search autocomplete and cart count, and a footer with link columns, newsletter, payments slot, social links and language and currency switches."
exports: [StoreAnnouncement, StoreAnnouncementBarProps, StoreAnnouncementBar, StoreSearchProps, StoreSearch, StoreNavLink, StoreNavColumn, StoreNavFeatured, StoreNavItem, StoreMegaMenuProps, StoreMegaMenu, StoreHeaderProps, StoreHeader, StoreFooterColumn, StoreFooterSocial, StoreFooterOption, StoreFooterProps, StoreFooter]
related: [store-merch, store-listing, navigation-menu, sheet, accordion]
story: components-storefront-store-header
base-ui: [navigation-menu, dialog, accordion, select]
keywords: [store, header, footer, mega menu, search, autocomplete, announcement bar, newsletter, cart, ecommerce, storefront]
---

# Store header and footer

Everything around a storefront page. `StoreAnnouncementBar` rotates short messages above the header. `StoreHeader` holds the brand, a `StoreMegaMenu`, `StoreSearch`, wishlist, account and a cart button with a count. `StoreFooter` has link columns, a newsletter form, a payment marks slot, text social links and language and currency switches.

They take plain data and callbacks. Nothing here talks to a server or owns the cart: pass `cartCount` and `onCartClick`, and the search reads the `CommerceProduct[]` you give it.

## When to use

- The frame of a shop, category, search or product page.
- `StoreSearch` alone in any toolbar that needs product autocomplete.

## When not to use

- An admin app shell: use the app shell and sidebar components.
- A marketing site header with no cart: use the marketing header.

## Import

```tsx
import { StoreAnnouncementBar, StoreHeader, StoreFooter } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StoreHeader
  brand="Nile Store"
  nav={nav}
  announcement={<StoreAnnouncementBar items={announcements} />}
  search={{ products, categoryTree, currency: "EGP", popular: ["hoodie"], onSearch: (q) => go(`/search?q=${q}`), onSelectProduct: (p) => go(`/p/${p.slug}`) }}
  cartCount={cart.count}
  onCartClick={openCart}
/>
<StoreFooter columns={columns} onSubscribe={subscribe} social={social} languages={languages} language="en" onLanguageChange={setLocale} />
```

## API

### `StoreHeader`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `ReactNode` | required | Logo or store name. Links to `brandHref`. |
| `nav?` | `StoreNavItem[]` | none | Categories. Items with `columns` open the mega menu; on phones they move into a sheet with an accordion. |
| `search?` | `StoreSearchProps` | none | Adds the search box (own row on phones). |
| `cartCount?` / `onCartClick?` / `cartHref?` | `number` / handler / `string` | none | Cart button with a count badge. |
| `wishlistCount?` / `onWishlistClick?` | | none | Wishlist button. |
| `account?` / `onAccountClick?` | `ReactNode` / handler | none | User menu slot or a plain account button. |
| `utility?` / `announcement?` | `ReactNode` | none | Extra controls before the cart, and the bar above the header. |
| `sticky?` | `boolean` | `true` | Stay at the top when scrolling. |
| `labels?` | `ChromeLabels` | locale | Override any string. |

### `StoreSearch`

`products`, `categoryTree?`, `currency?`, `recent?` / `onRecentChange?` (controlled recent searches), `popular?`, `value?` / `onValueChange?`, `onSearch(query)`, `onSelectProduct?`, `onSelectCategory?`, `getProductHref?`, `loading?`, `placeholder?`, `labels?`.

On focus with an empty box it lists recent and popular searches. While typing it lists matching categories and products (image, name with the match emphasised, price) and a final "Search for" row. Matching ignores case, Arabic diacritics and alef variants.

### `StoreMegaMenu`

`items: StoreNavItem[]` (`id`, `label`, `href?`, `columns?`, `featured?`, `highlight?`), `currentId?`.

### `StoreAnnouncementBar`

`items` (`id`, `content`, `href?`, `from?`, `until?`), `interval?` (5000), `dismissible?`, `onDismiss?`, `dismissedIds?`, `now?`. Rotation stops on hover, focus, with one message, and under reduced motion. Previous and next buttons step by hand.

### `StoreFooter`

`brand?`, `tagline?`, `columns?`, `onSubscribe?(email)` (throw to show the failure message), `payments?` (your own marks), `social?` (text names and links), `languages?` / `language?` / `onLanguageChange?`, `currencies?` / `currency?` / `onCurrencyChange?`, `legal?`.

### Model helpers

Pure functions, importable in Node: `chromeSuggest`, `chromeFlattenCategories`, `chromeMoveActive`, `chromeHighlight`, `chromeRecordRecent`, `chromeLiveAnnouncements`, `chromeStep`.

## Accessibility

- The search input is an ARIA combobox: `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `listbox` with `option` rows and a polite count for screen readers. Arrow Up and Down move (wrapping), Home and End jump, Enter picks or searches, Escape closes then clears.
- The announcement bar is a labelled carousel region and announces a change only after a manual step, never on the timer.
- The mobile menu is a modal sheet with focus trapped; the mega menu opens on hover, focus and Enter and arrows move between items.
- The newsletter result and error use a polite live region and `aria-invalid`.
- Social links are text, not logos.

## RTL and Arabic

Layout uses logical properties, the count badge and carousel arrows mirror, and the search matches Arabic text. Strings switch with the Nasaq locale.
