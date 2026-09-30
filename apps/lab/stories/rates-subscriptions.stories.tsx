import type { Meta, StoryObj } from "@storybook/react-vite";
import { BillingOverviewDemo, RateScheduleDemo, SubscriptionsDemo } from "./_v2-demo";

const meta = { title: "Components/Commerce/Rates and Subscriptions", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Bill and cost rates with effective dates. The margin shows against the cost rate. */
export const Default: Story = { render: () => <RateScheduleDemo /> };

export const ReadOnly: Story = { render: () => <RateScheduleDemo readOnly /> };

/** Weekly, monthly and yearly cycles, and a custom cron. The 31st clamps to the month end. */
export const Subscriptions: Story = { render: () => <SubscriptionsDemo /> };

export const Overview: Story = { render: () => <BillingOverviewDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SubscriptionsDemo /> };
