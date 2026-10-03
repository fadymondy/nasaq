export const STRINGS = {
  en: {
    title: "Active sessions",
    description: "Devices signed in to your account. Sign out any you do not recognise.",
    list: "Signed-in devices",
    current: "This device",
    lastActive: "Active",
    signOut: "Sign out",
    signOutTitle: "Sign out this device?",
    signOutBody: "It will need the password to sign in again.",
    signOutOthers: "Sign out other devices",
    signOutOthersTitle: "Sign out every other device?",
    signOutOthersBody: "Only this device stays signed in.",
    emptyTitle: "No other sessions",
    emptyBody: "You are signed in on this device only.",
    unknownDevice: "Unknown device",
  },
  ar: {
    title: "الجلسات النشطة",
    description: "الأجهزة المسجّل دخولها إلى حسابك. سجّل الخروج من أي جهاز لا تعرفه.",
    list: "الأجهزة المسجّل دخولها",
    current: "هذا الجهاز",
    lastActive: "نشط",
    signOut: "تسجيل الخروج",
    signOutTitle: "تسجيل الخروج من هذا الجهاز؟",
    signOutBody: "سيحتاج إلى كلمة المرور لتسجيل الدخول مرة أخرى.",
    signOutOthers: "تسجيل الخروج من الأجهزة الأخرى",
    signOutOthersTitle: "تسجيل الخروج من كل الأجهزة الأخرى؟",
    signOutOthersBody: "سيبقى هذا الجهاز فقط مسجّل الدخول.",
    emptyTitle: "لا توجد جلسات أخرى",
    emptyBody: "أنت مسجّل الدخول على هذا الجهاز فقط.",
    unknownDevice: "جهاز غير معروف",
  },
};

export type ActiveSessionsLabels = (typeof STRINGS)["en"];

export type SessionDeviceKind = "desktop" | "mobile" | "tablet" | "other";

export interface ActiveSession {
  id: string;
  /** "Chrome on macOS". Built from the user agent on your server. */
  device?: string;
  kind?: SessionDeviceKind;
  ip?: string;
  /** "Cairo, Egypt". */
  location?: string;
  lastActiveAt: Date | number | string;
  createdAt?: Date | number | string;
  /** The session making this request. It cannot be signed out from the list. */
  current?: boolean;
}

export type RevokeResult = void | { error?: string };
