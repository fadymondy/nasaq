/*
 * One working storefront for the Pages/Store/Journey stories. It has no router: a `screen` in state picks what to
 * render, and cart, wishlist and orders are shared by every screen. Home, category, product, cart, checkout, order
 * placed and the account all use the real components with the data in ./_store-demo.
 *
 * Adapters written here (the components were built by separate teams):
 * - The header, footer, hero, tiles and breadcrumbs emit plain `#hash` links. One click handler on the frame turns
 *   them into screens (`routeForHash`), so no component needed a router prop.
 * - Products are added through `cartItemFromProduct` and `useStoreCart().add`, the one path every screen shares:
 *   listing and carousel cards, quick view, the product page, wishlist "move to cart" and "Order again".
 * - The checkout renders its own confirmation, so it is given a snapshot of the lines. Clearing the cart when the
 *   order is placed then does not empty the confirmation behind it.
 * - The account nav lists all five sections, so `sections` was added to StoreAccountNav (backwards compatible).
 */
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  type CommerceCartLine,
  type CommerceOrder,
  type CommerceProduct,
  type CommerceVariant,
  EMPTY_LISTING_FILTERS,
  ProductDetail,
  ProductQA,
  ProductReviews,
  type ReorderPlan,
  StoreAccountLayout,
  StoreAccountNav,
  StoreAccountOrder,
  type StoreAccountSection,
  StoreAddressBook,
  StoreAnnouncementBar,
  StoreBrandStrip,
  StoreCartPage,
  StoreCategoryTiles,
  StoreCheckout,
  StoreCrossSell,
  StoreFlashDeals,
  StoreFooter,
  StoreHeader,
  StoreHeroBanner,
  StoreListing,
  StoreMiniCart,
  StoreOrderHistory,
  StoreProductCarousel,
  StorePromoBanners,
  StoreQuickView,
  StoreRecentlyViewed,
  StoreWishlist,
  type WishlistItem,
  cartItemFromProduct,
  pushRecentlyViewed,
  removeRecent,
  removeWishlistItem,
  toggleNotify,
  useStoreCart,
} from "@nasaq/web";
import { type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { STORE_CURRENCY, fakePlaceOrder, storeLocalMethods, storePaymentPolicy, useDemoPromo, storeZones } from "./_cart-checkout-demo";
import {
  chromeAnnouncements,
  chromeBrands,
  chromeCategoryTree,
  chromeDeals,
  chromeFooterColumns,
  chromeHero,
  chromeLanguages,
  chromeCurrencies,
  chromeNav,
  chromePayments,
  chromePopular,
  chromePromos,
  chromeSocial,
  chromeTiles,
  useAr,
} from "./_store-chrome-demo";
import { ORDERS_NOW, TRACKING_TEMPLATE, ordersSeed, wishlistSeed } from "./_orders-demo";
import { breadcrumbs as pdpBreadcrumbs, delivery, manyReviews, questions, shippingInfo, sizeGuide, specs } from "./_product-demo";
import { type StoreLocale, storeAddresses, storeProducts } from "./_store-demo";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type JourneyScreen =
  | { name: "home" }
  | { name: "category"; category?: string; query?: string; sale?: boolean; brand?: string; nonce: number }
  | { name: "product"; id: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "account"; section: StoreAccountSection; orderId?: string };

/* ------------------------------------------------------------------ hash links to screens */

// [English, Arabic] category text; the listing's category ids are the products' category text per language.
const CATEGORY_OF: Record<string, [string, string]> = {
  clothing: ["Clothing", "ملابس"],
  tees: ["Clothing", "ملابس"],
  hoodies: ["Clothing", "ملابس"],
  autumn: ["Clothing", "ملابس"],
  shoes: ["Shoes", "أحذية"],
  sneakers: ["Shoes", "أحذية"],
  home: ["Home", "المنزل"],
  mugs: ["Home", "المنزل"],
  bottles: ["Home", "المنزل"],
  lighting: ["Home", "المنزل"],
  plants: ["Home", "المنزل"],
  ceramics: ["Home", "المنزل"],
  accessories: ["Accessories", "إكسسوارات"],
  caps: ["Accessories", "إكسسوارات"],
  watches: ["Accessories", "إكسسوارات"],
  electronics: ["Electronics", "إلكترونيات"],
  audio: ["Electronics", "إلكترونيات"],
  beauty: ["Beauty", "جمال"],
};

/** Where a `#hash` link goes. Returns undefined for links that have no page in this demo (the frame just ignores them). */
export function routeForHash(hash: string, ar: boolean, nonce: number): JourneyScreen | undefined {
  const key = decodeURIComponent(hash.replace(/^#/, ""));
  if (key === "" || key === "top") return { name: "home" };
  if (key === "cart") return { name: "cart" };
  if (key === "account") return { name: "account", section: "orders" };
  if (key.startsWith("cat:")) return { name: "category", category: key.slice(4), nonce };
  if (key.startsWith("product:")) return { name: "product", id: key.slice(8) };
  const cat = CATEGORY_OF[key];
  if (cat) return { name: "category", category: cat[ar ? 1 : 0], nonce };
  if (key === "sale" || key === "deals") return { name: "category", sale: true, nonce };
  if (key === "new" || key === "best" || key === "collection") return { name: "category", nonce };
  const brand = chromeBrands().find((b) => b.href === `#${key}`);
  if (brand) return { name: "category", brand: brand.name, nonce };
  return undefined;
}

/* ------------------------------------------------------------------ state */

/** Everything the screens share: what is on screen, the cart, the wishlist, the orders and what was viewed. */
export function useJourney(locale: StoreLocale) {
  const ar = locale === "ar";
  const products = useMemo(() => storeProducts(locale), [locale]);
  const [screen, setScreen] = useState<JourneyScreen>({ name: "home" });
  const nonce = useRef(0);
  const cart = useStoreCart({ feedback: "drawer" });
  const [wish, setWish] = useState<WishlistItem[]>(() => wishlistSeed(locale));
  const [orders, setOrders] = useState<CommerceOrder[]>(() => ordersSeed(locale));
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState<CommerceProduct | null>(null);
  const [checkoutLines, setCheckoutLines] = useState<CommerceCartLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const go = (next: JourneyScreen) => {
    setScreen(next);
    cart.setDrawerOpen(false);
    setQuick(null);
    if (next.name === "product") setRecent((r) => pushRecentlyViewed(r, next.id));
  };
  const goCategory = (opts: { category?: string; query?: string; sale?: boolean; brand?: string } = {}) => go({ name: "category", ...opts, nonce: ++nonce.current });
  const goHash = (hash: string) => {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    const next = products.some((p) => p.id === id) ? ({ name: "product", id } as JourneyScreen) : routeForHash(hash, ar, ++nonce.current);
    if (next) go(next);
  };

  /** The one add-to-cart path. Returns false when the variant is sold out. */
  const addVariant = (product: CommerceProduct, variantId: string | undefined, quantity = 1): boolean => {
    const item = cartItemFromProduct(product, variantId);
    if (!item) return false;
    cart.add(item, quantity);
    return true;
  };
  const addFromCard = (product: CommerceProduct, variant: CommerceVariant, quantity: number) => {
    addVariant(product, variant.id, quantity);
  };

  const toggleWish = (product: CommerceProduct, next: boolean) =>
    setWish((items) => {
      if (!next) return items.filter((i) => i.productId !== product.id);
      if (items.some((i) => i.productId === product.id)) return items;
      const variant = product.variants.find((v) => (v.stock ?? 1) > 0) ?? product.variants[0]!;
      return [{ id: `w-${product.id}`, productId: product.id, variantId: variant.id, addedAt: new Date().toISOString() }, ...items];
    });

  const reorder = (_order: CommerceOrder, plan: ReorderPlan) => {
    for (const line of plan.add) {
      const product = products.find((p) => p.id === line.productId);
      if (product) addVariant(product, line.variantId, line.quantity);
    }
  };

  const placed = (order: CommerceOrder) => {
    const cod = order.payment === "cod";
    const at = order.placedAt;
    const stored: CommerceOrder = {
      ...order,
      status: order.payment === "pending" ? "pending" : "processing",
      events: [
        { at, kind: "placed", label: ar ? "تم إنشاء الطلب" : "Order placed" },
        ...(order.payment === "paid" ? [{ at, kind: "paid", label: ar ? "تم الدفع" : "Payment captured" }] : []),
        ...(cod ? [{ at, kind: "cod", label: ar ? "الدفع عند الاستلام" : "Pay on delivery" }] : []),
      ],
    };
    setOrders((all) => [stored, ...all.filter((o) => o.id !== stored.id)]);
    cart.replace([]);
  };

  return { ar, locale, products, screen, go, goCategory, goHash, cart, wish, setWish, toggleWish, orders, placed, recent, setRecent, search, setSearch, quick, setQuick, checkoutLines, setCheckoutLines, notice, setNotice, addVariant, addFromCard, reorder };
}

type Journey = ReturnType<typeof useJourney>;

/* ------------------------------------------------------------------ screens */

function HomeScreen({ j, now }: { j: Journey; now: number }) {
  const { ar, products } = j;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-6 sm:px-6 md:gap-16 md:py-10">
      <StoreHeroBanner items={chromeHero(ar)} />
      <StoreCategoryTiles items={chromeTiles(ar)} />
      <StoreFlashDeals deals={chromeDeals(ar, now)} currency={STORE_CURRENCY} viewAllHref="#deals" wishlistIds={j.wish.map((w) => w.productId)} onToggleWishlist={j.toggleWish} onAddToCart={j.addFromCard} onQuickView={j.setQuick} onNavigate={(p) => j.go({ name: "product", id: p.id })} />
      <StoreProductCarousel title={ar ? "الأكثر مبيعًا" : "Best sellers"} products={products.slice(0, 8)} currency={STORE_CURRENCY} viewAllHref="#best" wishlistIds={j.wish.map((w) => w.productId)} onToggleWishlist={j.toggleWish} onAddToCart={j.addFromCard} onQuickView={j.setQuick} onNavigate={(p) => j.go({ name: "product", id: p.id })} />
      <StorePromoBanners items={chromePromos(ar)} />
      <StoreProductCarousel title={ar ? "وصل حديثًا" : "New arrivals"} products={[...products].reverse().slice(0, 8)} currency={STORE_CURRENCY} perView={5} wishlistIds={j.wish.map((w) => w.productId)} onToggleWishlist={j.toggleWish} onAddToCart={j.addFromCard} onQuickView={j.setQuick} onNavigate={(p) => j.go({ name: "product", id: p.id })} />
      <StoreBrandStrip brands={chromeBrands()} />
    </div>
  );
}

function CategoryScreen({ j, screen }: { j: Journey; screen: Extract<JourneyScreen, { name: "category" }> }) {
  const { ar } = j;
  const heading = screen.query
    ? ar
      ? `نتائج البحث عن «${screen.query}»`
      : `Results for “${screen.query}”`
    : (screen.category ?? screen.brand ?? (screen.sale ? (ar ? "التخفيضات" : "Sale") : ar ? "كل المنتجات" : "All products"));
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#top">{ar ? "الرئيسية" : "Home"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{heading}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <StoreListing
        key={screen.nonce}
        title={heading}
        products={j.products}
        currency={STORE_CURRENCY}
        categoryTree={chromeCategoryTree(ar)}
        defaultFilters={{
          ...EMPTY_LISTING_FILTERS,
          category: screen.category ?? null,
          query: screen.query ?? "",
          onSale: screen.sale ?? false,
          brands: screen.brand ? [screen.brand] : [],
        }}
        showQueryChip={Boolean(screen.query)}
        pageSize={8}
        popularSearches={chromePopular(ar)}
        onSearch={(query) => j.goCategory({ query })}
        wishlistIds={j.wish.map((w) => w.productId)}
        onToggleWishlist={j.toggleWish}
        onAddToCart={j.addFromCard}
        onNavigate={(p) => j.go({ name: "product", id: p.id })}
        onCompareAddToCart={(p) => j.addVariant(p, undefined)}
      />
    </div>
  );
}

function ProductScreen({ j, id }: { j: Journey; id: string }) {
  const { ar } = j;
  const product = j.products.find((p) => p.id === id);
  if (!product) return null;
  const hasSizeGuide = product.id === "tee" || product.id === "hoodie";
  const wished = j.wish.some((w) => w.productId === product.id);
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <ProductDetail
        key={product.id}
        product={product}
        currency={STORE_CURRENCY}
        breadcrumbs={[
          { label: ar ? "الرئيسية" : "Home", href: "#top" },
          { label: product.category ?? "", href: `#cat:${encodeURIComponent(product.category ?? "")}` },
          { label: product.name },
        ]}
        {...(hasSizeGuide ? { sizeGuide: sizeGuide(ar) } : {})}
        delivery={delivery(ar)}
        specs={specs(ar)}
        shippingInfo={shippingInfo(ar)}
        wishlisted={wished}
        onWishlistChange={(next) => j.toggleWish(product, next)}
        onAddToCart={(variant, quantity) => {
          if (!j.addVariant(product, variant.id, quantity)) return { error: ar ? "هذا الخيار نفد من المخزون." : "That option is out of stock." };
        }}
        onBuyNow={(variant, quantity) => {
          if (!j.addVariant(product, variant.id, quantity)) return { error: ar ? "هذا الخيار نفد من المخزون." : "That option is out of stock." };
          j.cart.setDrawerOpen(false);
          j.setCheckoutLines(j.cart.active);
          j.go({ name: "checkout" });
        }}
        reviews={
          <div className="flex flex-col gap-12">
            <ProductReviews reviews={manyReviews(ar)} onSubmitReview={async () => wait(800)} formProps={{ askFit: true, askName: true }} onVoteHelpful={async () => wait(300)} onReport={async () => wait(500)} />
            <ProductQA questions={questions(ar)} onAsk={async () => wait(600)} onAnswer={async () => wait(600)} />
          </div>
        }
        relatedTitle={ar ? "قد يعجبك أيضًا" : "You may also like"}
        related={
          <StoreProductCarousel
            products={j.products.filter((p) => p.id !== product.id).slice(0, 8)}
            currency={STORE_CURRENCY}
            label={ar ? "قد يعجبك أيضًا" : "You may also like"}
            wishlistIds={j.wish.map((w) => w.productId)}
            onToggleWishlist={j.toggleWish}
            onAddToCart={j.addFromCard}
            onQuickView={j.setQuick}
            onNavigate={(p) => j.go({ name: "product", id: p.id })}
          />
        }
      />
    </div>
  );
}

function CartScreen({ j }: { j: Journey }) {
  const { cart, ar } = j;
  const promo = useDemoPromo();
  return (
    <StoreCartPage
      lines={cart.lines}
      currency={STORE_CURRENCY}
      message={cart.message}
      onQuantityChange={cart.setQuantity}
      onRemove={cart.remove}
      onSaveForLater={cart.saveForLater}
      onMoveToCart={cart.moveToCart}
      onFixStock={cart.fixStock}
      removed={cart.removed}
      onUndo={cart.undo}
      onDismissRemoved={cart.dismissRemoved}
      onOpenProduct={(line) => j.go({ name: "product", id: line.productId })}
      freeShippingThreshold={150000}
      zones={storeZones(j.locale)}
      promo={promo}
      crossSell={<StoreCrossSell products={j.products.filter((p) => !cart.lines.some((l) => l.productId === p.id)).slice(0, 5)} currency={STORE_CURRENCY} onAdd={(p) => void j.addVariant(p, undefined)} onOpenProduct={(p) => j.go({ name: "product", id: p.id })} />}
      onCheckout={() => {
        j.setCheckoutLines(cart.active);
        j.go({ name: "checkout" });
      }}
      onContinueShopping={() => j.go({ name: "home" })}
      labels={ar ? {} : {}}
    />
  );
}

let orderSerial = 0;

function CheckoutScreen({ j }: { j: Journey }) {
  const { ar, locale } = j;
  const shipping = useMemo(() => storeAddresses(locale), [locale]);
  const place = useMemo(() => fakePlaceOrder({ delay: 900 }), []);
  return (
    <StoreCheckout
      lines={j.checkoutLines}
      currency={STORE_CURRENCY}
      shippingMethods={j.locale === "ar" ? shippingMethodsAr : shippingMethodsEn}
      savedAddresses={shipping}
      account={{ name: ar ? "سارة أحمد" : "Sara Ahmed", email: "sara@example.com" }}
      paymentPolicy={storePaymentPolicy}
      localMethods={storeLocalMethods(locale)}
      onLocalSubmit={async () => undefined}
      giftWrapFee={5000}
      weekend={[5, 6]}
      now={new Date()}
      onPlaceOrder={async (draft) => {
        const result = await place(draft);
        if (result && "error" in result && result.error) return result;
        orderSerial += 1;
        return { orderNumber: `#${1049 + j.orders.filter((o) => o.id.startsWith("ord-105")).length + 1 + orderSerial * 0}` };
      }}
      onPlaced={j.placed}
      onEditCart={() => j.go({ name: "cart" })}
      onContinueShopping={() => j.go({ name: "home" })}
      onTrackOrder={(order) => j.go({ name: "account", section: "orders", orderId: order.id })}
    />
  );
}

// Shipping methods for the demo store, resolved once per language.
import { storeShippingMethods } from "./_store-demo";
const shippingMethodsEn = storeShippingMethods("en");
const shippingMethodsAr = storeShippingMethods("ar");

function AccountScreen({ j, screen }: { j: Journey; screen: Extract<JourneyScreen, { name: "account" }> }) {
  const { ar } = j;
  const [addresses, setAddresses] = useState(() => storeAddresses(j.locale));
  const order = j.orders.find((o) => o.id === screen.orderId);
  const setSection = (section: StoreAccountSection) => j.go({ name: "account", section });
  let body: ReactNode;
  if (screen.section === "orders" && order) {
    body = (
      <StoreAccountOrder
        order={order}
        currency={STORE_CURRENCY}
        products={j.products}
        trackingTemplate={TRACKING_TEMPLATE}
        now={ORDERS_NOW.getTime() > Date.now() ? ORDERS_NOW : new Date()}
        onBack={() => setSection("orders")}
        onReorder={j.reorder}
        onOpenCart={() => j.go({ name: "cart" })}
      />
    );
  } else if (screen.section === "orders") {
    body = (
      <StoreOrderHistory
        orders={j.orders}
        products={j.products}
        currency={STORE_CURRENCY}
        trackingTemplate={TRACKING_TEMPLATE}
        onOpenOrder={(o) => j.go({ name: "account", section: "orders", orderId: o.id })}
        onReorder={j.reorder}
        onOpenCart={() => j.go({ name: "cart" })}
      />
    );
  } else if (screen.section === "wishlist") {
    body = (
      <StoreWishlist
        items={j.wish}
        products={j.products}
        currency={STORE_CURRENCY}
        onMoveToCart={(entry) => {
          if (entry.product && j.addVariant(entry.product, entry.item.variantId)) j.setWish((w) => removeWishlistItem(w, entry.item.id));
        }}
        onToggleNotify={(item) => j.setWish((w) => toggleNotify(w, item.id))}
        onRemove={(item) => j.setWish((w) => removeWishlistItem(w, item.id))}
        onOpenProduct={(p) => j.go({ name: "product", id: p.id })}
      />
    );
  } else if (screen.section === "addresses") {
    body = <StoreAddressBook addresses={addresses} onChange={setAddresses} countries={["EG", "SA", "AE", "KW", "JO"]} />;
  } else {
    body = (
      <StoreRecentlyViewed
        ids={j.recent}
        products={j.products}
        currency={STORE_CURRENCY}
        onOpenProduct={(p) => j.go({ name: "product", id: p.id })}
        onRemove={(id) => j.setRecent((r) => removeRecent(r, id))}
        onClear={() => j.setRecent([])}
      />
    );
  }
  return (
    <StoreAccountLayout
      title={ar ? "حسابي" : "My account"}
      nav={<StoreAccountNav active={screen.section} onNavigate={setSection} sections={["orders", "wishlist", "addresses", "recent"]} counts={{ orders: j.orders.length, wishlist: j.wish.length, recent: j.recent.length }} />}
    >
      {body}
    </StoreAccountLayout>
  );
}

/* ------------------------------------------------------------------ the frame */

/** The whole storefront: header with live counts, the current screen, the mini cart, quick view and the footer. */
export function JourneyStore() {
  const ar = useAr();
  const locale: StoreLocale = ar ? "ar" : "en";
  return <JourneyFrame key={locale} locale={locale} />;
}

function JourneyFrame({ locale }: { locale: StoreLocale }) {
  const j = useJourney(locale);
  const { ar, screen, cart } = j;
  const now = useMemo(() => Date.now(), []);
  const [lang, setLang] = useState(locale);
  const [currency, setCurrency] = useState(ar ? "SAR" : "USD");
  const top = useRef<HTMLDivElement>(null);

  // A new screen starts at the top, like a page load.
  const key = screen.name === "product" ? `product:${screen.id}` : screen.name === "category" ? `category:${screen.nonce}` : screen.name === "account" ? `account:${screen.section}:${screen.orderId ?? ""}` : screen.name;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [key]);

  const onFrameClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    event.preventDefault();
    j.goHash(link.getAttribute("href") ?? "#");
  };

  const Body = screen.name === "account" ? "div" : "main";
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: delegated handler for the demo's #hash links; the links themselves are keyboard reachable.
    <div ref={top} className="min-h-dvh bg-background text-foreground" onClick={onFrameClick}>
      <StoreHeader
        brand={ar ? "متجر النيل" : "Nile Store"}
        brandHref="#top"
        nav={chromeNav(ar)}
        announcement={<StoreAnnouncementBar items={chromeAnnouncements(ar)} />}
        search={{
          products: j.products,
          categoryTree: chromeCategoryTree(ar),
          currency: STORE_CURRENCY,
          popular: chromePopular(ar),
          value: j.search,
          onValueChange: j.setSearch,
          onSearch: (query) => j.goCategory({ query }),
          onSelectProduct: (p) => j.go({ name: "product", id: p.id }),
          onSelectCategory: (id) => j.goCategory({ category: id }),
        }}
        cartCount={cart.count}
        onCartClick={() => cart.setDrawerOpen(true)}
        wishlistCount={j.wish.length}
        onWishlistClick={() => j.go({ name: "account", section: "wishlist" })}
        onAccountClick={() => j.go({ name: "account", section: "orders" })}
      />
      <Body id="journey-screen">
        {screen.name === "home" ? <HomeScreen j={j} now={now} /> : null}
        {screen.name === "category" ? <CategoryScreen j={j} screen={screen} /> : null}
        {screen.name === "product" ? <ProductScreen j={j} id={screen.id} /> : null}
        {screen.name === "cart" ? <CartScreen j={j} /> : null}
        {screen.name === "checkout" ? <CheckoutScreen key="checkout" j={j} /> : null}
        {screen.name === "account" ? <AccountScreen j={j} screen={screen} /> : null}
      </Body>
      <StoreFooter
        brand={ar ? "متجر النيل" : "Nile Store"}
        tagline={ar ? "أساسيات يومية بجودة تدوم." : "Everyday essentials, built to last."}
        columns={chromeFooterColumns(ar)}
        onSubscribe={async () => wait(600)}
        payments={chromePayments().map((p) => (
          <span key={p} className="rounded-control border border-border bg-card px-2 py-1 text-caption text-foreground">
            {p}
          </span>
        ))}
        social={chromeSocial}
        languages={chromeLanguages}
        language={lang}
        onLanguageChange={(v) => setLang(v as StoreLocale)}
        currencies={chromeCurrencies}
        currency={currency}
        onCurrencyChange={setCurrency}
        legal={ar ? "© ٢٠٢٦ متجر النيل. جميع الحقوق محفوظة." : "© 2026 Nile Store. All rights reserved."}
      />
      <StoreMiniCart
        open={cart.drawerOpen}
        onOpenChange={cart.setDrawerOpen}
        lines={cart.lines}
        currency={STORE_CURRENCY}
        freeShippingThreshold={150000}
        onQuantityChange={cart.setQuantity}
        onRemove={cart.remove}
        removed={cart.removed}
        onUndo={cart.undo}
        onDismissRemoved={cart.dismissRemoved}
        onViewCart={() => j.go({ name: "cart" })}
        onCheckout={() => {
          j.setCheckoutLines(cart.active);
          j.go({ name: "checkout" });
        }}
        onContinueShopping={() => cart.setDrawerOpen(false)}
      />
      <StoreQuickView product={j.quick} open={j.quick !== null} onOpenChange={(o) => !o && j.setQuick(null)} currency={STORE_CURRENCY} onAddToCart={j.addFromCard} />
    </div>
  );
}
