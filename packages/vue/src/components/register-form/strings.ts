export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface RegisterFormLabels {
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  /** Hint under the password. Use `{min}` for the minimum length. */
  passwordHint: string;
  confirm: string;
  /** Default "I agree to the terms of service and privacy policy". Prefer the `terms` slot to add links. */
  terms: string;
  submit: string;
  divider: string;
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  passwordShort: string;
  confirmMismatch: string;
  termsRequired: string;
  errorTitle: string;
  failed: string;
}

export const STRINGS: Record<"en" | "ar", RegisterFormLabels> = {
  en: {
    name: "Full name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordHint: "At least {min} characters.",
    confirm: "Confirm password",
    terms: "I agree to the terms of service and privacy policy",
    submit: "Create account",
    divider: "or sign up with email",
    nameRequired: "Enter your name.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordShort: "Use at least {min} characters.",
    confirmMismatch: "The passwords do not match.",
    termsRequired: "Accept the terms to continue.",
    errorTitle: "Fix these to create your account",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    name: "الاسم الكامل",
    namePlaceholder: "اسمك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    passwordHint: "{min} أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور",
    terms: "أوافق على شروط الخدمة وسياسة الخصوصية",
    submit: "إنشاء حساب",
    divider: "أو سجّل بالبريد الإلكتروني",
    nameRequired: "أدخل اسمك.",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    termsRequired: "وافق على الشروط للمتابعة.",
    errorTitle: "صحّح ما يلي لإنشاء حسابك",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
