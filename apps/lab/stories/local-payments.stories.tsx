import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocalPaymentsDemo, PaymentQueueDemo } from "./_v2-demo";

const meta = { title: "Components/Billing/Local Payments", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Pick a method, copy where to send it, add the reference and a receipt. A reference of FAIL0000 shows a server error. */
export const Default: Story = { render: () => <LocalPaymentsDemo /> };

export const UnderReview: Story = { render: () => <LocalPaymentsDemo status="verifying" /> };

export const Verified: Story = { render: () => <LocalPaymentsDemo status="verified" /> };

/** A rejected receipt shows the reviewer's reason and reopens the form. */
export const Rejected: Story = { render: () => <LocalPaymentsDemo status="rejected" /> };

/** The reviewer's queue: verify, or reject with a reason. */
export const Queue: Story = { render: () => <PaymentQueueDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LocalPaymentsDemo /> };
