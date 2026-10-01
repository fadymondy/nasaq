/* Pure helpers for the share action. No DOM, covered by test/share-action.test.mjs. */

export type ShareExpiry = "never" | "1d" | "7d" | "30d";

const DAY = 24 * 60 * 60 * 1000;
const EXPIRY_DAYS: Record<ShareExpiry, number> = { never: 0, "1d": 1, "7d": 7, "30d": 30 };

/** The moment a link created `now` expires, or null for "never". */
export function expiryToDate(expiry: ShareExpiry, now: Date | number = Date.now()): Date | null {
  const days = EXPIRY_DAYS[expiry];
  return days ? new Date(new Date(now).getTime() + days * DAY) : null;
}

const EMAIL = /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]{2,}$/u;

/** A pragmatic email check: something@domain.tld with no spaces. Real validation happens on the server. */
export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Splits pasted text ("a@x.com, b@y.com; c@z.com") into lower-cased, de-duplicated addresses. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\s,;]+/u)) {
    const email = part.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

/** Adds a link's expiry to a URL as `?expires=` for demos and simple backends. Leaves the URL alone for "never". */
export function withExpiry(url: string, expiry: ShareExpiry, now: Date | number = Date.now()): string {
  const at = expiryToDate(expiry, now);
  if (!at) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("expires", at.toISOString());
    return u.toString();
  } catch {
    return url;
  }
}

/** A `mailto:` link that shares the URL by email. */
export function mailtoLink(url: string, title?: string, text?: string): string {
  const body = [text, url].filter(Boolean).join("\n\n");
  return `mailto:?subject=${encodeURIComponent(title ?? url)}&body=${encodeURIComponent(body)}`;
}

export const STRINGS = {
  en: {
    share: "Share",
    title: "Share",
    description: "Invite people or send a link.",
    invite: "Invite people",
    invitePlaceholder: "Add email addresses",
    inviteHint: "Press Enter or comma after each address.",
    invalidEmail: (v: string) => `${v} is not a valid email address.`,
    sendInvite: "Send invite",
    inviteSent: (n: string) => `Invitation sent to ${n}.`,
    role: "Role",
    people: "People with access",
    owner: "Owner",
    remove: "Remove access",
    removeFor: (name: string) => `Remove ${name}`,
    roleFor: (name: string) => `Role for ${name}`,
    linkAccess: "Link access",
    restricted: "Restricted",
    restrictedHint: "Only people you invite can open the link.",
    anyone: "Anyone with the link",
    anyoneHint: "Anyone who has the link can open it.",
    linkRole: "Link permission",
    expiry: "Link expires",
    never: "Never",
    "1d": "In 1 day",
    "7d": "In 7 days",
    "30d": "In 30 days",
    link: "Link",
    copyLink: "Copy link",
    copied: "Copied",
    nativeShare: "Share via…",
    email: "Email",
    done: "Done",
    close: "Close",
    failed: "Something went wrong. Try again.",
    expiresOn: "Expires",
  },
  ar: {
    share: "مشاركة",
    title: "مشاركة",
    description: "ادعُ أشخاصًا أو أرسل رابطًا.",
    invite: "دعوة أشخاص",
    invitePlaceholder: "أضف عناوين البريد",
    inviteHint: "اضغط Enter أو الفاصلة بعد كل عنوان.",
    invalidEmail: (v: string) => `${v} ليس بريدًا إلكترونيًا صالحًا.`,
    sendInvite: "إرسال الدعوة",
    inviteSent: (n: string) => `أُرسلت الدعوة إلى ${n}.`,
    role: "الدور",
    people: "أشخاص لديهم صلاحية",
    owner: "المالك",
    remove: "إزالة الصلاحية",
    removeFor: (name: string) => `إزالة ${name}`,
    roleFor: (name: string) => `دور ${name}`,
    linkAccess: "الوصول عبر الرابط",
    restricted: "مقيّد",
    restrictedHint: "يفتح الرابط من دعوتهم فقط.",
    anyone: "أي شخص لديه الرابط",
    anyoneHint: "يستطيع فتحه كل من لديه الرابط.",
    linkRole: "صلاحية الرابط",
    expiry: "ينتهي الرابط",
    never: "أبدًا",
    "1d": "بعد يوم",
    "7d": "بعد 7 أيام",
    "30d": "بعد 30 يومًا",
    link: "الرابط",
    copyLink: "نسخ الرابط",
    copied: "تم النسخ",
    nativeShare: "مشاركة عبر…",
    email: "البريد",
    done: "تم",
    close: "إغلاق",
    failed: "حدث خطأ. حاول مرة أخرى.",
    expiresOn: "ينتهي",
  },
};
export const DEFAULT_ROLES: Record<"en" | "ar", { value: string; label: string }[]> = {
  en: [
    { value: "viewer", label: "Can view" },
    { value: "commenter", label: "Can comment" },
    { value: "editor", label: "Can edit" },
  ],
  ar: [
    { value: "viewer", label: "يمكنه العرض" },
    { value: "commenter", label: "يمكنه التعليق" },
    { value: "editor", label: "يمكنه التعديل" },
  ],
};
export const EXPIRIES: ("never" | "1d" | "7d" | "30d")[] = ["never", "1d", "7d", "30d"];
export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];
export const defaultRoles = (locale: string) => DEFAULT_ROLES[locale.startsWith("ar") ? "ar" : "en"];

export type Strings = typeof STRINGS.en;
export type Labels = Partial<Strings>;
