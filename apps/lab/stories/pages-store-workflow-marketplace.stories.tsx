/* Workflow marketplace: browse and install steps and presets. Demo data lives in ./_workflow-demo.tsx. */
import { WorkflowMarketplace } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowPage, marketCategories, marketListings, useAr, wait } from "./_workflow-demo";

const meta = { title: "Components/Workflow/Pages/Workflow Marketplace", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <FlowPage title={ar ? "متجر الخطوات" : "Workflow marketplace"} description={ar ? "خطوات جاهزة وقوالب كاملة لأتمتة عملك." : "Ready-made steps and full presets to automate your work."}>
      <WorkflowMarketplace listings={marketListings(ar)} categories={marketCategories(ar)} onInstall={async () => wait(900)} onUninstall={async () => wait(600)} />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
