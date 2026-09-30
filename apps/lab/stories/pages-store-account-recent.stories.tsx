/* Recently viewed products, newest first. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Pages/Store/Account/Recently Viewed", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "recent" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "recent" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "recent" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "recent" }} /> };

export const Loading: Story = { render: () => <AccountPage start={{ section: "recent" }} mode="loading" /> };

export const Empty: Story = { render: () => <AccountPage start={{ section: "recent" }} mode="empty" /> };
