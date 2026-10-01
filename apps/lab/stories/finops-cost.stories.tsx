import type { Meta, StoryObj } from "@storybook/react-vite";
import { FinopsCostDemo } from "./_infra-admin-demo";

const meta = { title: "Components/Server Tools/FinOps Cost" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Switch a server to a suggested plan from its row menu, add an item, remove one. */
export const Default: Story = { render: () => <FinopsCostDemo /> };

export const Loading: Story = { render: () => <FinopsCostDemo loading /> };

export const Empty: Story = { render: () => <FinopsCostDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <FinopsCostDemo /> };
