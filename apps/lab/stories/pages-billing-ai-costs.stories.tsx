import type { Meta, StoryObj } from "@storybook/react-vite";
import { AiCostPageDemo } from "./_usage-demo";

const meta = { title: "Components/Billing/Pages/AI Costs", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AiCostPageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AiCostPageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AiCostPageDemo /> };
