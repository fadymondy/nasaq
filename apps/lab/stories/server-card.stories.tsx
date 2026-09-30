import type { Meta, StoryObj } from "@storybook/react-vite";
import { ServerDemo } from "./_infra-demo";

const meta = { title: "Components/Developer/Server Card" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Power buttons follow the state. Stop and force stop ask first. Take a snapshot, roll one back from its menu (or right-click it), edit the limits. */
export const Default: Story = { render: () => <ServerDemo /> };

export const Stopped: Story = { render: () => <ServerDemo initial={{ status: "stopped", metrics: undefined }} /> };

export const Failing: Story = { name: "Power action fails", render: () => <ServerDemo failPower /> };

export const Loading: Story = { render: () => <ServerDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ServerDemo /> };
