import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { CalloutKind } from "../blog-index/blog-model";

export const BLOG_POST_STRINGS = {
  en: {
    back: "All articles",
    onThisPage: "On this page",
    progress: "Reading progress",
    share: "Share",
    shareTitle: "Share this article",
    tags: "Tags",
    aboutAuthor: "About the author",
    related: "Keep reading",
    relatedHint: "More on the same topics.",
    previous: "Older article",
    next: "Newer article",
    comments: "Comments",
    permalink: "Link to this section",
    updated: "Updated",
    callout: { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" },
  },
  ar: {
    back: "كل المقالات",
    onThisPage: "في هذه الصفحة",
    progress: "تقدّم القراءة",
    share: "مشاركة",
    shareTitle: "شارك هذا المقال",
    tags: "الوسوم",
    aboutAuthor: "عن الكاتب",
    related: "واصل القراءة",
    relatedHint: "المزيد في المواضيع نفسها.",
    previous: "مقال أقدم",
    next: "مقال أحدث",
    comments: "التعليقات",
    permalink: "رابط هذا القسم",
    updated: "حُدّث",
    callout: { note: "ملاحظة", tip: "نصيحة", important: "مهم", warning: "تنبيه", caution: "تحذير" },
  },
};

export type BlogPostLabels = Omit<(typeof BLOG_POST_STRINGS)["en"], "callout"> & { callout: Record<CalloutKind, string> };

/** Strings and locale for the blog post components. */
export function useBlogPostStrings(labels?: () => Partial<BlogPostLabels> | undefined): { locale: ComputedRef<string>; t: ComputedRef<BlogPostLabels> } {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => {
    const base = BLOG_POST_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
    const l = labels?.();
    return { ...base, ...l, callout: { ...base.callout, ...l?.callout } } as BlogPostLabels;
  });
  return { locale, t };
}

export const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
