/*
 * The Members page of a workspace: the team, pending invites, roles and leaving. Real components, fake async callbacks.
 * Invite taken@example.com to see an error. The last owner cannot be removed.
 */
import { MembersManager } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr, useMembersDemo } from "./_team-demo";
import { PageShell } from "./_team-pages";

const meta = { title: "Pages/Account/Members", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const d = useMembersDemo(ar);
  return (
    <PageShell title={ar ? "الأعضاء" : "Members"} description={ar ? "من في مساحة العمل وما يستطيعون فعله." : "Who is in the workspace and what they can do."}>
      <MembersManager members={d.members} invites={d.invites} roles={d.roles} currentUserId={d.currentUserId} grantableRoles={d.grantableRoles} {...d.handlers} />
    </PageShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
