/* The public subscribe, confirm and unsubscribe pages. The screen lives in ./_crm-r1-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubscriptionDemo } from "./_crm-r1-demo";

const meta = { title: "Pages/CRM/Subscription", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SubscriptionDemo mode="subscribe" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SubscriptionDemo mode="subscribe" /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <SubscriptionDemo mode="subscribe" /> };
export const Confirm: Story = { render: () => <SubscriptionDemo mode="confirm" /> };
export const Unsubscribe: Story = { render: () => <SubscriptionDemo mode="unsubscribe" /> };
