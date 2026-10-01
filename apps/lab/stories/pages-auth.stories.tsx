/*
 * Full-page auth screens built only from catalogue components, walkable end to end with a fake async backend.
 * Sign in: any email, password `nasaq123`, then code `123456` (recovery code `nasaq-2024`).
 * Sign up: fill the form, then code `123456`. Recovery: any email, then a new password.
 * Try the toolbar for theme, Arabic and the mobile viewport.
 */
import { AuthLayout, buttonVariants, ForgotPasswordForm, LoginForm, OAuthConsent, RegisterForm, ResetPasswordForm, TwoFactorChallenge, VerifyOtpForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BrandPanel, consentScopes, DEMO_CODE, DoneScreen, fakeCode, fakeLogin, ForgotLink, SignInPrompt, SignUpPrompt, sleep, StoryFooter, useAr } from "./_auth";

const meta = { title: "Components/Auth/Pages/Flow", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const link = buttonVariants({ variant: "link", size: "sm" });

function SignInFlow() {
  const ar = useAr();
  const [step, setStep] = useState<"login" | "two-factor" | "forgot" | "done">("login");
  const [email, setEmail] = useState("");
  const restart = () => setStep("login");
  const titles = {
    login: [ar ? "مرحبًا بعودتك" : "Welcome back", ar ? "سجّل الدخول إلى حسابك." : "Sign in to your account."],
    "two-factor": [ar ? "التحقق بخطوتين" : "Two-step verification", ar ? "خطوة أخيرة لحماية حسابك." : "One more step to protect your account."],
    forgot: [ar ? "نسيت كلمة المرور؟" : "Forgot your password?", ar ? "سنرسل لك رابطًا لإعادة تعيينها." : "We will email you a link to reset it."],
    done: [ar ? "تم تسجيل الدخول" : "You are signed in", ""],
  } as const;
  return (
    <AuthLayout variant="split" panel={<BrandPanel />} title={titles[step][0]} description={titles[step][1] || undefined} prompt={step === "login" ? <SignUpPrompt /> : undefined} footer={<StoryFooter />}>
      {step === "login" ? (
        <LoginForm
          oauthProviders={["google", "github", "apple"]}
          onOAuth={() => sleep(1500)}
          onPasskey={() => sleep(1500)}
          forgotPassword={
            <button type="button" className={link} onClick={() => setStep("forgot")}>
              {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
            </button>
          }
          onSubmit={async (v) => {
            const result = await fakeLogin(v.password, ar);
            if (!result) {
              setEmail(v.email);
              setStep("two-factor");
            }
            return result;
          }}
        />
      ) : null}
      {step === "two-factor" ? (
        <TwoFactorChallenge
          onPasskey={() => sleep(1200).then(() => setStep("done"))}
          onSubmit={async (v) => {
            const result = await fakeCode(v.code, v.method, ar);
            if (!result) setStep("done");
            return result;
          }}
          footer={
            <button type="button" className={link} onClick={restart}>
              {ar ? "العودة إلى تسجيل الدخول" : "Back to sign in"}
            </button>
          }
        />
      ) : null}
      {step === "forgot" ? (
        <div className="flex flex-col gap-3">
          <ForgotPasswordForm onSubmit={() => sleep(900)} resendSeconds={10} />
          <button type="button" className={`${link} self-start`} onClick={restart}>
            {ar ? "العودة إلى تسجيل الدخول" : "Back to sign in"}
          </button>
        </div>
      ) : null}
      {step === "done" ? (
        <DoneScreen
          title={ar ? "أهلًا بك" : "Welcome"}
          body={ar ? `سجّلت الدخول باسم ${email || "fady@example.com"}.` : `Signed in as ${email || "fady@example.com"}.`}
          onRestart={restart}
          restart={ar ? "ابدأ من جديد" : "Start over"}
        />
      ) : null}
    </AuthLayout>
  );
}

function SignUpFlow() {
  const ar = useAr();
  const [step, setStep] = useState<"register" | "verify" | "done">("register");
  const [email, setEmail] = useState("");
  const heading = {
    register: [ar ? "أنشئ حسابك" : "Create your account", ar ? "ابدأ في دقيقة." : "Get started in a minute."],
    verify: [ar ? "تحقق من بريدك" : "Verify your email", ""],
    done: [ar ? "حسابك جاهز" : "Your account is ready", ""],
  } as const;
  return (
    <AuthLayout title={heading[step][0]} description={heading[step][1] || undefined} prompt={step === "register" ? <SignInPrompt /> : undefined} footer={<StoryFooter />}>
      {step === "register" ? (
        <RegisterForm
          oauthProviders={["google", "github"]}
          onOAuth={() => sleep(1500)}
          onSubmit={async (v) => {
            await sleep(900);
            setEmail(v.email);
            setStep("verify");
          }}
        />
      ) : null}
      {step === "verify" ? (
        <VerifyOtpForm
          destination={email}
          resendSeconds={10}
          onSubmit={async ({ code }) => {
            await sleep(800);
            if (code !== DEMO_CODE) return { error: ar ? "الرمز غير صحيح." : "That code is not right." };
            setStep("done");
          }}
          onResend={() => sleep(600)}
          footer={
            <button type="button" className={link} onClick={() => setStep("register")}>
              {ar ? "استخدام بريد آخر" : "Use a different email"}
            </button>
          }
        />
      ) : null}
      {step === "done" ? (
        <DoneScreen
          title={ar ? "تم التحقق من بريدك" : "Email verified"}
          body={ar ? "يمكنك الآن استخدام حسابك." : "You can start using your account."}
          onRestart={() => setStep("register")}
          restart={ar ? "ابدأ من جديد" : "Start over"}
        />
      ) : null}
    </AuthLayout>
  );
}

function RecoveryFlow() {
  const ar = useAr();
  const [step, setStep] = useState<"forgot" | "reset" | "done">("forgot");
  return (
    <AuthLayout
      title={step === "forgot" ? (ar ? "نسيت كلمة المرور؟" : "Forgot your password?") : step === "reset" ? (ar ? "اختر كلمة مرور جديدة" : "Choose a new password") : ar ? "تم تحديث كلمة المرور" : "Password updated"}
      description={step === "forgot" ? (ar ? "سنرسل لك رابطًا لإعادة تعيينها." : "We will email you a link to reset it.") : undefined}
      footer={<StoryFooter />}
    >
      {step === "forgot" ? (
        <div className="flex flex-col gap-3">
          <ForgotPasswordForm resendSeconds={10} onSubmit={() => sleep(900)} />
          <button type="button" className={`${link} self-start`} onClick={() => setStep("reset")}>
            {ar ? "فتحت الرابط في بريدي (متابعة)" : "I opened the link in my email (continue)"}
          </button>
        </div>
      ) : null}
      {step === "reset" ? (
        <ResetPasswordForm
          onSubmit={async () => {
            await sleep(900);
            setStep("done");
          }}
        />
      ) : null}
      {step === "done" ? (
        <DoneScreen
          title={ar ? "كلمة المرور الجديدة جاهزة" : "Your new password is set"}
          body={ar ? "سجّل الدخول بها في المرة القادمة." : "Use it the next time you sign in."}
          onRestart={() => setStep("forgot")}
          restart={ar ? "ابدأ من جديد" : "Start over"}
        />
      ) : null}
    </AuthLayout>
  );
}

function Consent() {
  const ar = useAr();
  return (
    <AuthLayout footer={<StoryFooter />}>
      <OAuthConsent
        headingLevel={1}
        app={{ name: "Zapline", publisher: ar ? "من شركة Zapline" : "by Zapline Inc." }}
        scopes={consentScopes(ar)}
        account={{ name: ar ? "فادي مندي" : "Fady Mondy", email: "fady@example.com" }}
        onSwitchAccount={() => undefined}
        redirectHost="app.zapline.io"
        onAllow={() => sleep(1000)}
        onDeny={() => sleep(600)}
      />
    </AuthLayout>
  );
}

function LoginCard() {
  const ar = useAr();
  return (
    <AuthLayout title={ar ? "مرحبًا بعودتك" : "Welcome back"} description={ar ? "سجّل الدخول إلى حسابك." : "Sign in to your account."} prompt={<SignUpPrompt />} footer={<StoryFooter />}>
      <LoginForm onSubmit={(v) => fakeLogin(v.password, ar)} forgotPassword={<ForgotLink />} oauthProviders={["google", "github"]} onOAuth={() => sleep(1500)} />
    </AuthLayout>
  );
}

const mobile = { globals: { viewport: { value: "mobile" } } } as const;
const arabic = { globals: { locale: "ar" } } as const;

/** Login, then two-step verification, then done. Also reaches "forgot password" from the link. */
export const SignIn: Story = { name: "Sign in", render: () => <SignInFlow /> };
export const SignInArabic: Story = { name: "Sign in (Arabic)", ...arabic, render: () => <SignInFlow /> };
export const SignInMobile: Story = { name: "Sign in (mobile)", ...mobile, render: () => <SignInFlow /> };

/** Create an account, verify the emailed code, done. */
export const SignUp: Story = { name: "Sign up", render: () => <SignUpFlow /> };
export const SignUpArabic: Story = { name: "Sign up (Arabic)", ...arabic, render: () => <SignUpFlow /> };
export const SignUpMobile: Story = { name: "Sign up (mobile)", ...mobile, render: () => <SignUpFlow /> };

/** Ask for a reset link, then set a new password. */
export const Recovery: Story = { name: "Password recovery", render: () => <RecoveryFlow /> };
export const RecoveryArabic: Story = { name: "Password recovery (Arabic)", ...arabic, render: () => <RecoveryFlow /> };

/** The consent screen a third-party app sends people to. */
export const ConsentScreen: Story = { name: "OAuth consent", render: () => <Consent /> };
export const ConsentArabic: Story = { name: "OAuth consent (Arabic)", ...arabic, render: () => <Consent /> };
export const ConsentMobile: Story = { name: "OAuth consent (mobile)", ...mobile, render: () => <Consent /> };

/** The card layout with a login form. */
export const LoginCardScreen: Story = { name: "Login (card)", render: () => <LoginCard /> };
