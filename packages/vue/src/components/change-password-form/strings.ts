export const STRINGS = {
  en: {
    current: "Current password",
    next: "New password",
    nextHint: "At least 8 characters.",
    confirm: "Confirm new password",
    signOutOthers: "Sign out of all other sessions",
    signOutOthersHint: "Recommended if you think someone else knows your old password.",
    submit: "Change password",
    success: "Your password was changed.",
    required: "Enter this to continue.",
    tooShort: (n: number) => `Use at least ${n} characters.`,
    mismatch: "The passwords do not match.",
    same: "Choose a password different from your current one.",
    genericError: "Could not change your password. Try again.",
  },
  ar: {
    current: "كلمة المرور الحالية",
    next: "كلمة المرور الجديدة",
    nextHint: "8 أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور الجديدة",
    signOutOthers: "تسجيل الخروج من كل الجلسات الأخرى",
    signOutOthersHint: "يُنصح بذلك إذا كنت تظن أن أحدًا يعرف كلمة المرور القديمة.",
    submit: "تغيير كلمة المرور",
    success: "تم تغيير كلمة المرور.",
    required: "أدخل هذا الحقل للمتابعة.",
    tooShort: (n: number) => `استخدم ${n} أحرف على الأقل.`,
    mismatch: "كلمتا المرور غير متطابقتين.",
    same: "اختر كلمة مرور مختلفة عن الحالية.",
    genericError: "تعذر تغيير كلمة المرور. حاول مرة أخرى.",
  },
};

export type ChangePasswordLabels = (typeof STRINGS)["en"];

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  /** True when the user asked to sign out of every other session. */
  signOutOthers: boolean;
}

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export type ChangePasswordResult = void | { error?: string; fieldErrors?: Partial<Record<ChangePasswordField, string>> };
