/* Invoices and payments with a billing chart; open a row to see the invoice. The whole screen lives in ./_billing-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InvoicesPage } from "./_billing-demo";

const meta = { title: "Components/Billing/Pages/Invoices", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <InvoicesPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <InvoicesPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <InvoicesPage /> };
