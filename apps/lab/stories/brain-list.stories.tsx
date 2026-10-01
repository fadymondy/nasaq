import { BrainCard, BrainList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeBrains } from "./_builders-demo";

const meta = { title: "Components/AI Agents/Brain List", component: BrainList, parameters: { layout: "padded" } } satisfies Meta<typeof BrainList>;
export default meta;
type Story = StoryObj;

/** Status, access, memory and source counts, members and last activity; filter by status, access and tag. */
export const Default: Story = { render: () => <BrainList brains={makeBrains("en")} onRowClick={() => undefined} /> };
export const Cards: Story = { render: () => <BrainList brains={makeBrains("en")} defaultView="cards" /> };
/** The card on its own, for dashboards and pickers. */
export const SingleCard: Story = {
  render: () => (
    <div className="max-w-xs rounded-card border border-border bg-card p-4">
      <BrainCard brain={makeBrains("en")[0]!} />
    </div>
  ),
};
export const Loading: Story = { render: () => <BrainList brains={[]} loading /> };
export const Empty: Story = { render: () => <BrainList brains={[]} /> };
export const ErrorState: Story = { render: () => <BrainList brains={[]} error="Could not load brains." onRetry={() => undefined} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BrainList brains={makeBrains("ar")} onRowClick={() => undefined} /> };
export const ArabicCards: Story = { globals: { locale: "ar" }, render: () => <BrainList brains={makeBrains("ar")} defaultView="cards" /> };
