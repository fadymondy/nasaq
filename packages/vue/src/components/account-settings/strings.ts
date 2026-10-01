import { Bell, Link2, ShieldCheck, TriangleAlert, User } from "lucide-vue-next";
import type { Component } from "vue";

const STRINGS = {
  en: {
    title: "Account settings",
    description: "Manage your profile, sign-in security and preferences.",
    nav: "Settings sections",
    profile: "Profile",
    security: "Security",
    connected: "Connected accounts",
    notifications: "Notifications",
    danger: "Danger zone",
    dangerTitle: "Delete account",
    dangerDescription: "Permanently delete your account, your data and your access to every workspace. This cannot be undone.",
    dangerButton: "Delete account",
    confirmTitle: "Delete your account?",
    confirmDescription: "Everything tied to this account is removed for good. There is no way to get it back.",
    confirmPrompt: (text: string) => `Type ${text} to confirm`,
    confirmText: "DELETE",
    confirmAction: "Delete my account",
    cancel: "Cancel",
    deleteFailed: "Your account could not be deleted. Try again.",
  },
  ar: {
    title: "إعدادات الحساب",
    description: "أدر ملفك الشخصي وأمان تسجيل الدخول وتفضيلاتك.",
    nav: "أقسام الإعدادات",
    profile: "الملف الشخصي",
    security: "الأمان",
    connected: "الحسابات المرتبطة",
    notifications: "الإشعارات",
    danger: "منطقة الخطر",
    dangerTitle: "حذف الحساب",
    dangerDescription: "احذف حسابك وبياناتك ووصولك إلى كل مساحات العمل نهائيًا. لا يمكن التراجع عن ذلك.",
    dangerButton: "حذف الحساب",
    confirmTitle: "حذف حسابك؟",
    confirmDescription: "يُحذف كل ما يرتبط بهذا الحساب نهائيًا. ولا توجد طريقة لاستعادته.",
    confirmPrompt: (text: string) => `اكتب ${text} للتأكيد`,
    confirmText: "حذف",
    confirmAction: "احذف حسابي",
    cancel: "إلغاء",
    deleteFailed: "تعذّر حذف حسابك. حاول مرة أخرى.",
  },
};

export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export interface AccountSettingsItem {
  id: string;
  label: string;
  /** A lucide-vue-next icon. */
  icon?: Component;
  /** Shown to assistive technology and as a tooltip on the desktop nav. */
  description?: string;
  /** "danger" colours the item as destructive. */
  tone?: "default" | "danger";
  /** A count or dot at the inline end of the desktop nav item. */
  badge?: string | number;
  /** A component rendered as this item's content. Or use the named slot with the item id, or the default slot. */
  content?: Component;
}

/** The five standard sections in the account settings order, labelled in the active language. */
export function defaultAccountSettingsItems(locale = "en"): AccountSettingsItem[] {
  const t = strings(locale);
  return [
    { id: "profile", label: t.profile, icon: User },
    { id: "security", label: t.security, icon: ShieldCheck },
    { id: "connected", label: t.connected, icon: Link2 },
    { id: "notifications", label: t.notifications, icon: Bell },
    { id: "danger", label: t.danger, icon: TriangleAlert, tone: "danger" },
  ];
}

export const navItem = [
  "flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground",
  "[&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");
