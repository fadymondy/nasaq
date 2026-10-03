export interface LoginValues {
  email: string;
  password: string;
  remember: boolean;
}

/** A way to sign in with the email field: a password, or a one-time link sent by email. */
export type LoginMethod = "password" | "magic-link";

export interface LoginFormLabels {
  email: string;
  emailPlaceholder: string;
  password: string;
  remember: string;
  submit: string;
  passkey: string;
  /** Between the form and the passkey / provider buttons. Default "or". */
  divider: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  /** Heading of the error summary when fields need fixing. */
  errorTitle: string;
  /** Shown when `onSubmit` throws. */
  failed: string;
  /** The magic-link button. */
  magicLink: string;
  sentTitle: string;
  /** Use `{email}` for the address. */
  sentBody: string;
  resend: string;
  /** Use `{time}` for the countdown. */
  resendIn: string;
  /** Announced after a resend. */
  resent: string;
  changeEmail: string;
  devLogin: string;
  /** Shown when `onDevLogin` throws. */
  devFailed: string;
  blockedTitle: string;
  blockedBody: string;
}

export const STRINGS: Record<"en" | "ar", LoginFormLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    remember: "Remember me",
    submit: "Sign in",
    passkey: "Sign in with a passkey",
    divider: "or",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    errorTitle: "Fix these to sign in",
    failed: "Something went wrong. Try again.",
    magicLink: "Email me a sign-in link",
    sentTitle: "Check your email",
    sentBody: "We sent a sign-in link to {email}. It works once and expires soon.",
    resend: "Send the link again",
    resendIn: "Send again in {time}",
    resent: "We sent a new link.",
    changeEmail: "Use a different email",
    devLogin: "Dev login",
    devFailed: "Dev login failed.",
    blockedTitle: "Sign-in is not available",
    blockedBody: "This account can't sign in here. Contact your administrator.",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    remember: "تذكّرني",
    submit: "تسجيل الدخول",
    passkey: "تسجيل الدخول بمفتاح المرور",
    divider: "أو",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordRequired: "أدخل كلمة المرور.",
    errorTitle: "صحّح ما يلي لتسجيل الدخول",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    magicLink: "أرسل لي رابط تسجيل الدخول",
    sentTitle: "تحقّق من بريدك",
    sentBody: "أرسلنا رابط تسجيل الدخول إلى {email}. يعمل مرة واحدة وتنتهي صلاحيته قريبًا.",
    resend: "أرسل الرابط مرة أخرى",
    resendIn: "أعد الإرسال بعد {time}",
    resent: "أرسلنا رابطًا جديدًا.",
    changeEmail: "استخدم بريدًا آخر",
    devLogin: "دخول المطوّر",
    devFailed: "فشل دخول المطوّر.",
    blockedTitle: "تسجيل الدخول غير متاح",
    blockedBody: "لا يمكن لهذا الحساب تسجيل الدخول هنا. تواصل مع المسؤول.",
  },
};

