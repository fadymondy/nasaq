import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlanUsageDemo } from "./_usage-demo";

const meta = { title: "Pages/Billing/Plan Usage", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <PlanUsageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <PlanUsageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <PlanUsageDemo /> };
