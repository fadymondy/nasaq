/*
 * The page an invite email links to. The Default story is a signed-in person who can accept; the others show
 * the states an invite can be in.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InviteDemo } from "./_team-pages";

const meta = { title: "Pages/Auth/Invite", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <InviteDemo state="valid" /> };
export const SignedOut: Story = { render: () => <InviteDemo state="valid" signedIn={false} /> };
export const Expired: Story = { render: () => <InviteDemo state="expired" /> };
export const WrongAccount: Story = { render: () => <InviteDemo state="wrong-account" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <InviteDemo state="valid" /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <InviteDemo state="valid" /> };
