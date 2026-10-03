export const PASSKEY_STRINGS = {
  en: {
    title: "Passkeys",
    description: "Sign in with your fingerprint, face or screen lock instead of a password.",
    add: "Add a passkey",
    unsupportedTitle: "Passkeys are not available in this browser",
    unsupported: "Use a recent version of Chrome, Safari, Edge or Firefox, on a device with a screen lock, to add a passkey.",
    emptyTitle: "No passkeys yet",
    emptyBody: "Add one to sign in faster and safer than with a password.",
    list: "Your passkeys",
    added: "Added",
    lastUsed: "Last used",
    neverUsed: "Never used",
    device: "This device",
    synced: "Synced passkey",
    securityKey: "Security key",
    rename: "Rename",
    renameLabel: "Passkey name",
    save: "Save name",
    cancel: "Cancel",
    remove: "Remove",
    removeTitle: (name: string) => `Remove "${name}"?`,
    removeBody: "You will no longer be able to sign in with this passkey. This cannot be undone.",
    removeConfirm: "Remove passkey",
    addFailed: "Could not add the passkey. Try again.",
    addCancelled: "Adding the passkey was cancelled.",
    renameFailed: "Could not rename the passkey. Try again.",
    removeFailed: "Could not remove the passkey. Try again.",
  },
  ar: {
    title: "مفاتيح المرور",
    description: "سجّل الدخول ببصمتك أو وجهك أو قفل الشاشة بدلًا من كلمة المرور.",
    add: "إضافة مفتاح مرور",
    unsupportedTitle: "مفاتيح المرور غير متاحة في هذا المتصفح",
    unsupported: "استخدم إصدارًا حديثًا من Chrome أو Safari أو Edge أو Firefox على جهاز به قفل شاشة لإضافة مفتاح مرور.",
    emptyTitle: "لا توجد مفاتيح مرور بعد",
    emptyBody: "أضف واحدًا لتسجيل دخول أسرع وأكثر أمانًا من كلمة المرور.",
    list: "مفاتيح المرور الخاصة بك",
    added: "أُضيف",
    lastUsed: "آخر استخدام",
    neverUsed: "لم يُستخدم قط",
    device: "هذا الجهاز",
    synced: "مفتاح مرور متزامن",
    securityKey: "مفتاح أمان",
    rename: "إعادة تسمية",
    renameLabel: "اسم مفتاح المرور",
    save: "حفظ الاسم",
    cancel: "إلغاء",
    remove: "إزالة",
    removeTitle: (name: string) => `إزالة «${name}»؟`,
    removeBody: "لن تتمكن بعد ذلك من تسجيل الدخول بهذا المفتاح. لا يمكن التراجع عن ذلك.",
    removeConfirm: "إزالة مفتاح المرور",
    addFailed: "تعذرت إضافة مفتاح المرور. حاول مرة أخرى.",
    addCancelled: "أُلغيت إضافة مفتاح المرور.",
    renameFailed: "تعذرت إعادة تسمية مفتاح المرور. حاول مرة أخرى.",
    removeFailed: "تعذرت إزالة مفتاح المرور. حاول مرة أخرى.",
  },
};

export type PasskeyLabels = (typeof PASSKEY_STRINGS)["en"];
export type DateInput = Date | number | string;
export type PasskeyKind = "device" | "synced" | "security-key";

export interface Passkey {
  id: string;
  /** The name the user sees and can change, such as "MacBook Pro". */
  name: string;
  /** Where it lives: "This device" (`device`), a cloud keychain (`synced`) or a hardware key (`security-key`). Picks the icon. */
  kind?: PasskeyKind;
  /** A hint about the authenticator, such as "iCloud Keychain" or "YubiKey 5C". */
  authenticator?: string;
  createdAt: DateInput;
  lastUsedAt?: DateInput | null;
}

/** True when this browser can create and use passkeys (`window.PublicKeyCredential` exists). False on the server. */
export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}
