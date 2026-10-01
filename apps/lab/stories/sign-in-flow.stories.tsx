/*
 * Identifier-first sign-in. The fake backend routes by address:
 *   anything@acme.com → SSO, new@… → no account (register), code@… → one-time code, link@… → sign-in link,
 *   blocked@… → can't sign in here, 2fa@… → password then a second factor, pw@… → password with no alternatives,
 *   anything else → password. Password `nasaq123`, code `123456`. Google carries the "Last used" badge; Caps Lock
 *   shows a warning on the password step.
 */
import { AuthLayout, SignInFlow, type SignInNext, type SignInStep } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BrandPanel, DEMO_CODE, fakeCode, fakeLogin, ForgotLink, SignUpPrompt, sleep, StoryFooter, useAr } from "./_auth";

const meta = { title: "Components/Auth/Sign In Flow", component: SignInFlow, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof SignInFlow>;
export default meta;
type Story = StoryObj;

async function route(email: string): Promise<SignInNext> {
  await sleep(700);
  if (email.endsWith("@acme.com")) return { step: "sso", connection: "Acme Okta" };
  if (email.startsWith("new@")) return { step: "register" };
  if (email.startsWith("code@")) return { step: "code" };
  if (email.startsWith("link@")) return { step: "link-sent" };
  if (email.startsWith("blocked@")) return { step: "blocked" };
  if (email.startsWith("pw@")) return { step: "password", alternatives: [] };
  return { step: "password" };
}

function useTitles(ar: boolean): Record<SignInStep, [string, string]> {
  return {
    email: [ar ? "سجّل الدخول إلى نسق" : "Sign in to Nasaq", ar ? "أدخل بريد العمل للمتابعة." : "Use your work email to continue."],
    password: [ar ? "أدخل كلمة المرور" : "Enter your password", ""],
    code: [ar ? "تحقق من بريدك" : "Check your email", ""],
    sso: [ar ? "الدخول الموحّد" : "Single sign-on", ""],
    register: [ar ? "مرحبًا بك" : "Welcome", ""],
    "link-sent": [ar ? "تحقق من بريدك" : "Check your email", ""],
    blocked: [ar ? "تعذّر تسجيل الدخول" : "Can't sign in", ""],
    "two-factor": [ar ? "التحقق بخطوتين" : "Two-step verification", ""],
    forgot: [ar ? "إعادة تعيين كلمة المرور" : "Reset your password", ""],
  };
}

function Flow({ split = false, email }: { split?: boolean; email?: string }) {
  const ar = useAr();
  const titles = useTitles(ar);
  const [step, setStep] = useState<SignInStep>("email");
  return (
    <AuthLayout
      variant={split ? "split" : "card"}
      panel={split ? <BrandPanel /> : undefined}
      title={titles[step][0]}
      description={titles[step][1] || undefined}
      prompt={step === "email" ? <SignUpPrompt /> : undefined}
      footer={<StoryFooter />}
    >
      <SignInFlow
        defaultEmail={email}
        onStepChange={(s) => setStep(s)}
        onIdentify={route}
        onPassword={async (v) => {
          const failure = await fakeLogin(v.password, ar);
          if (!failure && v.email.startsWith("2fa@")) return { twoFactor: true };
          return failure;
        }}
        onTwoFactor={(v) => fakeCode(v.code, v.method, ar)}
        onMagicLink={() => sleep(700)}
        onForgotPassword={() => sleep(700)}
        onRequestCode={() => sleep(700)}
        onCode={async ({ code }) => {
          await sleep(700);
          if (code !== DEMO_CODE) return { error: ar ? "الرمز غير صحيح." : "That code is not right." };
        }}
        onSso={() => sleep(1500)}
        onRegister={() => undefined}
        oauthProviders={["google", "microsoft"]}
        lastUsed="google"
        onOAuth={() => sleep(1500)}
        onPasskey={() => sleep(1200)}
      />
    </AuthLayout>
  );
}

/** The email and the providers first; the backend picks the next step. Try `you@acme.com`, `new@x.com`, `code@x.com` or any other address. */
export const Card: Story = { render: () => <Flow /> };

export const CardArabic: Story = { name: "Card (Arabic)", globals: { locale: "ar" }, render: () => <Flow /> };

export const Split: Story = { render: () => <Flow split /> };

function EmailOnly({ passwordless = false, magic = false }: { passwordless?: boolean; magic?: boolean }) {
  const ar = useAr();
  const [step, setStep] = useState<SignInStep>("email");
  return (
    <AuthLayout
      title={
        step === "email" ? (ar ? "سجّل الدخول" : "Sign in") : step === "code" || step === "link-sent" ? (ar ? "تحقق من بريدك" : "Check your email") : ar ? "أدخل كلمة المرور" : "Enter your password"
      }
      prompt={step === "email" ? <SignUpPrompt /> : undefined}
      footer={<StoryFooter />}
    >
      {magic ? (
        <SignInFlow onStepChange={(s) => setStep(s)} onMagicLink={() => sleep(700)} resendSeconds={15} />
      ) : passwordless ? (
        <SignInFlow
          onStepChange={(s) => setStep(s)}
          onRequestCode={() => sleep(700)}
          onCode={async ({ code }) => {
            await sleep(700);
            if (code !== DEMO_CODE) return { error: ar ? "الرمز غير صحيح." : "That code is not right." };
          }}
        />
      ) : (
        <SignInFlow onStepChange={(s) => setStep(s)} onPassword={(v) => fakeLogin(v.password, ar)} forgotPassword={<ForgotLink />} />
      )}
    </AuthLayout>
  );
}

/** The smallest setup: no `onIdentify`, so every email goes straight to the password step. Only `onPassword` is needed. */
export const EmailThenPassword: Story = { name: "Email, then password", render: () => <EmailOnly /> };

/** Email only, no password: without `onIdentify` and `onPassword` the flow emails a code (`onRequestCode`) and asks for it (`onCode`). Code `123456`. */
export const EmailOnlyPasswordless: Story = { name: "Email only (passwordless)", render: () => <EmailOnly passwordless /> };

/** Magic link only: without `onPassword` and `onRequestCode`, every address gets a sign-in link (`onMagicLink`) and a resend timer. */
export const EmailOnlyMagicLink: Story = { name: "Email only (magic link)", render: () => <EmailOnly magic /> };

/** `blocked@x.com`: `onIdentify` returns `{ step: "blocked" }` and the flow says the account can't sign in here. */
export const Blocked: Story = { name: "Blocked account", render: () => <Flow email="blocked@example.com" /> };

/** `2fa@x.com` with password `nasaq123`, then code `123456`: `onPassword` returns `{ twoFactor: true }` and the flow asks for a second factor. */
export const TwoFactor: Story = { name: "Password, then two-factor", render: () => <Flow email="2fa@example.com" /> };
