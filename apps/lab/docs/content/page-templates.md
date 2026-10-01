# Page templates

Every category in the sidebar ends with a **Pages** folder of complete screens, each built only from Nasaq components and tokens with no page-specific CSS. They answer "what does a real settings screen, an orders table or a checkout look like in this system", and they double as integration tests: if a page cannot be built from the parts, the parts need work.

Every page follows the toolbar. Switch to Arabic, dark, another brand or another density and the whole screen follows. Many pages also have Arabic and mobile stories.

## Using a template

A page is a story, so its source is in the repo at `apps/lab/stories`; copy the composition into your app. Pages are examples to adapt and not a package export: they contain demo data and no data fetching.

## The commerce kit

The **Store** and **Store Admin** groups are a complete storefront and its back office, and the best single demonstration of the system:

- **Storefront:** Home, Category, Search, Product, Cart, Checkout, Order Placed, and the customer account (Orders, Order Detail, Returns, Return Request, Addresses, Wishlist, Recently Viewed).
- **Back office:** Dashboard, Products, Product, Orders, Order, Discounts and Settings.
- **[The journey](?story=components-storefront-pages-journey--default)** walks the storefront from home to order placed in a single story, in English (`Default`), Arabic and mobile.

The kit uses simple illustrated SVG products and fictional data. The parts behind it (`store`, `store-cart`, `store-checkout`, `store-order-timeline`, `store-orders-admin` and others) are in the [catalogue](?page=docs-catalogue-components) under Commerce.

## All page templates

The list below is read from this Storybook's index, grouped by area.
