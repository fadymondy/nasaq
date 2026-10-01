/* Return requests with their RMA status steps; open requests can be cancelled. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Components/Storefront/Pages/Account/Returns", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "returns" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "returns" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "returns" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "returns" }} /> };

export const Empty: Story = { render: () => <AccountPage start={{ section: "returns" }} mode="empty" /> };
