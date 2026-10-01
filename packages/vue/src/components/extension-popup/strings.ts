import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

// Same strings as the React component (packages/web/src/components/extension-popup).
export const STRINGS = {
  en: {
    connected: "Connected",
    disconnected: "Not connected",
    paused: "Paused",
    error: "Problem",
    pause: "Pause",
    pauseHint: "Stops the extension on every site until you turn it back on.",
    options: "Options",
    connectTitle: "Connect to your workspace",
    connectHint: "Enter your server address, then sign in. The extension never asks for a password itself.",
    serverLabel: "Server address",
    serverPlaceholder: "https://app.example.com",
    connect: "Connect",
    pairTitle: "Pair with your account",
    pairHint: "Open Settings, Extensions in the app and type the pairing code it shows.",
    codeLabel: "Pairing code",
    pair: "Pair",
    invalidServer: "Enter a full address, starting with https://",
    invalidCode: "The code has 6 characters",
    quickActions: "Quick actions",
    save: "Save changes",
    saved: "Saved",
    unsaved: "Unsaved changes",
    version: "Version {version}",
  },
  ar: {
    connected: "متصل",
    disconnected: "غير متصل",
    paused: "متوقف مؤقتًا",
    error: "مشكلة",
    pause: "إيقاف مؤقت",
    pauseHint: "يوقف الإضافة على كل المواقع حتى تعيد تشغيلها.",
    options: "الخيارات",
    connectTitle: "الاتصال بمساحة عملك",
    connectHint: "أدخل عنوان الخادم ثم سجّل الدخول. الإضافة لا تطلب كلمة المرور بنفسها.",
    serverLabel: "عنوان الخادم",
    serverPlaceholder: "https://app.example.com",
    connect: "اتصال",
    pairTitle: "الاقتران بحسابك",
    pairHint: "افتح الإعدادات ثم الإضافات في التطبيق واكتب رمز الاقتران الظاهر.",
    codeLabel: "رمز الاقتران",
    pair: "اقتران",
    invalidServer: "أدخل عنوانًا كاملًا يبدأ بـ https://",
    invalidCode: "الرمز من 6 خانات",
    quickActions: "إجراءات سريعة",
    save: "حفظ التغييرات",
    saved: "تم الحفظ",
    unsaved: "تغييرات غير محفوظة",
    version: "الإصدار {version}",
  },
};

export type ExtensionPopupLabels = Partial<(typeof STRINGS)["en"]>;
export type ExtensionStatus = "connected" | "disconnected" | "error";

export function useExtensionStrings(labels: () => ExtensionPopupLabels | undefined): { t: ComputedRef<typeof STRINGS.en> } {
  const nq = useNasaq();
  return { t: computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() })) };
}

/** Whether a string is an http(s) URL with a host: what the connect form accepts. */
export function isServerAddress(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}
