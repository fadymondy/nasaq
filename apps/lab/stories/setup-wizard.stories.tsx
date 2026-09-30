import type { Meta, StoryObj } from "@storybook/react-vite";
import { CenteredPage, WizardDemo } from "./_onboarding-demo";

const meta = { title: "Pages/App/Setup Wizard", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ gated, agentDelay }: { gated?: boolean; agentDelay?: number | null }) {
  return (
    <CenteredPage>
      <WizardDemo gated={gated} agentDelay={agentDelay} />
    </CenteredPage>
  );
}

/** Leave the workspace name empty and continue to see a server error. The agent connects four seconds after step 3 opens. */
export const Default: Story = { render: () => <Page /> };
/** The server has not marked setup complete, so Finish stays blocked with a reason. */
export const Gated: Story = { render: () => <Page gated /> };
/** The agent never shows up and the wait times out with a retry. */
export const AgentTimeout: Story = { name: "Agent timeout", render: () => <Page agentDelay={null} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
