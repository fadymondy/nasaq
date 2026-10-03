export interface ResetPasswordValues {
  password: string;
}

export interface ResetPasswordFormLabels {
  password: string;
  /** Use `{min}` for the minimum length. */
  passwordHint: string;
  confirm: string;
  submit: string;
  passwordShort: string;
  /** Shown when `rules` is on and a rule is not met. */
  passwordWeak: string;
  confirmMismatch: string;
  errorTitle: string;
  failed: string;
  successTitle: string;
  successBody: string;
  signIn: string;
  expiredTitle: string;
  expiredBody: string;
  requestLink: string;
}

export const STRINGS: Record<"en" | "ar", ResetPasswordFormLabels> = {
  en: {
    password: "New password",
    passwordHint: "At least {min} characters.",
    confirm: "Confirm new password",
    submit: "Reset password",
    passwordShort: "Use at least {min} characters.",
    passwordWeak: "Meet every requirement below.",
    confirmMismatch: "The passwords do not match.",
    errorTitle: "Fix these to reset your password",
    failed: "Something went wrong. Try again.",
    successTitle: "Password changed",
    successBody: "You can now sign in with your new password.",
    signIn: "Sign in",
    expiredTitle: "This link has expired",
    expiredBody: "Reset links work once and only for a short time. Ask for a new one.",
    requestLink: "Send a new link",
  },
  ar: {
    password: "كلمة المرور الجديدة",
    passwordHint: "{min} أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور الجديدة",
    submit: "إعادة تعيين كلمة المرور",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    passwordWeak: "استوفِ كل المتطلبات أدناه.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    errorTitle: "صحّح ما يلي لإعادة تعيين كلمة المرور",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    successTitle: "تم تغيير كلمة المرور",
    successBody: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    signIn: "تسجيل الدخول",
    expiredTitle: "انتهت صلاحية هذا الرابط",
    expiredBody: "روابط إعادة التعيين تعمل مرة واحدة ولمدة قصيرة. اطلب رابطًا جديدًا.",
    requestLink: "أرسل رابطًا جديدًا",
  },
};

export type ResetPasswordState = "idle" | "success" | "expired";

/** A button target: a URL, or a handler. */
export type ResetPasswordTarget = string | (() => void);
