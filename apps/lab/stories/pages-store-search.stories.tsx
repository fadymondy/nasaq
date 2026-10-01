/* Store search results: header with the query in the box, results with a query chip, and suggestions when nothing matches. */
import { EMPTY_LISTING_FILTERS, StoreListing } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, StoreShell, chromeCategoryTree, chromePopular, storeProducts, useAr } from "./_store-chrome-demo";

const meta = { title: "Components/Storefront/Pages/Search", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Search({ query, state = "ready" }: { query: string; state?: "ready" | "loading" | "error" }) {
  const ar = useAr();
  return (
    <StoreShell query={query}>
      {({ addToCart }) => (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <StoreListing
            title={ar ? `نتائج البحث عن «${query}»` : `Results for “${query}”`}
            products={storeProducts(ar ? "ar" : "en")}
            currency={STORE_CURRENCY}
            categoryTree={chromeCategoryTree(ar)}
            defaultFilters={{ ...EMPTY_LISTING_FILTERS, query }}
            showQueryChip
            pageSize={8}
            loading={state === "loading"}
            error={state === "error"}
            onRetry={() => undefined}
            popularSearches={chromePopular(ar)}
            onAddToCart={addToCart}
          />
        </div>
      )}
    </StoreShell>
  );
}

export const Default: Story = { render: function Render() { return <Search query={useAr() ? "هودي" : "hoodie"} />; } };

export const Arabic: Story = { globals: { locale: "ar" }, render: function Render() { return <Search query="قميص" />; } };

/** No matches: the empty state offers to remove filters and shows popular searches. */
export const NoResults: Story = { render: function Render() { return <Search query={useAr() ? "خيمة" : "zzz tent"} />; } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: function Render() {
    return (
      <div className="mx-auto w-[390px] max-w-full">
        <Search query={useAr() ? "هودي" : "cotton"} />
      </div>
    );
  },
};

export const Loading: Story = { render: () => <Search query="cotton" state="loading" /> };

export const ErrorState: Story = { render: () => <Search query="cotton" state="error" /> };
