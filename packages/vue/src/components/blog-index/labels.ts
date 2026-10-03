import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { TAG_HUES, type TagHue } from "../badge";

export const BLOG_STRINGS = {
  en: {
    title: "Blog",
    description: "Notes on design systems, product and engineering.",
    search: "Search articles",
    searchPlaceholder: "Search articles…",
    clearSearch: "Clear search",
    categories: "Categories",
    tags: "Tags",
    all: "All",
    allTags: "Any tag",
    featured: "Featured",
    readMore: "Read article",
    minRead: "{n} min read",
    results: "{n} articles",
    resultsOne: "1 article",
    noResults: "No articles match",
    noResultsHint: "Try a different word, or clear the filters.",
    clearFilters: "Clear filters",
    latest: "Latest articles",
    by: "By {name}",
    pagination: "Articles pages",
  },
  ar: {
    title: "المدونة",
    description: "ملاحظات في أنظمة التصميم والمنتج والهندسة.",
    search: "ابحث في المقالات",
    searchPlaceholder: "ابحث في المقالات…",
    clearSearch: "مسح البحث",
    categories: "التصنيفات",
    tags: "الوسوم",
    all: "الكل",
    allTags: "أي وسم",
    featured: "مقال مميز",
    readMore: "اقرأ المقال",
    minRead: "{n} د للقراءة",
    results: "{n} مقالات",
    resultsOne: "مقال واحد",
    noResults: "لا توجد مقالات مطابقة",
    noResultsHint: "جرّب كلمة أخرى، أو امسح عوامل التصفية.",
    clearFilters: "مسح عوامل التصفية",
    latest: "أحدث المقالات",
    by: "بقلم {name}",
    pagination: "صفحات المقالات",
  },
};

export type BlogIndexLabels = (typeof BLOG_STRINGS)["en"];

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale for the blog components. */
export function useBlogStrings(labels?: () => Partial<BlogIndexLabels> | undefined): { locale: ComputedRef<string>; t: ComputedRef<BlogIndexLabels> } {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => ({ ...BLOG_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { locale, t };
}

export function hash(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

/** A stable categorical hue for a string (a category, a slug), so the same category is always the same colour. */
export function hueFor(text: string): TagHue {
  return TAG_HUES[1 + (hash(text) % (TAG_HUES.length - 1))] as TagHue;
}
