import { VerifyOtpForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEMO_CODE, sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Verify OTP Form", component: VerifyOtpForm } satisfies Meta<typeof VerifyOtpForm>;
export default meta;
type Story = StoryObj;

function EmailDemo() {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <VerifyOtpForm
        destination="fady@example.com"
        resendSeconds={10}
        onSubmit={async ({ code }) => {
          await sleep(800);
          if (code !== DEMO_CODE) return { error: ar ? "الرمز غير صحيح." : "That code is not right." };
        }}
        onResend={() => sleep(600)}
      />
    </div>
  );
}

/** The code is `123456`. It submits on the last digit or on paste; a wrong code clears the boxes and refocuses. */
export const Email: Story = { render: () => <EmailDemo /> };

export const Sms: Story = {
  render: () => (
    <div className="max-w-sm">
      <VerifyOtpForm destination="+966501234567" channel="sms" length={4} autoSubmit={false} onSubmit={() => sleep(800)} onResend={() => sleep(600)} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <EmailDemo /> };
