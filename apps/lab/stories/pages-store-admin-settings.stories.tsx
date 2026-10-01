/* Store settings: shipping zones and rates with local pickup, tax rates (inclusive or exclusive), and gift cards with ledger history and a checkout field. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoreSettingsPage } from "./_store-admin-demo";

const meta = { title: "Components/Store Admin/Pages/Settings", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Open a zone, add a weight tier, then try a destination in the tester. */
export const Default: Story = { render: () => <StoreSettingsPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreSettingsPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StoreSettingsPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <StoreSettingsPage /> };

export const Taxes: Story = { render: () => <StoreSettingsPage startTab="taxes" /> };

export const TaxesArabic: Story = { globals: { locale: "ar" }, render: () => <StoreSettingsPage startTab="taxes" /> };

/** Issue a card, open one to redeem or adjust it, then type a code into the checkout box below. */
export const GiftCards: Story = { render: () => <StoreSettingsPage startTab="gift-cards" /> };

export const GiftCardsArabic: Story = { globals: { locale: "ar" }, render: () => <StoreSettingsPage startTab="gift-cards" /> };

export const Loading: Story = { render: () => <StoreSettingsPage mode="loading" /> };

export const Empty: Story = { render: () => <StoreSettingsPage mode="empty" /> };

export const ErrorState: Story = { render: () => <StoreSettingsPage mode="error" /> };
