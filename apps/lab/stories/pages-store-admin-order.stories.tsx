/* One order: partial fulfilment with tracking, refund by line or amount with restock, cancel, notes timeline, customer, address and payment cards, invoice and packing slip. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminOrderPage } from "./_orders-demo";

const meta = { title: "Components/Store Admin/Pages/Order", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AdminOrderPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AdminOrderPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AdminOrderPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AdminOrderPage /> };

export const Loading: Story = { render: () => <AdminOrderPage mode="loading" /> };

export const Empty: Story = { render: () => <AdminOrderPage mode="empty" /> };

export const ErrorState: Story = { render: () => <AdminOrderPage mode="error" /> };

/** Delivered and paid: refund and return-ready. */
export const Delivered: Story = { render: () => <AdminOrderPage orderIndex={0} /> };

/** Cash on delivery. */
export const CashOnDelivery: Story = { render: () => <AdminOrderPage orderIndex={3} /> };

/** Cancelled: no actions left. */
export const Cancelled: Story = { render: () => <AdminOrderPage orderIndex={5} /> };
