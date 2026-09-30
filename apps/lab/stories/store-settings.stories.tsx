import type { Meta, StoryObj } from "@storybook/react-vite";
import { GiftCheckoutDemo, SimulatorDemo, StoreDiscountsPage, StoreSettingsPage } from "./_store-admin-demo";

const meta = { title: "Components/Commerce/Store Settings", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Zones, rates and pickup points with a destination tester. */
export const Default: Story = { render: () => <StoreSettingsPage /> };

export const Taxes: Story = { render: () => <StoreSettingsPage startTab="taxes" /> };

export const Discounts: Story = { render: () => <StoreDiscountsPage /> };

export const Simulator: Story = { render: () => <SimulatorDemo /> };

export const GiftCards: Story = { render: () => <StoreSettingsPage startTab="gift-cards" /> };

/** The checkout box. Try 7KQM-2XPR-4TVW-9HDF. */
export const GiftCardCheckout: Story = { render: () => <GiftCheckoutDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreSettingsPage /> };

export const Loading: Story = { render: () => <StoreSettingsPage mode="loading" /> };

export const Empty: Story = { render: () => <StoreSettingsPage mode="empty" /> };

export const ErrorState: Story = { render: () => <StoreSettingsPage mode="error" /> };
