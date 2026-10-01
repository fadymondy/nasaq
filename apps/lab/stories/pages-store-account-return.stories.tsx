/* Return request flow: choose lines and quantities, a reason, photos, a refund method. Submitting lists the RMA under Returns. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Components/Storefront/Pages/Account/Return Request", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049", returnFor: "ord-1049" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049", returnFor: "ord-1049" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049", returnFor: "ord-1049" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049", returnFor: "ord-1049" }} /> };
