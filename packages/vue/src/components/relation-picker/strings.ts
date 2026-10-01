import type { RelationOption } from "./types";

// Same strings as the React component (packages/web/src/components/relation-picker).
export const STRINGS = {
  en: {
    placeholder: "Search…",
    searching: "Searching…",
    empty: "No results",
    hint: "Type to search",
    error: "Could not load results.",
    retry: "Try again",
    create: (q: string) => `Create “${q}”`,
    creating: "Creating…",
    createFailed: "Could not create it.",
    clear: "Clear",
    open: "Open list",
    remove: "Remove",
  },
  ar: {
    placeholder: "ابحث…",
    searching: "جارٍ البحث…",
    empty: "لا توجد نتائج",
    hint: "اكتب للبحث",
    error: "تعذر تحميل النتائج.",
    retry: "حاول مرة أخرى",
    create: (q: string) => `إنشاء «${q}»`,
    creating: "جارٍ الإنشاء…",
    createFailed: "تعذر الإنشاء.",
    clear: "مسح",
    open: "فتح القائمة",
    remove: "إزالة",
  },
};
export type RelationPickerLabels = Partial<(typeof STRINGS)["en"]>;

/** The name to show: the Arabic one in Arabic, else the English, whichever exists. */
export const optionText = (option: RelationOption, ar: boolean): string => (ar ? option.labelAr || option.label : option.label || option.labelAr) ?? "";
