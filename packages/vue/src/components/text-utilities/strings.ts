import { computed } from "vue";
import { useNasaq } from "../../provider";

export const STRINGS = {
  en: {
    showTranslation: "Show translation",
    showOriginal: "Show original",
    translating: "Translating",
    translatedFrom: "Translated from {language}",
    originalIn: "Original in {language}",
    translateFailed: "Could not translate this text.",
    retry: "Try again",
    save: "Save",
    saved: "Saved",
    savedAnnounce: "Saved to your bookmarks",
    removedAnnounce: "Removed from your bookmarks",
    saveFailed: "Could not update your bookmarks.",
    showMore: "Show more",
    showLess: "Show less",
    showMoreItems: "Show {count} more",
    left: "{left} left",
    scrollRegion: "Scrollable content",
  },
  ar: {
    showTranslation: "عرض الترجمة",
    showOriginal: "عرض الأصل",
    translating: "جارٍ الترجمة",
    translatedFrom: "مترجم من {language}",
    originalIn: "الأصل بـ{language}",
    translateFailed: "تعذرت ترجمة هذا النص.",
    retry: "حاول مرة أخرى",
    save: "حفظ",
    saved: "محفوظ",
    savedAnnounce: "حُفظ في إشاراتك المرجعية",
    removedAnnounce: "أُزيل من إشاراتك المرجعية",
    saveFailed: "تعذر تحديث إشاراتك المرجعية.",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    showMoreItems: "عرض {count} أخرى",
    left: "متبقٍ {left}",
    scrollRegion: "محتوى قابل للتمرير",
  },
};

export type TextUtilitiesLabels = Partial<(typeof STRINGS)["en"]>;

/** The strings for the current locale, with `labels` laid over them. */
export function useStrings(labels?: () => TextUtilitiesLabels | undefined) {
  const { locale } = useNasaq();
  const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { locale, t };
}

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
