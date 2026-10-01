/* The subscription checkout, start to finish. The whole screen lives in ./_billing-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckoutPage } from "./_billing-demo";

const meta = { title: "Components/Billing/Pages/Checkout", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CheckoutPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CheckoutPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CheckoutPage /> };
