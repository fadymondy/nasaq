/*
 * Shared bits for the auth stories: a fake async backend, the layout footer and the split panel.
 * Demo credentials: any email, password `nasaq123`, code `123456`, recovery code `nasaq-2024`.
 */
import { AuthFooter, LocaleSwitcher, ProductLogo, useNasaq, type AuthSubmitResult } from "@nasaq/web";
import { CircleCheck } from "lucide-react";

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
      end={<LocaleSwitcher showLabel />}
    />
  );
}

/** The illustration side of the split layout. */
export function BrandPanel() {
  const ar = useAr();
  return (
    <>
      <ProductLogo size={28} />
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-h2 text-foreground">{ar ? "كل منتجاتك، حساب واحد." : "One account for every product."}</p>
        <p className="text-body text-muted-foreground">
          {ar ? "سجّل الدخول مرة واحدة وانتقل بين المنتجات دون إعادة تسجيل." : "Sign in once and move between products without signing in again."}
        </p>
      </div>
      <p className="text-caption text-muted-foreground">{ar ? "محمي بالتحقق بخطوتين ومفاتيح المرور." : "Protected by two-step verification and passkeys."}</p>
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
