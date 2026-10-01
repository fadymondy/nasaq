import { StoreBrandStrip, StoreCategoryTiles, StoreCountdown, StoreFlashDeals, StoreHeroBanner, StoreProductCarousel, StorePromoBanners, merchRelatedProducts } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { STORE_CURRENCY, chromeBrands, chromeDeals, chromeHero, chromePromos, chromeTiles, storeProducts, useAr, wait } from "./_store-chrome-demo";

const meta = { title: "Components/Storefront/Store Merchandising", component: StoreProductCarousel, parameters: { layout: "padded" } } satisfies Meta<typeof StoreProductCarousel>;
export default meta;
type Story = StoryObj;

/** Six image tiles that lead into categories. */
export const CategoryTiles: Story = {
  render: function Render() {
    return <StoreCategoryTiles items={chromeTiles(useAr())} />;
  },
};

/** Two banners rotate with arrows and dots. Autoplay stops on hover, focus and reduced motion. */
export const HeroBanner: Story = {
  render: function Render() {
    return <StoreHeroBanner items={chromeHero(useAr())} />;
  },
};

export const PromoBanners: Story = {
  render: function Render() {
    return <StorePromoBanners items={chromePromos(useAr())} />;
  },
};

/** Live countdown to the soonest ending deal with a stock progress bar under each card. */
export const FlashDeals: Story = {
  render: function Render() {
    const ar = useAr();
    const now = useMemo(() => Date.now(), []);
    return <StoreFlashDeals deals={chromeDeals(ar, now)} currency={STORE_CURRENCY} viewAllHref="#deals" onAddToCart={async () => wait(500)} onQuickView={() => undefined} />;
  },
};

export const FlashDealsArabic: Story = { globals: { locale: "ar" }, render: FlashDeals.render! };

/** The countdown alone, and the state after it ends. */
export const Countdown: Story = {
  render: function Render() {
    const now = useMemo(() => Date.now(), []);
    return (
      <div className="flex flex-col gap-4">
        <StoreCountdown endsAt={now + 2 * 86_400_000 + 3_723_000} />
        <StoreCountdown endsAt={now + 12_000} />
        <StoreCountdown endsAt={now - 1000} />
      </div>
    );
  },
};

/** Related products: reuses the storefront card, so quick add and swatches work in the row. */
export const RelatedProducts: Story = {
  render: function Render() {
    const ar = useAr();
    const all = storeProducts(ar ? "ar" : "en");
    return <StoreProductCarousel products={merchRelatedProducts(all, all[0]!, 8)} currency={STORE_CURRENCY} onAddToCart={async () => wait(500)} onQuickView={() => undefined} />;
  },
};

export const RecentlyViewed: Story = {
  render: function Render() {
    const ar = useAr();
    const all = storeProducts(ar ? "ar" : "en");
    return <StoreProductCarousel title={ar ? "شاهدتها مؤخرًا" : "Recently viewed"} products={all.slice(2, 10)} currency={STORE_CURRENCY} viewAllHref="#viewed" perView={5} />;
  },
};

export const RelatedProductsArabic: Story = { globals: { locale: "ar" }, render: RelatedProducts.render! };

/** Text names by default; pass an official logo per brand to show it instead. */
export const BrandStrip: Story = {
  render: function Render() {
    useAr();
    return <StoreBrandStrip brands={chromeBrands()} />;
  },
};
