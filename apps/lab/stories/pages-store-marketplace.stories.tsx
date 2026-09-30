/* Marketplace: store, extension detail page, publish form and template gallery. Demo data lives in ./_devtools-q3-demo.tsx. */
import { Marketplace } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowPage, marketCats, marketListings, marketTemplates, permissionOptions, templateCats, useAr, wait } from "./_devtools-q3-demo";

const meta = { title: "Pages/Store/Marketplace", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <FlowPage title={ar ? "المتجر" : "Marketplace"} description={ar ? "إضافات وقوالب جاهزة لمساحة عملك." : "Extensions and templates for your workspace."}>
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
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
