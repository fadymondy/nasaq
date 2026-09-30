import type { Meta, StoryObj } from "@storybook/react-vite";
import { LimitsDemo } from "./_usage-demo";

const meta = { title: "Components/Forms/Limits Editor", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Number, Unlimited or Inherit per resource, with what Inherit resolves to. Save appears when something changes. */
export const Default: Story = { render: () => <LimitsDemo pricing={false} keyLimits={false} /> };

/** Price and overage price columns. */
export const WithPricing: Story = { render: () => <LimitsDemo pricing keyLimits={false} /> };

/** Per-key rate limit and spend cap as well. */
export const KeyLimits: Story = { render: () => <LimitsDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LimitsDemo /> };
