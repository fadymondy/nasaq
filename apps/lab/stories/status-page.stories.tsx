import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusPageDemo } from "./_infra-demo";

const meta = { title: "Components/Monitoring/Status Page" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Operational: Story = { render: () => <StatusPageDemo mode="ok" /> };

export const Incident: Story = { render: () => <StatusPageDemo mode="incident" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StatusPageDemo mode="incident" /> };
