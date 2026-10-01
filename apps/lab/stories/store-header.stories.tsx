import { StoreAnnouncementBar, StoreFooter, StoreHeader, StoreMegaMenu, StoreSearch } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  STORE_CURRENCY,
  chromeAnnouncements,
  chromeCategoryTree,
  chromeCurrencies,
  chromeFooterColumns,
  chromeLanguages,
  chromeNav,
  chromePayments,
  chromePopular,
  chromeSocial,
  storeProducts,
  useAr,
  wait,
} from "./_store-chrome-demo";

const meta = { title: "Components/Storefront/Store Header", component: StoreHeader, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof StoreHeader>;
export default meta;
type Story = StoryObj;

function Header() {
  const ar = useAr();
  const [cart, setCart] = useState(2);
  const [q, setQ] = useState("");
  const [last, setLast] = useState("");
  return (
    <div>
      <StoreHeader
        brand={ar ? "متجر النيل" : "Nile Store"}
        nav={chromeNav(ar)}
        announcement={<StoreAnnouncementBar items={chromeAnnouncements(ar)} />}
        search={{
          products: storeProducts(ar ? "ar" : "en"),
          categoryTree: chromeCategoryTree(ar),
          currency: STORE_CURRENCY,
          popular: chromePopular(ar),
          value: q,
          onValueChange: setQ,
          onSearch: (s) => setLast(s),
          onSelectProduct: (p) => setLast(p.name),
          onSelectCategory: (_id, label) => setLast(label),
        }}
        cartCount={cart}
        onCartClick={() => setCart((c) => c + 1)}
        wishlistCount={3}
        onWishlistClick={() => undefined}
        onAccountClick={() => undefined}
      />
      <p className="p-6 text-body-sm text-muted-foreground" role="status">
        {last ? (ar ? `آخر اختيار: ${last}` : `Last chosen: ${last}`) : ar ? "اكتب في البحث أو اضغط على السلة." : "Type in the search or press the cart."}
      </p>
    </div>
  );
}

/** Announcement bar, sticky header with mega menu, search autocomplete and a cart count that grows when pressed. */
export const Default: Story = { render: () => <Header /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Header /> };

/** The bar alone: rotates every few seconds, stops on hover and focus, dismissible. */
export const AnnouncementBar: Story = {
  render: function Render() {
    const ar = useAr();
    return <StoreAnnouncementBar items={chromeAnnouncements(ar)} interval={3000} />;
  },
};

/** Search on its own: recent and popular on focus, categories and products while typing. Arrow keys and Enter work. */
export const Search: Story = {
  render: function Render() {
    const ar = useAr();
    return (
      <div className="mx-auto max-w-xl p-6">
        <StoreSearch products={storeProducts(ar ? "ar" : "en")} categoryTree={chromeCategoryTree(ar)} currency={STORE_CURRENCY} popular={chromePopular(ar)} onSearch={() => undefined} />
      </div>
    );
  },
};

export const SearchArabic: Story = { globals: { locale: "ar" }, render: Search.render! };

/** Just the mega menu, for placing in your own header. */
export const MegaMenu: Story = {
  render: function Render() {
    const ar = useAr();
    return (
      <div className="p-6">
        <StoreMegaMenu items={chromeNav(ar)} currentId="home" />
      </div>
    );
  },
};

function Footer() {
  const ar = useAr();
  const [lang, setLang] = useState(ar ? "ar" : "en");
  const [cur, setCur] = useState("EGP");
  return (
    <StoreFooter
      brand={ar ? "متجر النيل" : "Nile Store"}
      tagline={ar ? "أساسيات يومية بجودة تدوم." : "Everyday essentials, built to last."}
      columns={chromeFooterColumns(ar)}
      onSubscribe={async (email) => {
        await wait(700);
        if (email.startsWith("fail")) throw new Error("no");
      }}
      payments={chromePayments().map((p) => (
        <span key={p} className="rounded-control border border-border bg-card px-2 py-1 text-caption">
          {p}
        </span>
      ))}
      social={chromeSocial}
      languages={chromeLanguages}
      language={lang}
      onLanguageChange={setLang}
      currencies={chromeCurrencies}
      currency={cur}
      onCurrencyChange={setCur}
      legal={ar ? "© ٢٠٢٦ متجر النيل." : "© 2026 Nile Store."}
    />
  );
}

/** Newsletter validates the address and shows the result live. Start the address with "fail" to see the error. */
export const FooterDefault: Story = { render: () => <Footer /> };

export const FooterArabic: Story = { globals: { locale: "ar" }, render: () => <Footer /> };
