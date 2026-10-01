import { CatalogStore } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { marketCategories, marketListings, useAr, wait } from "./_workflow-demo";

const meta = { title: "Components/Storefront/Catalog Store", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ fail }: { fail?: boolean }) {
  const ar = useAr();
  const items = marketListings(ar).map(({ kind: _k, step: _s, preset: _p, ...item }) => item);
  return (
    <CatalogStore
      items={items}
      categories={marketCategories(ar)}
      onInstall={async () => {
        await wait(900);
        return fail ? { error: ar ? "خطتك الحالية لا تشمل هذا العنصر." : "Your current plan does not include this." } : undefined;
      }}
      onUninstall={async () => {
        await wait(600);
      }}
    />
  );
}

/** Search, categories, sort, a detail sheet and install. */
export const Default: Story = { render: () => <Demo /> };
/** Install returns an error: the sheet says why and the item stays available. */
export const InstallFails: Story = { render: () => <Demo fail /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
