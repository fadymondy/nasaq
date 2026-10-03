import type { LockMethod } from "./lock-model";

export const STRINGS = {
  en: {
    lockedTitle: "Locked",
    lockedDescription: "Enter your credentials to continue.",
    idleTitle: "Locked after inactivity",
    idleDescription: "You were away, so we locked the app to protect your data.",
    quietTitle: "Quiet mode is on",
    quietDescription: "Notifications are paused. Enter your PIN to look inside.",
    pinLabel: "PIN",
    pinGroup: "PIN keypad",
    digit: "Digit {digit}",
    backspace: "Delete last digit",
    entered: "{count} of {length} digits entered",
    passwordLabel: "Password",
    codeLabel: "Authenticator code",
    box: "Digit {index} of {length}",
    unlock: "Unlock",
    biometric: "Use biometrics",
    biometricHint: "Use your fingerprint or face to unlock.",
    biometricPrompt: "Waiting for your device",
    passkey: "Use a passkey",
    passkeyHint: "Confirm with the passkey on this device.",
    passkeyPrompt: "Waiting for your passkey",
    usePasskey: "Use a passkey",
    switchAccount: "Switch account",
    switchAccountMenu: "Accounts on this device",
    anotherAccount: "Sign in to another account",
    usePin: "Use PIN",
    usePassword: "Use password",
    useBiometric: "Use biometrics",
    signOut: "Not you? Sign out",
    passwordRequired: "Enter your password.",
    codeRequired: "Enter all {length} digits of the code.",
    wrongPin: "That PIN is not right. {left} tries left.",
    lockout: "Too many attempts. Try again in {time}.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    lockedTitle: "مقفل",
    lockedDescription: "أدخل بياناتك للمتابعة.",
    idleTitle: "أُقفل بعد فترة خمول",
    idleDescription: "كنت بعيدًا، فأقفلنا التطبيق لحماية بياناتك.",
    quietTitle: "الوضع الهادئ مفعّل",
    quietDescription: "الإشعارات متوقفة. أدخل الرقم السري لتصفّح المحتوى.",
    pinLabel: "الرقم السري",
    pinGroup: "لوحة الرقم السري",
    digit: "الرقم {digit}",
    backspace: "حذف آخر رقم",
    entered: "أُدخل {count} من {length} أرقام",
    passwordLabel: "كلمة المرور",
    codeLabel: "رمز تطبيق المصادقة",
    box: "الخانة {index} من {length}",
    unlock: "فتح القفل",
    biometric: "استخدم البصمة أو الوجه",
    biometricHint: "استخدم بصمتك أو وجهك لفتح القفل.",
    biometricPrompt: "بانتظار جهازك",
    passkey: "استخدم مفتاح المرور",
    passkeyHint: "أكّد بمفتاح المرور على هذا الجهاز.",
    passkeyPrompt: "بانتظار مفتاح المرور",
    usePasskey: "استخدم مفتاح المرور",
    switchAccount: "تبديل الحساب",
    switchAccountMenu: "الحسابات على هذا الجهاز",
    anotherAccount: "سجّل الدخول بحساب آخر",
    usePin: "استخدم الرقم السري",
    usePassword: "استخدم كلمة المرور",
    useBiometric: "استخدم البصمة أو الوجه",
    signOut: "لست أنت؟ سجّل الخروج",
    passwordRequired: "أدخل كلمة المرور.",
    codeRequired: "أدخل الأرقام الـ {length} كاملة للرمز.",
    wrongPin: "الرقم السري غير صحيح. تبقّت {left} محاولات.",
    lockout: "محاولات كثيرة. حاول مرة أخرى بعد {time}.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type LockScreenLabels = (typeof STRINGS)["en"];

export interface LockUser {
  name: string;
  email?: string;
  avatar?: string;
}

/** What the person entered. `secret` is the PIN or password; empty for biometrics. `code` is the authenticator code, when required. */
export interface LockAttempt {
  method: LockMethod;
  secret: string;
  code?: string;
}

export type LockReason = "locked" | "idle" | "quiet";
