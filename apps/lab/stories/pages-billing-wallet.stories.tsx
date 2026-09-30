/* The wallet: balance, top-up, withdraw and transactions. The whole screen lives in ./_billing-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WalletPage } from "./_billing-demo";

const meta = { title: "Pages/Billing/Wallet", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <WalletPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <WalletPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <WalletPage /> };
