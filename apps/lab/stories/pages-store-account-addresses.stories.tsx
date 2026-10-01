/* Address book: add, edit, set default, delete with confirmation. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountPage } from "./_orders-demo";

const meta = { title: "Components/Storefront/Pages/Account/Addresses", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AccountPage start={{ section: "addresses" }} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AccountPage start={{ section: "addresses" }} /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "addresses" }} /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <AccountPage start={{ section: "addresses" }} /> };

export const Loading: Story = { render: () => <AccountPage start={{ section: "addresses" }} mode="loading" /> };

export const Empty: Story = { render: () => <AccountPage start={{ section: "addresses" }} mode="empty" /> };

export const ErrorState: Story = { render: () => <AccountPage start={{ section: "addresses" }} mode="error" /> };
