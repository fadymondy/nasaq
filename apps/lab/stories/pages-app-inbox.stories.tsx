/* The support inbox screen: list, thread, contact panel, docked chat windows. The whole screen lives in ./_chat-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxPage } from "./_chat-demo";

const meta = { title: "Pages/App/Inbox", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <InboxPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <InboxPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <InboxPage /> };
