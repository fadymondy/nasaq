import type { ReadingFontSize, ReadingSpacing, ReadingWidth } from "./appearance-model";

// Same strings as the React appearance pickers (packages/web/src/components/appearance-pickers/appearance-pickers.tsx).
export interface AppearanceLabels {
  theme?: string;
  fontSize?: string;
  smaller?: string;
  larger?: string;
  width?: string;
  spacing?: string;
  reset?: string;
  preview?: string;
  previewTitle?: string;
  previewBody?: string;
  wallpaper?: string;
  none?: string;
  upload?: string;
  dim?: string;
  light?: string;
  dark?: string;
  sizes?: Partial<Record<ReadingFontSize, string>>;
  widths?: Partial<Record<ReadingWidth, string>>;
  spacings?: Partial<Record<ReadingSpacing, string>>;
}

type Strings = Required<Omit<AppearanceLabels, "sizes" | "widths" | "spacings">> & {
  sizes: Record<ReadingFontSize, string>;
  widths: Record<ReadingWidth, string>;
  spacings: Record<ReadingSpacing, string>;
};

export const STRINGS: Record<"en" | "ar", Strings> = {
  en: {
    theme: "Theme",
    fontSize: "Text size",
    smaller: "Smaller text",
    larger: "Larger text",
    width: "Line width",
    spacing: "Line spacing",
    reset: "Reset",
    preview: "Preview",
    previewTitle: "A quiet place to read",
    previewBody: "Good reading settings disappear. The text is large enough, the lines are short enough, and the space between them lets your eyes rest. Change a setting and this paragraph follows at once.",
    wallpaper: "Wallpaper",
    none: "None",
    upload: "Upload a picture",
    dim: "Dim the picture",
    light: "Light",
    dark: "Dark",
    sizes: { sm: "Small", md: "Medium", lg: "Large", xl: "Extra large" },
    widths: { narrow: "Narrow", normal: "Normal", wide: "Wide", full: "Full" },
    spacings: { compact: "Compact", normal: "Normal", relaxed: "Relaxed" },
  },
  ar: {
    theme: "المظهر",
    fontSize: "حجم النص",
    smaller: "نص أصغر",
    larger: "نص أكبر",
    width: "عرض السطر",
    spacing: "تباعد الأسطر",
    reset: "استعادة الافتراضي",
    preview: "معاينة",
    previewTitle: "مكان هادئ للقراءة",
    previewBody: "إعدادات القراءة الجيدة لا تُلاحَظ. النص كبير بما يكفي، والأسطر قصيرة بما يكفي، والمسافة بينها تريح العين. غيّر أي إعداد وستتبعه هذه الفقرة فورًا.",
    wallpaper: "الخلفية",
    none: "بلا خلفية",
    upload: "رفع صورة",
    dim: "تعتيم الصورة",
    light: "فاتح",
    dark: "داكن",
    sizes: { sm: "صغير", md: "متوسط", lg: "كبير", xl: "كبير جدًا" },
    widths: { narrow: "ضيق", normal: "عادي", wide: "واسع", full: "كامل" },
    spacings: { compact: "متقارب", normal: "عادي", relaxed: "مريح" },
  },
};

/** The built-in strings for a locale with the caller's overrides on top. */
export function resolveStrings(locale: string, labels?: AppearanceLabels): Strings {
  const base = STRINGS[locale === "ar" ? "ar" : "en"];
  return {
    ...base,
    ...labels,
    sizes: { ...base.sizes, ...labels?.sizes },
    widths: { ...base.widths, ...labels?.widths },
    spacings: { ...base.spacings, ...labels?.spacings },
  } as Strings;
}

/** Item classes shared by theme cards and wallpaper tiles. */
export const cardItem = [
  "group relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-card border border-border bg-card p-2 text-start outline-none transition-colors",
  "hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-checked:border-primary data-checked:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
];
