/* Store category page: header, breadcrumb, listing with facets and footer. Demo data in ./_store-chrome-demo. */
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, EMPTY_LISTING_FILTERS, StoreListing } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, StoreShell, chromeCategoryTree, chromePopular, storeProducts, useAr } from "./_store-chrome-demo";

const meta = { title: "Components/Storefront/Pages/Category", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Category({ state = "ready", category }: { state?: "ready" | "loading" | "empty" | "error"; category?: string }) {
  const ar = useAr();
  const name = category ?? (ar ? "ملابس" : "Clothing");
  return (
    <StoreShell>
      {({ addToCart }) => (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#home">{ar ? "الرئيسية" : "Home"}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <StoreListing
            title={name}
            products={state === "empty" ? [] : storeProducts(ar ? "ar" : "en")}
            currency={STORE_CURRENCY}
            categoryTree={chromeCategoryTree(ar)}
            defaultFilters={{ ...EMPTY_LISTING_FILTERS, category: name }}
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

export const Default: Story = { render: () => <Category /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Category /> };

/** A phone-width frame (390px): the facet sidebar becomes a Filters button and sheet. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="mx-auto w-[390px] max-w-full">
      <Category />
    </div>
  ),
};

export const Loading: Story = { render: () => <Category state="loading" /> };

export const Empty: Story = { render: () => <Category state="empty" /> };

export const ErrorState: Story = { render: () => <Category state="error" /> };
