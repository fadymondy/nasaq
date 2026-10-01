/* A product marketing page with the floating chat widget. The page lives in ./_chat-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarketingChatPage } from "./_chat-demo";

const meta = { title: "Components/Chat/Pages/Chat Widget", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <MarketingChatPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <MarketingChatPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <MarketingChatPage /> };
