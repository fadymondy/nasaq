import { InviteAccept } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope } from "./_team-demo";
import { InviteDemo } from "./_team-pages";

const meta = { title: "Components/Auth/Invite Accept", component: InviteAccept, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof InviteAccept>;
export default meta;
type Story = StoryObj;

export const Valid: Story = { render: () => <InviteDemo state="valid" /> };
export const SignedOut: Story = { render: () => <InviteDemo state="valid" signedIn={false} /> };
export const Expired: Story = { render: () => <InviteDemo state="expired" /> };
export const WrongAccount: Story = { render: () => <InviteDemo state="wrong-account" /> };
export const AlreadyAccepted: Story = { render: () => <InviteDemo state="already-accepted" /> };
export const Revoked: Story = { render: () => <InviteDemo state="revoked" /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <InviteDemo state="valid" />
    </ArabicScope>
  ),
};
