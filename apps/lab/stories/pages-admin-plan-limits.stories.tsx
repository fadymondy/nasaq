import type { Meta, StoryObj } from "@storybook/react-vite";
import { LimitsPageDemo } from "./_usage-demo";

const meta = { title: "Components/Pricing/Pages/Plan Limits", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LimitsPageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LimitsPageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <LimitsPageDemo /> };
