/* A session that ended. Password `nasaq123`, authenticator code `123456`. The passkey button shows where the browser supports WebAuthn. */
import { AuthLayout, SessionExpired, type SessionExpiredReason } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BrandPanel, DoneScreen, StoryFooter } from "./_auth";
import { DEMO_PASSWORD, sleep, useAr } from "./_x1-demo";

const meta = { title: "Components/Auth/Pages/Session Expired", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ reason, requireCode }: { reason?: SessionExpiredReason; requireCode?: boolean }) {
  const ar = useAr();
  const [done, setDone] = useState(false);
  return (
    <AuthLayout variant="split" panel={<BrandPanel />} title={ar ? "أهلًا بعودتك" : "Welcome back"} description={ar ? "سجّل الدخول مرة أخرى للمتابعة." : "Sign in again to continue."} footer={<StoryFooter />}>
      {done ? (
        <DoneScreen title={ar ? "عدت إلى حسابك" : "You are back in"} body={ar ? "أعدناك إلى الصفحة التي كنت فيها." : "We returned you to the page you were on."} onRestart={() => setDone(false)} restart={ar ? "أعد العرض" : "Replay"} />
      ) : (
        <SessionExpired
          user={{ name: ar ? "نور عادل" : "Nour Adel", email: "nour@example.com" }}
          reason={reason}
          requireCode={requireCode}
          keepsWork
          onSubmit={async (v) => {
            await sleep(800);
            if (v.password !== DEMO_PASSWORD) return { error: ar ? "كلمة المرور غير صحيحة." : "That password is not right." };
            if (requireCode && v.code !== "123456") return { error: ar ? "الرمز غير صحيح." : "That code is not right." };
            setDone(true);
          }}
          onPasskey={() => sleep(1000).then(() => setDone(true))}
          onSwitchAccount={() => {}}
          onSignOut={() => {}}
        />
      )}
    </AuthLayout>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Revoked: Story = { render: () => <Demo reason="revoked" /> };
export const PasswordChanged: Story = { name: "Password changed + code", render: () => <Demo reason="password-changed" requireCode /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
