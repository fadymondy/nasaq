/* API reference: MCP tools with scope, minimum role, arguments and examples. Demo data lives in ./_devtools-q3-demo.tsx. */
import { ApiReference } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { apiTools, FlowPage, useAr } from "./_devtools-q3-demo";

const meta = { title: "Components/Developer Tools/Pages/API Reference", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <FlowPage title={ar ? "مرجع الأدوات" : "Tool reference"} description={ar ? "كل أداة يمكن لعميل MCP استدعاؤها." : "Every tool an MCP client can call."}>
      <ApiReference tools={apiTools(ar)} />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
