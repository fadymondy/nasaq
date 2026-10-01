/*
 * Identifier-first sign-in. The fake backend routes by address:
 *   anything@acme.com → SSO, new@… → no account (register), code@… → one-time code, anything else → password.
 * Password `nasaq123`, code `123456`. Google carries the "Last used" badge; Caps Lock shows a warning on the password step.
 */
import { AuthLayout, buttonVariants, SignInFlow, type SignInNext, type SignInStep } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BrandPanel, DEMO_CODE, fakeLogin, ForgotLink, SignUpPrompt, sleep, StoryFooter, useAr } from "./_auth";

const meta = { title: "Components/Auth/Sign In Flow", component: SignInFlow, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof SignInFlow>;
export default meta;
type Story = StoryObj;

const link = buttonVariants({ variant: "link", size: "sm" });

async function route(email: string): Promise<SignInNext> {
  await sleep(700);
  if (email.endsWith("@acme.com")) return { step: "sso", connection: "Acme Okta" };
  if (email.startsWith("new@")) return { step: "register" };
  if (email.startsWith("code@")) return { step: "code" };
  return { step: "password" };
}

function useTitles(ar: boolean): Record<SignInStep, [string, string]> {
  return {
    email: [ar ? "سجّل الدخول إلى نسق" : "Sign in to Nasaq", ar ? "أدخل بريد العمل للمتابعة." : "Use your work email to continue."],
    password: [ar ? "أدخل كلمة المرور" : "Enter your password", ""],
    code: [ar ? "تحقق من بريدك" : "Check your email", ""],
    sso: [ar ? "الدخول الموحّد" : "Single sign-on", ""],
    register: [ar ? "مرحبًا بك" : "Welcome", ""],
  };
}

function Flow({ split = false }: { split?: boolean }) {
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
        onStepChange={(s) => setStep(s)}
        onIdentify={route}
        onPassword={(v) => fakeLogin(v.password, ar)}
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
        forgotPassword={
          <a href="#forgot" className={link}>
            {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
          </a>
        }
      />
    </AuthLayout>
  );
}

/** The email and the providers first; the backend picks the next step. Try `you@acme.com`, `new@x.com`, `code@x.com` or any other address. */
export const Card: Story = { render: () => <Flow /> };

export const CardArabic: Story = { name: "Card (Arabic)", globals: { locale: "ar" }, render: () => <Flow /> };

export const Split: Story = { render: () => <Flow split /> };

function EmailOnly({ passwordless = false }: { passwordless?: boolean }) {
  const ar = useAr();
  const [step, setStep] = useState<SignInStep>("email");
  return (
    <AuthLayout
      title={step === "email" ? (ar ? "سجّل الدخول" : "Sign in") : step === "code" ? (ar ? "تحقق من بريدك" : "Check your email") : ar ? "أدخل كلمة المرور" : "Enter your password"}
      prompt={step === "email" ? <SignUpPrompt /> : undefined}
      footer={<StoryFooter />}
    >
      {passwordless ? (
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
