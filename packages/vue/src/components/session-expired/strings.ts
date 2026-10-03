import type { AuthSubmitResult } from "../auth-layout";
import type { LockUser } from "../lock-screen/strings";

export const STRINGS = {
  en: {
    expired: "Your session expired",
    expiredHint: "For your security we signed you out after a while. Sign in again to pick up where you left off.",
    revoked: "You were signed out",
    revokedHint: "This session was ended from another device or by an admin. Sign in again to continue.",
    passwordChanged: "Your password changed",
    passwordChangedHint: "Sign in with your new password to continue.",
    password: "Password",
    passwordRequired: "Enter your password.",
    codeLabel: "Authenticator code",
    codeRequired: "Enter all 6 digits of the code.",
    box: "Digit {index} of 6",
    submit: "Sign in again",
    passkey: "Use a passkey",
    divider: "or",
    switchAccount: "Use a different account",
    signOut: "Sign out",
    errorTitle: "Fix these to continue",
    failed: "Something went wrong. Try again.",
    lostWork: "Your unsaved changes are kept in this tab.",
  },
  ar: {
    expired: "انتهت جلستك",
    expiredHint: "لأمانك سجّلنا خروجك بعد فترة. سجّل الدخول مرة أخرى لتكمل من حيث توقفت.",
    revoked: "تم تسجيل خروجك",
    revokedHint: "أُنهيت هذه الجلسة من جهاز آخر أو بواسطة مسؤول. سجّل الدخول مرة أخرى للمتابعة.",
    passwordChanged: "تغيّرت كلمة مرورك",
    passwordChangedHint: "سجّل الدخول بكلمة المرور الجديدة للمتابعة.",
    password: "كلمة المرور",
    passwordRequired: "أدخل كلمة المرور.",
    codeLabel: "رمز تطبيق المصادقة",
    codeRequired: "أدخل الأرقام الـ 6 كاملة للرمز.",
    box: "الخانة {index} من 6",
    submit: "سجّل الدخول مرة أخرى",
    passkey: "استخدم مفتاح المرور",
    divider: "أو",
    switchAccount: "استخدم حسابًا آخر",
    signOut: "تسجيل الخروج",
    errorTitle: "أصلح هذه الحقول للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    lostWork: "تغييراتك غير المحفوظة محفوظة في هذا التبويب.",
  },
};

export type SessionExpiredLabels = (typeof STRINGS)["en"];
export type SessionExpiredReason = "expired" | "revoked" | "password-changed";

export interface SessionExpiredValues {
  password: string;
  /** The authenticator code, when `requireCode` is set. */
  code?: string;
}

export type { AuthSubmitResult, LockUser };
