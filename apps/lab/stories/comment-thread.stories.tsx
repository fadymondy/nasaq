import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommentThreadDemo } from "./_mahaam-demo";

const meta = { title: "Components/Collaboration/Comment Thread", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Threads with one reply level, mention chips, an agent badge and a client comment waiting for review. Post, reply, edit, delete and approve. */
export const Default: Story = { render: () => <CommentThreadDemo /> };

export const SignedOut: Story = { render: () => <CommentThreadDemo signedIn={false} /> };

export const Empty: Story = { render: () => <CommentThreadDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CommentThreadDemo /> };
