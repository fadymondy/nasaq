import { MembersManager } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, useAr, useMembersDemo } from "./_team-demo";

const meta = { title: "Components/Collaboration/Members Manager", component: MembersManager, parameters: { layout: "padded" } } satisfies Meta<typeof MembersManager>;
export default meta;
type Story = StoryObj;

function Demo({ admin, loading, readOnly }: { admin?: boolean; loading?: boolean; readOnly?: boolean }) {
  const d = useMembersDemo(useAr(), { admin });
  return (
    <MembersManager
      members={d.members}
      invites={d.invites}
      roles={d.roles}
      currentUserId={d.currentUserId}
      grantableRoles={d.grantableRoles}
      loading={loading}
      canManage={!readOnly}
      {...(readOnly ? {} : d.handlers)}
    />
  );
}

/** Inviting taken@example.com fails. Removing or demoting the last owner is blocked. */
export const Default: Story = { render: () => <Demo /> };
/** An admin cannot touch owners or grant the owner role. */
export const AsAdmin: Story = { render: () => <Demo admin /> };
export const Loading: Story = { render: () => <Demo loading /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
