import { AddUserDialog, AdminUsers, Button } from "@nasaq/web";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { adminRoles, useAdminUsersDemo } from "./_admin-demo";
import { sleep } from "./_auth";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Admin/Admin Users", component: AdminUsers, parameters: { layout: "padded" } } satisfies Meta<typeof AdminUsers>;
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

/** `AddUserDialog` on its own with `password`: type one to create the account with it instead of sending an invitation. */
function AddDialog({ free }: { free?: boolean }) {
  const ar = useAr();
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState("");
  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={() => setOpen(true)}>{ar ? "إضافة مستخدم" : "Add user"}</Button>
      {last ? <pre className="max-w-full overflow-auto text-caption text-muted-foreground" dir="ltr">{last}</pre> : null}
      <AddUserDialog
        open={open}
        onOpenChange={setOpen}
        roles={free ? [] : adminRoles(ar)}
        password
        onSubmit={async (values) => {
          await sleep(700);
          if (values.email.startsWith("taken@")) return { fieldErrors: { email: ar ? "هذا البريد مسجّل بالفعل." : "That email is already registered." } };
          setLast(JSON.stringify({ ...values, password: values.password ? "••••" : undefined }, null, 2));
        }}
      />
    </div>
  );
}

export const AddUserWithPassword: Story = { name: "Add user with password", render: () => <AddDialog /> };
/** `roles={[]}` (or `freeRoles`): roles are typed as tags instead of ticked. */
export const AddUserFreeRoles: Story = { name: "Add user, free roles", render: () => <AddDialog free /> };
export const AddUserArabic: Story = { name: "Add user Arabic", globals: { locale: "ar" }, render: () => <AddDialog /> };
