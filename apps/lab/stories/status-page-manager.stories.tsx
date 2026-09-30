import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusManagerDemo } from "./_infra-demo";

const meta = { title: "Components/Health/Status Page Manager" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Hide a service, reorder with the arrows, change the title, then Save. Post an incident to see it appear in the list. */
export const Default: Story = { render: () => <StatusManagerDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StatusManagerDemo /> };
