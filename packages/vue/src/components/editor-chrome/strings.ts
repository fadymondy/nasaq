import { computed } from "vue";
import { useNasaq } from "../../provider";

export const STRINGS = {
  en: {
    openDocuments: "Open documents",
    untitled: "Untitled",
    close: "Close {title}",
    unsaved: "Unsaved changes",
    newTab: "New document",
    closeTab: "Close",
    closeOthers: "Close others",
    closeAll: "Close all",
    pin: "Pin",
    unpin: "Unpin",
    line: "Ln {n}",
    column: "Col {n}",
    words: "{n} words",
    characters: "{n} characters",
    selected: "{n} selected",
    saved: "Saved",
    saving: "Saving",
    dirty: "Unsaved changes",
    error: "Could not save",
    offline: "Offline, kept on this device",
    retry: "Retry",
    statusBar: "Editor status",
    backlinks: "Backlinks",
    related: "Related",
    noBacklinks: "Nothing links here yet.",
    noRelated: "No related documents.",
    panel: "Links and related documents",
  },
  ar: {
    openDocuments: "المستندات المفتوحة",
    untitled: "بلا عنوان",
    close: "إغلاق {title}",
    unsaved: "تغييرات غير محفوظة",
    newTab: "مستند جديد",
    closeTab: "إغلاق",
    closeOthers: "إغلاق الآخرين",
    closeAll: "إغلاق الكل",
    pin: "تثبيت",
    unpin: "إلغاء التثبيت",
    line: "سطر {n}",
    column: "عمود {n}",
    words: "{n} كلمة",
    characters: "{n} حرف",
    selected: "{n} محددة",
    saved: "تم الحفظ",
    saving: "جارٍ الحفظ",
    dirty: "تغييرات غير محفوظة",
    error: "تعذر الحفظ",
    offline: "دون اتصال، محفوظ على هذا الجهاز",
    retry: "إعادة المحاولة",
    statusBar: "حالة المحرر",
    backlinks: "الروابط الواردة",
    related: "ذات صلة",
    noBacklinks: "لا شيء يشير إلى هنا بعد.",
    noRelated: "لا مستندات ذات صلة.",
    panel: "الروابط والمستندات ذات الصلة",
  },
};

export type EditorChromeLabels = Partial<(typeof STRINGS)["en"]>;

export function useChromeStrings(labels?: () => EditorChromeLabels | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { locale: nq.locale, direction: nq.direction, t };
}

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface EditorLink {
  id: string;
  title: string;
  /** The line that mentions the current document, or a summary for related ones. */
  snippet?: string;
  /** Folder or notebook, shown small. */
  path?: string;
  href?: string;
}
