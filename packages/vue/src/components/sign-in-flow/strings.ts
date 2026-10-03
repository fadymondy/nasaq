import type { AuthSubmitResult } from "../auth-layout";

/** Another way in, offered on the password step. */
export type SignInAlternative = "code" | "magic-link";

export type SignInNext =
  /**
   * Ask for the password. `alternatives` limits the other ways in for this address (policy, account type);
   * default: every one you passed a handler for. `[]` hides them.
   */
  | { step: "password"; alternatives?: readonly SignInAlternative[] }
  /** A one-time code was sent to the email. */
  | { step: "code"; length?: number }
  /** The domain belongs to an organisation with single sign-on. `connection` is its display name. */
  | { step: "sso"; connection?: string }
  /** No account uses this address. */
  | { step: "register" }
  /** A sign-in link was already sent to the email. */
  | { step: "link-sent" }
  /** This address may not sign in here (suspended, wrong tenant, no allowed method). `message` replaces the default text. */
  | { step: "blocked"; message?: string };

/** What `onPassword` may resolve to: nothing on success, a failure, or `{ twoFactor: true }` to ask for a second factor. */
export type SignInPasswordResult = AuthSubmitResult | { twoFactor: true; length?: number };

export type SignInStep = "email" | SignInNext["step"] | "two-factor" | "forgot";

export interface SignInFlowLabels {
  email: string;
  emailPlaceholder: string;
  continue: string;
  divider: string;
  passkey: string;
  change: string;
  password: string;
  remember: string;
  signIn: string;
  useCode: string;
  ssoTitle: string;
  /** `{connection}` is replaced by the organisation's connection name. */
  ssoWith: string;
  ssoBody: string;
  ssoContinue: string;
  registerTitle: string;
  registerBody: string;
  register: string;
  otherEmail: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  capsLock: string;
  lastUsed: string;
  errorTitle: string;
  failed: string;
  magicLink: string;
  linkSentTitle: string;
  /** `{email}` is replaced by the address. */
  linkSentBody: string;
  resend: string;
  /** `{time}` is replaced by the countdown. */
  resendIn: string;
  resent: string;
  blockedTitle: string;
  blockedBody: string;
  forgotPassword: string;
  backToSignIn: string;
}

export const STRINGS: Record<"en" | "ar", SignInFlowLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@company.com",
    continue: "Continue",
    divider: "or",
    passkey: "Sign in with a passkey",
    change: "Change",
    password: "Password",
    remember: "Keep me signed in",
    signIn: "Sign in",
    useCode: "Email me a code instead",
    ssoTitle: "Your organisation uses single sign-on",
    ssoWith: "Continue with {connection}",
    ssoBody: "You will sign in with your organisation's identity provider and come back here.",
    ssoContinue: "Continue with SSO",
    registerTitle: "No account uses this email",
    registerBody: "Create one in a minute, or try another address.",
    register: "Create an account",
    otherEmail: "Use another email",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    capsLock: "Caps Lock is on.",
    lastUsed: "Last used",
    errorTitle: "Fix these to continue",
    failed: "Something went wrong. Try again.",
    magicLink: "Email me a sign-in link",
    linkSentTitle: "Check your email",
    linkSentBody: "We sent a sign-in link to {email}. Open it on this device to finish signing in.",
    resend: "Send the link again",
    resendIn: "Send again in {time}",
    resent: "We sent a new link.",
    blockedTitle: "This account can't sign in here",
    blockedBody: "Contact your administrator, or try another address.",
    forgotPassword: "Forgot password?",
    backToSignIn: "Back to sign in",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@company.com",
    continue: "متابعة",
    divider: "أو",
    passkey: "تسجيل الدخول بمفتاح المرور",
    change: "تغيير",
    password: "كلمة المرور",
    remember: "إبقائي مسجّلًا",
    signIn: "تسجيل الدخول",
    useCode: "أرسل لي رمزًا بالبريد بدلًا من ذلك",
    ssoTitle: "مؤسستك تستخدم الدخول الموحّد",
    ssoWith: "المتابعة باستخدام {connection}",
    ssoBody: "ستسجّل الدخول عبر مزوّد الهوية في مؤسستك ثم تعود إلى هنا.",
    ssoContinue: "المتابعة بالدخول الموحّد",
    registerTitle: "لا يوجد حساب بهذا البريد",
    registerBody: "أنشئ حسابًا في دقيقة، أو جرّب بريدًا آخر.",
    register: "إنشاء حساب",
    otherEmail: "استخدام بريد آخر",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordRequired: "أدخل كلمة المرور.",
    capsLock: "مفتاح الأحرف الكبيرة (Caps Lock) مفعّل.",
    lastUsed: "آخر استخدام",
    errorTitle: "صحّح ما يلي للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    magicLink: "أرسل لي رابط تسجيل الدخول",
    linkSentTitle: "تحقّق من بريدك",
    linkSentBody: "أرسلنا رابط تسجيل الدخول إلى {email}. افتحه على هذا الجهاز لإكمال تسجيل الدخول.",
    resend: "أرسل الرابط مرة أخرى",
    resendIn: "أعد الإرسال بعد {time}",
    resent: "أرسلنا رابطًا جديدًا.",
    blockedTitle: "لا يمكن لهذا الحساب تسجيل الدخول هنا",
    blockedBody: "تواصل مع المسؤول، أو جرّب بريدًا آخر.",
    forgotPassword: "نسيت كلمة المرور؟",
    backToSignIn: "العودة لتسجيل الدخول",
  },
};
