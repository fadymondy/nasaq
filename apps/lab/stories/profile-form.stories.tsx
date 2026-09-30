import { ProfileForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, checkUsername, sampleValues, useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Account/Profile Form", component: ProfileForm } satisfies Meta<typeof ProfileForm>;
export default meta;
type Story = StoryObj;

/** Try the username "admin" (taken), edit anything to reveal the save bar, change the email with the password "secret". */
function Demo() {
  const ar = useAr();
  const [values, setValues] = useState(sampleValues(ar));
  const [avatar, setAvatar] = useState<string | undefined>();
  return (
    <div className="w-[40rem] max-w-full">
      <ProfileForm
        values={values}
        emailVerified={false}
        checkUsername={checkUsername}
        onSubmit={async (next) => {
          await wait(800);
          setValues(next);
        }}
        onResendVerification={() => wait(700)}
        onChangeEmail={async ({ password }) => {
          await wait(700);
          if (password !== "secret") return { fieldErrors: { password: ar ? "كلمة المرور غير صحيحة." : "That password is not right." } };
        }}
        avatar={{
          src: avatar,
          onChange: async (file) => {
            await wait(700);
            setAvatar(URL.createObjectURL(file));
          },
          onRemove: async () => {
            await wait(400);
            setAvatar(undefined);
          },
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
/** The server answers with a field error and a form error. */
export const ServerErrors: Story = {
  render: () => (
    <div className="w-[40rem] max-w-full">
      <ProfileForm
        values={sampleValues(false)}
        emailVerified
        onSubmit={async () => {
          await wait(600);
          return { error: "Something went wrong on our side.", fieldErrors: { username: "That username is reserved." } };
        }}
      />
    </div>
  ),
};
