export interface ForgotPasswordValues {
  email: string;
}

export interface ForgotPasswordFormLabels {
  email: string;
  emailPlaceholder: string;
  submit: string;
  emailRequired: string;
  emailInvalid: string;
  errorTitle: string;
  failed: string;
  sentTitle: string;
  /** Use `{email}` where the address goes. */
  sentBody: string;
  resend: string;
  /** Use `{time}` for the countdown, e.g. "Resend in 0:27". */
  resendIn: string;
  resent: string;
  changeEmail: string;
}

export const STRINGS: Record<"en" | "ar", ForgotPasswordFormLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@example.com",
    submit: "Send reset link",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    errorTitle: "Fix this to continue",
    failed: "Something went wrong. Try again.",
    sentTitle: "Check your inbox",
    sentBody: "If an account exists for {email}, we sent a link to reset the password.",
    resend: "Resend email",
    resendIn: "Resend in {time}",
    resent: "We sent the email again.",
    changeEmail: "Use a different email",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    submit: "إرسال رابط إعادة التعيين",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    errorTitle: "صحّح هذا للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    sentTitle: "تحقق من بريدك",
    sentBody: "إن كان هناك حساب مرتبط بـ {email} فقد أرسلنا رابطًا لإعادة تعيين كلمة المرور.",
    resend: "إعادة إرسال الرسالة",
    resendIn: "إعادة الإرسال بعد {time}",
    resent: "أرسلنا الرسالة مرة أخرى.",
    changeEmail: "استخدام بريد آخر",
  },
};
