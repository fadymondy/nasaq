import { SubscriptionLanding } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubscriptionDemo } from "./_crm-r1-demo";

const meta = { title: "Components/CRM/Subscription Landing", component: SubscriptionLanding, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SubscriptionLanding>;
export default meta;
type Story = StoryObj;

/** Subscribe with explicit consent, then "check your inbox". An address starting with "fail" shows the error state. */
export const Default: Story = { render: () => <SubscriptionDemo mode="subscribe" /> };
export const Confirm: Story = { render: () => <SubscriptionDemo mode="confirm" /> };
export const Unsubscribe: Story = { render: () => <SubscriptionDemo mode="unsubscribe" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SubscriptionDemo mode="subscribe" /> };
export const ArabicUnsubscribe: Story = { globals: { locale: "ar" }, render: () => <SubscriptionDemo mode="unsubscribe" /> };
