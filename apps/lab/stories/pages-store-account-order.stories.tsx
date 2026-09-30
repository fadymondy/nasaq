/* One order with the tracking timeline and carrier link. Delivered orders offer Return items. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Pages/Store/Account/Order Detail", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "orders", orderId: "ord-1049" }} /> };

/** Shipped: the timeline stops at shipped and shows the carrier link. */
export const Shipped: Story = { render: () => <AccountPage start={{ section: "orders", orderId: "ord-1041" }} /> };

/** Part of the order has shipped. */
export const PartlyShipped: Story = { render: () => <AccountPage start={{ section: "orders", orderId: "ord-1048" }} /> };

/** Cancelled orders show the terminal banner instead of steps. */
export const Cancelled: Story = { render: () => <AccountPage start={{ section: "orders", orderId: "ord-1045" }} /> };
