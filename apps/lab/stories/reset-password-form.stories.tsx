import { ResetPasswordForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Reset Password Form", component: ResetPasswordForm } satisfies Meta<typeof ResetPasswordForm>;
export default meta;
type Story = StoryObj;

function Demo() {
  return (
    <div className="max-w-sm">
      <ResetPasswordForm onSubmit={() => sleep(900)} />
    </div>
  );
}

function Expired() {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <ResetPasswordForm
        onSubmit={async () => {
          await sleep(700);
          return { error: ar ? "انتهت صلاحية الرابط. اطلب رابطًا جديدًا." : "This link has expired. Request a new one." };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/** An expired link comes back as a form error. */
export const ExpiredLink: Story = { name: "Expired link", render: () => <Expired /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
