import { AdminUsers } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAdminUsersDemo } from "./_admin-demo";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Layout/Admin Users", component: AdminUsers, parameters: { layout: "padded" } } satisfies Meta<typeof AdminUsers>;
export default meta;
type Story = StoryObj;

function Demo({ loading, readOnly }: { loading?: boolean; readOnly?: boolean }) {
  const demo = useAdminUsersDemo(useAr());
  return readOnly ? <AdminUsers users={demo.users} roles={demo.roles} /> : <AdminUsers users={demo.users} roles={demo.roles} loading={loading} {...demo.handlers} />;
}

export const Default: Story = { render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo loading /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
