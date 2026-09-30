import type { Meta, StoryObj } from "@storybook/react-vite";
import { DnsDemo } from "./_ops-demo";

const meta = { title: "Components/Developer/DNS Management" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Add, edit or delete a record, flip the proxy. A value with "blocked.example" makes the fake provider refuse it. */
export const Default: Story = { render: () => <DnsDemo /> };

export const Loading: Story = { render: () => <DnsDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DnsDemo /> };
