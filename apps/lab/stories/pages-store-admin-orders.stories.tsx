/* Order list with status, payment and fulfilment chips, filters, saved views, bulk actions, print and CSV export; an Abandoned carts tab. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminOrdersPage } from "./_orders-demo";

const meta = { title: "Components/Store Admin/Pages/Orders", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AdminOrdersPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AdminOrdersPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AdminOrdersPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AdminOrdersPage /> };

export const Loading: Story = { render: () => <AdminOrdersPage mode="loading" /> };

export const Empty: Story = { render: () => <AdminOrdersPage mode="empty" /> };

export const ErrorState: Story = { render: () => <AdminOrdersPage mode="error" /> };

/** The abandoned carts tab with the recovery email dialog. */
export const AbandonedCarts: Story = { render: () => <AdminOrdersPage startTab="abandoned" /> };

export const AbandonedCartsArabic: Story = { globals: { locale: "ar" }, render: () => <AdminOrdersPage startTab="abandoned" /> };
