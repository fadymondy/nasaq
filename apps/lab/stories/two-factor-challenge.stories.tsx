import { TwoFactorChallenge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fakeCode, sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Two Factor Challenge", component: TwoFactorChallenge } satisfies Meta<typeof TwoFactorChallenge>;
export default meta;
type Story = StoryObj;

function Demo({ method }: { method?: "totp" | "recovery" }) {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <TwoFactorChallenge defaultMethod={method} onSubmit={(v) => fakeCode(v.code, v.method, ar)} onPasskey={() => sleep(1500)} />
    </div>
  );
}

/** Authenticator code `123456`; recovery code `nasaq-2024`. */
export const Default: Story = { render: () => <Demo /> };

export const RecoveryCode: Story = { name: "Recovery code", render: () => <Demo method="recovery" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
