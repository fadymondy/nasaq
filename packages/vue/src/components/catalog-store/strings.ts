import type { Component } from "vue";
import { computed } from "vue";
import { useNasaq } from "../../provider";
import type { PricePeriod } from "../price";

export interface CatalogItem {
  id: string;
  name: string;
  summary: string;
  /** Longer text for the detail sheet. Falls back to `summary`. */
  description?: string;
  /** Matches a `CatalogCategory` id. */
  category: string;
  /** A lucide-vue-next icon. Default Package. */
  icon?: Component;
  publisher?: string;
  version?: string;
  /** Adds a badge ("Official", "Preset"). */
  badge?: string;
  installs?: number;
  rating?: number;
  ratingCount?: number;
  /** Omit or 0 for free. */
  price?: { amount: number; currency?: string; period?: PricePeriod };
  tags?: string[];
  installed?: boolean;
  updatedAt?: Date | number | string;
  /** Rows for the detail sheet: `{ label: "Inputs", value: "1 item" }`. */
  details?: { label: string; value: string }[];
}

export interface CatalogCategory {
  id: string;
  label: string;
  icon?: Component;
}

export type CatalogResult = void | { error?: string };

export interface CatalogLabels {
  search: string;
  all: string;
  installed: string;
  categories: string;
  sort: string;
  sortPopular: string;
  sortNewest: string;
  sortName: string;
  results: (n: string) => string;
  emptyTitle: string;
  emptyBody: string;
  clear: string;
  by: (publisher: string) => string;
  installs: string;
  about: string;
  tags: string;
  version: string;
  updated: string;
  uninstall: string;
  uninstalling: string;
  details: string;
  free: string;
  installedNote: string;
}

export const STRINGS: { en: CatalogLabels; ar: CatalogLabels } = {
  en: {
    search: "Search the store",
    all: "All",
    installed: "Installed",
    categories: "Categories",
    sort: "Sort by",
    sortPopular: "Popular",
    sortNewest: "Newest",
    sortName: "A to Z",
    results: (n) => `${n} results`,
    emptyTitle: "Nothing found",
    emptyBody: "Try another word or pick a different category.",
    clear: "Clear filters",
    by: (p) => `by ${p}`,
    installs: "installs",
    about: "About",
    tags: "Tags",
    version: "Version",
    updated: "Updated",
    uninstall: "Uninstall",
    uninstalling: "Removing",
    details: "Details",
    free: "Free",
    installedNote: "Installed in this workspace.",
  },
  ar: {
    search: "ابحث في المتجر",
    all: "الكل",
    installed: "المثبّتة",
    categories: "الفئات",
    sort: "الترتيب",
    sortPopular: "الأشهر",
    sortNewest: "الأحدث",
    sortName: "أبجديًا",
    results: (n) => `${n} نتيجة`,
    emptyTitle: "لا شيء هنا",
    emptyBody: "جرّب كلمة أخرى أو اختر فئة مختلفة.",
    clear: "مسح التصفية",
    by: (p) => `من ${p}`,
    installs: "تثبيت",
    about: "نبذة",
    tags: "الوسوم",
    version: "الإصدار",
    updated: "آخر تحديث",
    uninstall: "إزالة",
    uninstalling: "جارٍ الإزالة",
    details: "التفاصيل",
    free: "مجاني",
    installedNote: "مثبّت في مساحة العمل هذه.",
  },
};

/** Built-in strings for the active locale (Arabic under an Arabic provider) with overrides on top. */
export function useCatalogLabels(labels?: () => Partial<CatalogLabels> | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as CatalogLabels);
  return { t, locale: nq.locale };
}
