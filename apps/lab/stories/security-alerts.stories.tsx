import type { Meta, StoryObj } from "@storybook/react-vite";
import { SecurityAlertsDemo } from "./_ops-demo";

const meta = { title: "Components/Security/Security Alerts" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Adds category, IP, location, a recommendation and follow-up actions (Block IP, Mark as false positive). */
export const Default: Story = { render: () => <SecurityAlertsDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SecurityAlertsDemo /> };
