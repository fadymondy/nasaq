import type { Meta, StoryObj } from "@storybook/react-vite";
import { RoutingDemo } from "./_usage-demo";

const meta = { title: "Components/AI Agents/Model Routing Editor", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Routes per task class with fallbacks, the active backend, and a dialog to register a provider or node. */
export const Default: Story = { render: () => <RoutingDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <RoutingDemo /> };
