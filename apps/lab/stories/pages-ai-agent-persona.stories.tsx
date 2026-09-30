import type { Meta, StoryObj } from "@storybook/react-vite";
import { AgentPersonaDemo, T2Page, useAr } from "./_t2-demo";

const meta = { title: "Pages/AI/Agent Persona", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <T2Page title={ar ? "شخصية الوكيل" : "Agent persona"} description={ar ? "حدد كيف يتحدث الوكيل ويتصرف." : "Shape how the agent speaks and behaves."}>
      <AgentPersonaDemo />
    </T2Page>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
