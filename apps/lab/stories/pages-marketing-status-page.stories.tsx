/* The public status page a customer sees: overall banner, services with 90-day bars, active and past incidents, maintenance. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusPageDemo } from "./_infra-demo";

const meta = { title: "Components/Monitoring/Pages/Status Page", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <StatusPageDemo mode="incident" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StatusPageDemo mode="incident" /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StatusPageDemo mode="incident" /> };

export const AllOperational: Story = { render: () => <StatusPageDemo mode="ok" /> };
