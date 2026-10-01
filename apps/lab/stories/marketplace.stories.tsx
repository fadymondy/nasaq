import { Marketplace } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { marketCats, marketListings, marketTemplates, permissionOptions, templateCats, useAr, wait } from "./_devtools-q3-demo";

const meta = { title: "Components/Storefront/Marketplace", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return (
    <Marketplace
      listings={marketListings(ar)}
      categories={marketCats(ar)}
      templates={marketTemplates(ar)}
      templateCategories={templateCats(ar)}
      permissionOptions={permissionOptions(ar)}
      onInstall={async () => wait(900)}
      onUninstall={async () => wait(600)}
      onPublish={async () => wait(900)}
      onUseTemplate={async () => wait(700)}
    />
  );
}

/** A featured strip over the catalog; opening an extension shows its detail page. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
