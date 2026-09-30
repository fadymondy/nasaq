import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatWidgetDemo } from "./_chat-demo";

const meta = { title: "Components/Collaboration/Chat Widget" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Open panel with a greeting and quick questions. Send a message: it shows sending, then the team types and answers. */
export const Default: Story = { render: () => <ChatWidgetDemo /> };

/** Just the launcher. A reply that comes while it is closed adds an unread badge. */
export const Closed: Story = { render: () => <ChatWidgetDemo defaultOpen={false} /> };

/** Outside business hours: a leave-a-message form with validation and a thank-you. */
export const Offline: Story = { render: () => <ChatWidgetDemo online={false} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ChatWidgetDemo /> };
