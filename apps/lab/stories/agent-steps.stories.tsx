import type { Meta, StoryObj } from "@storybook/react-vite";
import { AgentConfirmDemo, AgentConfirmOnlyDemo, AgentStatesDemo } from "./_t1-demo";

const meta = { title: "Components/AI Agents/Agent Steps and Confirm" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** A run that pauses for a decision. Untick a change, Apply, and the run continues. Reject asks for a reason. */
export const WaitingForYou: Story = { render: () => <AgentConfirmDemo /> };

/** The first Apply fails and shows the error. Apply again to succeed. */
export const ApplyFails: Story = { render: () => <AgentConfirmDemo failApply /> };

/** Finished, failed with retry, and working runs. The api key argument is masked. */
export const States: Story = { render: () => <AgentStatesDemo /> };

/** The confirm card alone, with the high risk change unticked. */
export const ConfirmOnly: Story = { render: () => <AgentConfirmOnlyDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <AgentConfirmDemo />
      <AgentStatesDemo />
    </div>
  ),
};
