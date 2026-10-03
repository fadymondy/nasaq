import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { ContactChannel, ContactIdentityIssue } from "./contact-identities-logic";

// Same strings as the React component (packages/web/src/components/contact-identities).
export const STRINGS = {
  en: {
    title: "Linked accounts",
    description: "Every address, number and handle this person uses. A message to any of them reaches the same contact.",
    empty: "No linked accounts",
    emptyHint: "Link an email, a phone number or a chat handle.",
    link: "Link an account",
    channel: "Channel",
    value: "Account",
    valuePlaceholder: "Address, number or @handle",
    label: "Label",
    labelPlaceholder: "Work, personal…",
    add: "Link",
    cancel: "Cancel",
    primary: "Primary",
    makePrimary: "Make primary",
    verified: "Verified",
    copy: "Copy",
    remove: "Unlink",
    removeTitle: (v: string) => `Unlink ${v}?`,
    removeBody: "New messages from this account will stop being matched to this contact.",
    consentTitle: "Consent by channel",
    consentDescription: "Whether this person agreed to be written to. Consent belongs to the channel, so it covers every account on it.",
    consentGranted: "Opted in",
    consentDenied: "Opted out",
    consentUnknown: "Not asked",
    consentSwitch: (c: string) => `Allow messages on ${c}`,
    consentNoAccount: "No account linked on this channel",
    since: "Since",
    via: "via",
    failed: "That did not work. Try again.",
    issues: {
      empty: "Enter the account.",
      email: "That is not a valid email address.",
      phone: "Enter the number with its country code.",
      duplicate: "This account is already linked.",
    } as Record<ContactIdentityIssue, string>,
    channels: {
      email: "Email",
      phone: "Phone",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      discord: "Discord",
      messenger: "Messenger",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      x: "X",
      chat: "Chat widget",
      other: "Other",
    } as Record<ContactChannel, string>,
  },
  ar: {
    title: "الحسابات المرتبطة",
    description: "كل عنوان ورقم ومعرّف يستخدمه هذا الشخص. أي رسالة من أي منها تصل إلى جهة الاتصال نفسها.",
    empty: "لا توجد حسابات مرتبطة",
    emptyHint: "اربط بريدًا أو رقم هاتف أو معرّف محادثة.",
    link: "ربط حساب",
    channel: "القناة",
    value: "الحساب",
    valuePlaceholder: "عنوان أو رقم أو @معرّف",
    label: "التسمية",
    labelPlaceholder: "عمل، شخصي…",
    add: "ربط",
    cancel: "إلغاء",
    primary: "أساسي",
    makePrimary: "اجعله أساسيًا",
    verified: "موثّق",
    copy: "نسخ",
    remove: "فك الربط",
    removeTitle: (v: string) => `فك ربط ${v}؟`,
    removeBody: "لن تُنسب الرسائل الجديدة من هذا الحساب إلى جهة الاتصال هذه.",
    consentTitle: "الموافقة حسب القناة",
    consentDescription: "هل وافق هذا الشخص على مراسلته. الموافقة تخص القناة، فتشمل كل حساب عليها.",
    consentGranted: "موافق",
    consentDenied: "رافض",
    consentUnknown: "لم يُسأل",
    consentSwitch: (c: string) => `السماح بالرسائل على ${c}`,
    consentNoAccount: "لا يوجد حساب مرتبط على هذه القناة",
    since: "منذ",
    via: "عبر",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    issues: {
      empty: "أدخل الحساب.",
      email: "هذا ليس بريدًا إلكترونيًا صالحًا.",
      phone: "أدخل الرقم مع رمز الدولة.",
      duplicate: "هذا الحساب مرتبط بالفعل.",
    } as Record<ContactIdentityIssue, string>,
    channels: {
      email: "البريد",
      phone: "الهاتف",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      discord: "Discord",
      messenger: "Messenger",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      x: "X",
      chat: "ودجة الدردشة",
      other: "أخرى",
    } as Record<ContactChannel, string>,
  },
};

export type ContactIdentitiesLabels = Omit<typeof STRINGS.en, "channels" | "issues"> & {
  channels: Record<ContactChannel, string>;
  issues: Record<ContactIdentityIssue, string>;
};
export type ContactIdentitiesLabelOverrides = Partial<Omit<ContactIdentitiesLabels, "channels" | "issues">> & {
  channels?: Partial<ContactIdentitiesLabels["channels"]>;
  issues?: Partial<ContactIdentitiesLabels["issues"]>;
};

/** The built-in strings for the active locale, with `labels` laid over them. Brand names stay as written in both languages. */
export function useContactIdentitiesLabels(labels: () => ContactIdentitiesLabelOverrides | undefined): ComputedRef<ContactIdentitiesLabels> {
  const nq = useNasaq();
  return computed(() => {
    const base = STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"];
    const l = labels();
    return { ...base, ...l, channels: { ...base.channels, ...l?.channels }, issues: { ...base.issues, ...l?.issues } } as ContactIdentitiesLabels;
  });
}
