import { Card, CardContent, CardDescription, CardHeader, CardTitle, ChangePasswordForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, DEMO_PASSWORD, useAr, wait } from "./_account-demo";

const meta = { title: "Components/Account/Change Password Form" } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle as="h2">{ar ? "تغيير كلمة المرور" : "Change password"}</CardTitle>
        <CardDescription>{ar ? "كلمة المرور الحالية في العرض: correct-horse" : "In this demo the current password is correct-horse."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm
          onSubmit={async (values) => {
            await wait(800);
            if (values.currentPassword !== DEMO_PASSWORD) {
              return { fieldErrors: { currentPassword: ar ? "كلمة المرور الحالية غير صحيحة." : "That is not your current password." } };
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

/** The new password has the strength meter. Mismatches and short passwords are caught before `onSubmit`; the server can return field errors. */
export const Default: Story = { render: () => <Demo /> };

/** A server failure that is not about one field. */
export const ServerError: Story = {
  name: "Server error",
  render: () => (
    <ChangePasswordForm
      showSignOutOthers={false}
      onSubmit={async () => {
        await wait(600);
        return { error: "We could not reach the server. Nothing was changed." };
      }}
    />
  ),
};

export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
