import { ForgotPasswordForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { sleep } from "./_auth";

const meta = { title: "Components/Auth/Forgot Password Form", component: ForgotPasswordForm } satisfies Meta<typeof ForgotPasswordForm>;
export default meta;
type Story = StoryObj;

function Demo() {
  return (
    <div className="max-w-sm">
      <ForgotPasswordForm resendSeconds={10} onSubmit={() => sleep(900)} />
    </div>
  );
}

/** Submit an email to reach "Check your inbox". Resend waits 10 seconds here (30 by default). */
export const Default: Story = { render: () => <Demo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
