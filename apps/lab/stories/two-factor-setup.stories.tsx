import { TwoFactorSetup } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, DEMO_CODE, DEMO_PASSWORD, OTPAUTH_URI, RECOVERY_CODES, useAr, wait } from "./_account-demo";

const meta = { title: "Components/Security/Two Factor Setup" } satisfies Meta;
export default meta;
type Story = StoryObj;

function Setup({ enabled }: { enabled?: boolean }) {
  const ar = useAr();
  const [on, setOn] = useState(enabled ?? false);
  const [codes, setCodes] = useState(7);
  const wrongPassword = ar ? "كلمة المرور غير صحيحة. جرّب correct-horse." : "Wrong password. Try correct-horse.";
  return (
    <TwoFactorSetup
      otpauthUri={OTPAUTH_URI}
      enabled={on}
      recoveryCodesRemaining={codes}
      onVerify={async (code) => {
        await wait();
        return code === DEMO_CODE
          ? { recoveryCodes: RECOVERY_CODES }
          : { error: ar ? "الرمز غير مطابق. جرّب 123456." : "That code did not match. Try 123456." };
      }}
      onComplete={() => {
        setOn(true);
        setCodes(RECOVERY_CODES.length);
      }}
      onRegenerateRecoveryCodes={async (password) => {
        await wait();
        if (password !== DEMO_PASSWORD) return { error: wrongPassword };
        setCodes(RECOVERY_CODES.length);
        return [...RECOVERY_CODES].reverse();
      }}
      onDisable={async (password) => {
        await wait();
        if (password !== DEMO_PASSWORD) return { error: wrongPassword };
        setOn(false);
      }}
    />
  );
}

/** Three steps: scan, confirm with a code (the demo accepts 123456), save the recovery codes. The "Can't scan?" row shows the key in groups of four. */
export const Default: Story = { render: () => <Setup /> };

/** After setup: status, recovery codes left, regenerate and disable. Both ask for the password (the demo accepts correct-horse). */
export const Enabled: Story = { render: () => <Setup enabled /> };

/** Confirm dangerous actions with an authenticator code instead of the password. */
export const ConfirmWithCode: Story = {
  name: "Confirm with code",
  render: () => (
    <TwoFactorSetup
      otpauthUri={OTPAUTH_URI}
      enabled
      recoveryCodesRemaining={1}
      confirmWith="code"
      onVerify={async () => undefined}
      onRegenerateRecoveryCodes={async () => {
        await wait();
        return RECOVERY_CODES;
      }}
      onDisable={async () => {
        await wait();
        return { error: "That code did not match." };
      }}
    />
  ),
};

/** Right-to-left. The QR code, the setup key and the recovery codes stay left-to-right. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <Setup />
    </ArabicScope>
  ),
};
