/*
 * Shared bits for the auth stories: a fake async backend, the layout footer and the split panel.
 * Demo credentials: any email, password `nasaq123`, code `123456`, recovery code `nasaq-2024`.
 */
import { AuthFooter, buttonVariants, LocaleSwitcher, ProductLogo, ThemeToggle, useNasaq, type AuthSubmitResult } from "@nasaq/web";
import { Building2, CircleCheck, Fingerprint, History, LockKeyhole, MonitorSmartphone, type LucideIcon } from "lucide-react";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useAr = () => useNasaq().locale.startsWith("ar");

export const DEMO_PASSWORD = "nasaq123";
export const DEMO_CODE = "123456";
export const DEMO_RECOVERY = "nasaq-2024";

/** Fake sign-in: about 900ms, wrong password gives a form error. */
export async function fakeLogin(password: string, ar: boolean): Promise<AuthSubmitResult> {
  await sleep(900);
  if (password !== DEMO_PASSWORD) return { error: ar ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Incorrect email or password." };
}

export async function fakeCode(code: string, method: "totp" | "recovery", ar: boolean): Promise<AuthSubmitResult> {
  await sleep(700);
  const ok = method === "totp" ? code === DEMO_CODE : code.toLowerCase() === DEMO_RECOVERY;
  if (!ok) return { error: ar ? "الرمز غير صحيح أو منتهي." : "That code is not right, or it expired." };
}

export function StoryFooter() {
  const ar = useAr();
  return (
    <AuthFooter
      links={[
        { label: ar ? "الشروط" : "Terms", href: "#terms" },
        { label: ar ? "الخصوصية" : "Privacy", href: "#privacy" },
        { label: ar ? "المساعدة" : "Help", href: "#help" },
      ]}
      end={
        <>
          <ThemeToggle />
          <LocaleSwitcher showLabel />
        </>
      }
    />
  );
}

const SECURITY: { icon: LucideIcon; en: [string, string]; ar: [string, string] }[] = [
  { icon: Building2, en: ["Single sign-on", "SAML and OIDC with your identity provider. Your company password never reaches us."], ar: ["الدخول الموحّد", "SAML وOIDC مع مزوّد الهوية لديك. كلمة مرور شركتك لا تصل إلينا أبدًا."] },
  { icon: Fingerprint, en: ["Passkeys and two-step verification", "Phishing-resistant sign-in, with one-time codes as a fallback."], ar: ["مفاتيح المرور والتحقق بخطوتين", "دخول مقاوم للتصيّد، مع رموز لمرة واحدة كبديل."] },
  { icon: LockKeyhole, en: ["Encrypted end to end", "TLS in transit and encryption at rest for every account."], ar: ["تشفير كامل", "TLS أثناء النقل وتشفير أثناء التخزين لكل حساب."] },
  { icon: MonitorSmartphone, en: ["Every session in your hands", "Alerts on new devices, a list of where you are signed in, sign out everywhere."], ar: ["كل جلسة تحت سيطرتك", "تنبيه عند كل جهاز جديد، وقائمة بأماكن دخولك، وخروج من كل الأجهزة."] },
  { icon: History, en: ["A full audit trail", "Every sign-in and change is recorded for your admins."], ar: ["سجل تدقيق كامل", "كل دخول وكل تغيير مسجّل لمسؤولي مؤسستك."] },
];

/** The illustration side of the split layout: one identity for every product, and what protects it. */
export function BrandPanel() {
  const ar = useAr();
  return (
    <>
      <ProductLogo size={28} />
      <div className="flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-h2 text-foreground">{ar ? "هوية واحدة لكل منتجاتك." : "One identity for every product."}</p>
          <p className="text-body text-muted-foreground">
            {ar ? "سجّل الدخول مرة واحدة وانتقل بين المنتجات، بحماية على مستوى المؤسسات." : "Sign in once and move between products, with enterprise-grade protection at every step."}
          </p>
        </div>
        <ul className="flex flex-col gap-4">
          {SECURITY.map(({ icon: Icon, en, ar: arText }) => {
            const [title, body] = ar ? arText : en;
            return (
              <li key={en[0]} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-nq-action">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-body-sm font-medium text-foreground">{title}</p>
                  <p className="text-caption text-muted-foreground">{body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-caption text-muted-foreground">{ar ? "© نسق. هويتك، بإدارتك." : "© Nasaq. Your identity, under your control."}</p>
    </>
  );
}

export function DoneScreen({ title, body, onRestart, restart }: { title: string; body: string; onRestart: () => void; restart: string }) {
  return (
    <div className="flex flex-col items-start gap-4" role="status">
      <span className="flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
        <CircleCheck aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-h3 text-foreground">{title}</p>
        <p className="text-body-sm text-muted-foreground">{body}</p>
      </div>
      <button type="button" onClick={onRestart} className="text-body-sm underline underline-offset-4">
        {restart}
      </button>
    </div>
  );
}

export function consentScopes(ar: boolean) {
  return [
    { id: "profile", label: ar ? "قراءة ملفك الشخصي" : "Read your profile", description: ar ? "اسمك وصورتك وبريدك الإلكتروني." : "Your name, photo and email address." },
    { id: "projects", label: ar ? "عرض مشاريعك" : "View your projects", description: ar ? "قوائم المشاريع والمهام، دون تعديلها." : "Project and task lists, without changing them." },
    { id: "write", label: ar ? "إنشاء وتعديل المهام" : "Create and edit tasks", description: ar ? "يمكنه التصرف نيابةً عنك في مشاريعك." : "It can act for you in your projects.", sensitive: true },
  ];
}

/** The "Forgot password?" link for a form's `forgotPassword` slot. */
export function ForgotLink() {
  const ar = useAr();
  return (
    <a href="#forgot" className={buttonVariants({ variant: "link", size: "sm" })}>
      {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
    </a>
  );
}

/** `AuthLayout`'s `prompt` on a sign-in page. */
export function SignUpPrompt() {
  const ar = useAr();
  return (
    <>
      {ar ? "ليس لديك حساب؟" : "Don't have an account?"} <a href="#register">{ar ? "أنشئ حسابًا" : "Create one"}</a>
    </>
  );
}

/** `AuthLayout`'s `prompt` on a sign-up page. */
export function SignInPrompt() {
  const ar = useAr();
  return (
    <>
      {ar ? "لديك حساب بالفعل؟" : "Already have an account?"} <a href="#sign-in">{ar ? "سجّل الدخول" : "Sign in"}</a>
    </>
  );
}
