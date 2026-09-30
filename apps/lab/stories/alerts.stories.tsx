import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertsDemo } from "./_ops-demo";

const meta = { title: "Components/Analytics/Alerts" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Acknowledge, resolve and reopen with fake delays. Open a row for its timeline. */
export const Default: Story = { render: () => <AlertsDemo /> };

export const Loading: Story = { render: () => <AlertsDemo loading /> };

export const Empty: Story = { render: () => <AlertsDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AlertsDemo /> };
