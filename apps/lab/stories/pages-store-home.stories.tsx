/* Store home: header, hero, category tiles, flash deals, carousels, brands and footer. Demo data in ./_store-chrome-demo. */
import { StoreBrandStrip, StoreCategoryTiles, StoreFlashDeals, StoreHeroBanner, StoreProductCarousel, StoreQuickView, StorePromoBanners, type CommerceProduct } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { STORE_CURRENCY, StoreShell, chromeBrands, chromeDeals, chromeHero, chromePromos, chromeTiles, storeProducts, useAr, wait } from "./_store-chrome-demo";

const meta = { title: "Components/Storefront/Pages/Home", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Home({ empty = false }: { empty?: boolean }) {
  const ar = useAr();
  const now = useMemo(() => Date.now(), []);
  const [quick, setQuick] = useState<CommerceProduct | null>(null);
  const products = empty ? [] : storeProducts(ar ? "ar" : "en");
  return (
    <StoreShell>
      {({ addToCart }) => (
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-6 sm:px-6 md:gap-16 md:py-10">
          <StoreHeroBanner items={chromeHero(ar)} />
          <StoreCategoryTiles items={chromeTiles(ar)} />
          <StoreFlashDeals deals={empty ? [] : chromeDeals(ar, now)} currency={STORE_CURRENCY} viewAllHref="#deals" onAddToCart={addToCart} onQuickView={setQuick} />
          <StoreProductCarousel title={ar ? "الأكثر مبيعًا" : "Best sellers"} products={products.slice(0, 8)} currency={STORE_CURRENCY} viewAllHref="#best" onAddToCart={addToCart} onQuickView={setQuick} />
          <StorePromoBanners items={chromePromos(ar)} />
          <StoreProductCarousel title={ar ? "وصل حديثًا" : "New arrivals"} products={[...products].reverse().slice(0, 8)} currency={STORE_CURRENCY} perView={5} onAddToCart={addToCart} onQuickView={setQuick} />
          <StoreBrandStrip brands={chromeBrands()} />
          {quick ? <StoreQuickView product={quick} open onOpenChange={(o) => !o && setQuick(null)} currency={STORE_CURRENCY} onAddToCart={async () => { await wait(300); await addToCart(); }} /> : null}
        </div>
      )}
    </StoreShell>
  );
}

export const Default: Story = { render: () => <Home /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Home /> };

/** A phone-width frame (390px): hero stacks, tiles go two-up, the menu is a sheet, search has its own row. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="mx-auto w-[390px] max-w-full">
      <Home />
    </div>
  ),
};

/** A new store with no deals or products yet: the blocks that have nothing to show simply disappear. */
export const EmptyCatalogue: Story = { render: () => <Home empty /> };
