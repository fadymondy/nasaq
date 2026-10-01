import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxDemo } from "./_chat-demo";

const meta = { title: "Components/Chat/Inbox" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Chat, email and WhatsApp in one inbox. Open a conversation, reply, add a note, react, snooze, find in the thread. A new message arrives after five seconds. */
export const Default: Story = { render: () => <InboxDemo live /> };

/** Nothing in the list yet. */
export const Empty: Story = { render: () => <InboxDemo empty defaultSelectedId={null} /> };

/** Skeleton rows while conversations load. */
export const Loading: Story = { render: () => <InboxDemo loading defaultSelectedId={null} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <InboxDemo live /> };
