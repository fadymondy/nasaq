import { StoreCompareTable, StoreListing, StoreProductCard, StoreQuickView } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { STORE_CURRENCY, chromeCategoryTree, chromePopular, storeProducts, useAr, wait } from "./_store-chrome-demo";

const meta = { title: "Components/Commerce/Store Listing", component: StoreListing, parameters: { layout: "padded" } } satisfies Meta<typeof StoreListing>;
export default meta;
type Story = StoryObj;

function Listing({ paging = "pages" as "pages" | "load-more", view = "grid" as "grid" | "list", empty = false, loading = false, error = false, pageSize = 8 }) {
  const ar = useAr();
  const products = empty ? [] : storeProducts(ar ? "ar" : "en");
  return (
    <StoreListing
      title={ar ? "كل المنتجات" : "All products"}
      products={products}
      currency={STORE_CURRENCY}
      categoryTree={chromeCategoryTree(ar)}
      pageSize={pageSize}
      paging={paging}
      defaultView={view}
      loading={loading}
      error={error}
      onRetry={() => undefined}
      popularSearches={chromePopular(ar)}
      onAddToCart={async () => wait(500)}
      onCompareAddToCart={() => undefined}
    />
  );
}

/** Facets with counts, chips, sort, grid and list, pagination, quick view and compare (tick two or more cards). */
export const Default: Story = { render: () => <Listing /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Listing /> };

export const LoadMore: Story = { render: () => <Listing paging="load-more" pageSize={4} /> };

export const ListView: Story = { render: () => <Listing view="list" /> };

export const Loading: Story = { render: () => <Listing loading /> };

export const Empty: Story = { render: () => <Listing empty /> };

export const ErrorState: Story = { render: () => <Listing error /> };

/** A phone-width frame: filters move into a sheet with an Apply button. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="mx-auto w-[390px] max-w-full">
      <Listing pageSize={6} />
    </div>
  ),
};

/** The card on its own, as used in carousels and search: swatches, second image on hover, wishlist, quick add. */
export const ProductCard: Story = {
  render: function Render() {
    const ar = useAr();
    const list = storeProducts(ar ? "ar" : "en");
    return (
      <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {list.slice(0, 3).map((p) => (
          <StoreProductCard key={p.id} product={p} currency={STORE_CURRENCY} onAddToCart={async () => wait(500)} onQuickView={() => undefined} onToggleCompare={() => undefined} />
        ))}
      </div>
    );
  },
};

/** The quick view dialog, opened from a button. */
export const QuickView: Story = {
  render: function Render() {
    const ar = useAr();
    const [open, setOpen] = useState(true);
    const product = storeProducts(ar ? "ar" : "en")[0]!;
    return (
      <>
        <button type="button" className="rounded-control border border-border px-3 py-2 text-body-sm" onClick={() => setOpen(true)}>
          {ar ? "فتح العرض السريع" : "Open quick view"}
        </button>
        <StoreQuickView product={product} open={open} onOpenChange={setOpen} currency={STORE_CURRENCY} onAddToCart={async () => wait(500)} />
      </>
    );
  },
};

/** The comparison table with the differences-only switch. */
export const CompareTable: Story = {
  render: function Render() {
    const ar = useAr();
    const list = storeProducts(ar ? "ar" : "en");
    return <StoreCompareTable products={[list[0]!, list[1]!, list[5]!]} currency={STORE_CURRENCY} onRemove={() => undefined} />;
  },
};
