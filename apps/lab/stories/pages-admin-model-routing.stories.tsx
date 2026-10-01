import type { Meta, StoryObj } from "@storybook/react-vite";
import { RoutingPageDemo } from "./_usage-demo";

const meta = { title: "Components/AI Agents/Pages/Model Routing", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <RoutingPageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <RoutingPageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <RoutingPageDemo /> };
