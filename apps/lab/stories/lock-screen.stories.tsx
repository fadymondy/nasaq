import { type LockMethod, type LockReason, LockScreen } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEMO_NOW, Wallpaper, demoUser, sleep, useAr } from "./_onboarding-demo";

const meta = { title: "Pages/Auth/Lock Screen", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** PIN and password are both `123456`; the authenticator code is `654321`. */
function Demo({ methods = ["pin"], reason, requireCode, switchable }: { methods?: LockMethod[]; reason?: LockReason; requireCode?: boolean; switchable?: boolean }) {
  const ar = useAr();
  const bad = ar ? "غير صحيح. حاول مرة أخرى." : "That is not right. Try again.";
  return (
    <LockScreen
      className="min-h-dvh"
      user={demoUser(ar)}
      methods={methods}
      reason={reason}
      requireCode={requireCode}
      wallpaper={<Wallpaper />}
      now={DEMO_NOW}
      onSignOut={() => {}}
      accounts={switchable ? [{ name: ar ? "سارة الناصر" : "Sara Nasser", email: "sara@example.com" }, { name: ar ? "عمر حداد" : "Omar Haddad", email: "omar@example.com" }] : undefined}
      onSwitchAccount={switchable ? () => {} : undefined}
      onUnlock={async (a) => {
        await sleep(600);
        if (a.method === "biometric" || a.method === "passkey") return;
        if (a.secret !== "123456") return { error: bad };
        if (requireCode && a.code !== "654321") return { error: bad };
      }}
    />
  );
}

export const Default: Story = { name: "Default (PIN)", render: () => <Demo /> };
export const PasswordAndCode: Story = { name: "Password + TOTP", render: () => <Demo methods={["password"]} requireCode /> };
export const Biometric: Story = { render: () => <Demo methods={["biometric", "pin", "password"]} /> };
export const Passkey: Story = { name: "Passkey + switch account", render: () => <Demo methods={["passkey", "pin", "password"]} switchable /> };
export const Quiet: Story = { name: "Quiet mode", render: () => <Demo reason="quiet" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo methods={["passkey", "pin", "password"]} switchable /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo methods={["pin", "password"]} /> };
