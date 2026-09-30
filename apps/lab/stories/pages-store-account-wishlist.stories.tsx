/* Wishlist with availability, a price drop, move to cart and back-in-stock notify. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Pages/Store/Account/Wishlist", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "wishlist" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "wishlist" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "wishlist" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "wishlist" }} /> };

export const Loading: Story = { render: () => <AccountPage start={{ section: "wishlist" }} mode="loading" /> };

export const Empty: Story = { render: () => <AccountPage start={{ section: "wishlist" }} mode="empty" /> };

export const ErrorState: Story = { render: () => <AccountPage start={{ section: "wishlist" }} mode="error" /> };
