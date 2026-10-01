import { ICON_CATALOG, type IconEntry, toKebab } from "./icon-catalog";

export const STRINGS = {
  en: {
    trigger: "Choose icon",
    chosen: (name: string) => `Icon: ${name}`,
    search: "Search icons",
    all: "All",
    recent: "Recent",
    grid: "Icons",
    empty: (q: string) => `No icons match “${q}”.`,
    showMore: (n: string) => `Show ${n} more`,
    results: (n: string) => `${n} icons`,
    clear: "Clear icon",
    categories: {
      general: "General", files: "Files", communication: "Communication", business: "Business", commerce: "Commerce", data: "Data", people: "People",
      dev: "Developer", media: "Media", design: "Design", nature: "Nature", travel: "Travel", health: "Health and food",
    } as Record<string, string>,
  },
  ar: {
    trigger: "اختيار أيقونة",
    chosen: (name: string) => `الأيقونة: ${name}`,
    search: "ابحث عن أيقونة",
    all: "الكل",
    recent: "الأحدث استخدامًا",
    grid: "الأيقونات",
    empty: (q: string) => `لا توجد أيقونات مطابقة لـ «${q}».`,
    showMore: (n: string) => `عرض ${n} أخرى`,
    results: (n: string) => `${n} أيقونة`,
    clear: "إزالة الأيقونة",
    categories: {
      general: "عام", files: "الملفات", communication: "التواصل", business: "الأعمال", commerce: "التجارة", data: "البيانات", people: "الأشخاص",
      dev: "التطوير", media: "الوسائط", design: "التصميم", nature: "الطبيعة", travel: "السفر", health: "الصحة والطعام",
    } as Record<string, string>,
  },
};
export type IconPickerLabels = Omit<typeof STRINGS.en, "categories"> & { categories: Record<string, string> };

export const RECENT_KEY = "nasaq:icon-picker:recent";
export const PAGE = 96;

/** Accepts the stored forms of an icon name: `users`, `Users`, `lucide:users`. Returns the kebab-case name. */
export function normalizeIconName(name: string): string {
  const bare = name.trim().replace(/^lucide:/, "");
  return /[A-Z]/.test(bare) ? toKebab(bare) : bare;
}

/** Finds an icon component by name in the built-in set (or your own). Accepts `users`, `Users` and `lucide:users`. */
export function findIcon(name: string | null | undefined, icons: readonly IconEntry[] = ICON_CATALOG): IconEntry | undefined {
  if (!name) return undefined;
  const key = normalizeIconName(name);
  return icons.find((i) => i.name === key);
}

export const isIconUrl = (name: string) => /^(https?:\/\/|\/|data:image\/)/.test(name);
