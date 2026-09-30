import { WorkflowMarketplace } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { marketCategories, marketListings, useAr, wait } from "./_workflow-demo";

const meta = { title: "Components/Workflow/Workflow Marketplace", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return <WorkflowMarketplace listings={marketListings(ar)} categories={marketCategories(ar)} onInstall={async () => wait(900)} onUninstall={async () => wait(600)} />;
}

/** Steps show what they take, give and ask for; presets show their diagram. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
