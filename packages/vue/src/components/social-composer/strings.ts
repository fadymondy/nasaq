// Strings for the social composer and its metrics table (English and Arabic), same keys as the React component.
import { computed } from "vue";
import { useNasaq } from "../../provider";
import type { SocialMediaKind } from "./social-composer-logic";

const STRINGS = {
  en: {
    accounts: "Post to",
    noAccounts: "Connect an account to start posting.",
    text: "Post text",
    textHint: "One text for every target. Each platform counts it its own way, and nothing is cut for you.",
    placeholder: "What do you want to share?",
    addImage: "Add image",
    addVideo: "Add video",
    removeMedia: (name: string) => `Remove ${name}`,
    media: "Media",
    assist: "Improve",
    schedule: "Schedule",
    scheduleHint: "Leave empty to publish right away.",
    date: "Date",
    time: "Time",
    clearSchedule: "Clear schedule",
    publish: "Publish now",
    scheduleAction: "Schedule post",
    saveDraft: "Save draft",
    targets: "Targets",
    pickTargets: "Pick at least one account to see how the post fits.",
    customVersion: "Write a version for this platform",
    useShared: "Use the shared text",
    custom: "Custom",
    chars: (used: string, limit: string) => `${used} of ${limit}`,
    over: (n: string) => `${n} over the limit`,
    left: (n: string) => `${n} left`,
    counter: (name: string) => `${name} character count`,
    problems: {
      empty: "Write some text.",
      over: "Too long for this platform.",
      media: (kind: SocialMediaKind) => (kind === "image" ? "Needs an image." : "Needs a video."),
      hashtags: (max: number) => `No more than ${max} hashtags.`,
    },
    preview: "Preview",
    ready: "Ready to go",
  },
  ar: {
    accounts: "انشر على",
    noAccounts: "اربط حسابًا لتبدأ النشر.",
    text: "نص المنشور",
    textHint: "نص واحد لكل الوجهات. كل منصة تعدّه بطريقتها، ولا يُقصّ منه شيء تلقائيًا.",
    placeholder: "ماذا تريد أن تشارك؟",
    addImage: "إضافة صورة",
    addVideo: "إضافة فيديو",
    removeMedia: (name: string) => `إزالة ${name}`,
    media: "الوسائط",
    assist: "تحسين",
    schedule: "الجدولة",
    scheduleHint: "اتركها فارغة للنشر فورًا.",
    date: "التاريخ",
    time: "الوقت",
    clearSchedule: "مسح الجدولة",
    publish: "انشر الآن",
    scheduleAction: "جدولة المنشور",
    saveDraft: "حفظ مسودة",
    targets: "الوجهات",
    pickTargets: "اختر حسابًا واحدًا على الأقل لترى كيف يتناسب المنشور.",
    customVersion: "اكتب نسخة لهذه المنصة",
    useShared: "استخدم النص المشترك",
    custom: "مخصص",
    chars: (used: string, limit: string) => `${used} من ${limit}`,
    over: (n: string) => `يزيد بمقدار ${n}`,
    left: (n: string) => `متبقٍ ${n}`,
    counter: (name: string) => `عدد أحرف ${name}`,
    problems: {
      empty: "اكتب نصًا.",
      over: "أطول من المسموح في هذه المنصة.",
      media: (kind: SocialMediaKind) => (kind === "image" ? "تحتاج صورة." : "تحتاج فيديو."),
      hashtags: (max: number) => `لا تزيد على ${max} وسمًا.`,
    },
    preview: "معاينة",
    ready: "جاهز للنشر",
  },
} as const;
export type SocialComposerLabels = Partial<(typeof STRINGS)["en"]>;

const METRIC_STRINGS = {
  en: {
    table: "Post metrics",
    platform: "Platform",
    post: "Post",
    status: "Status",
    published: "Published",
    impressions: "Impressions",
    engagements: "Engagements",
    rate: "Engagement rate",
    posts: "Published posts",
    failed: "Failed",
    statuses: { draft: "Draft", queued: "Queued", published: "Published", failed: "Failed" },
    empty: "No posts yet.",
  },
  ar: {
    table: "أداء المنشورات",
    platform: "المنصة",
    post: "المنشور",
    status: "الحالة",
    published: "تاريخ النشر",
    impressions: "مرات الظهور",
    engagements: "التفاعلات",
    rate: "معدل التفاعل",
    posts: "منشورات منشورة",
    failed: "فشلت",
    statuses: { draft: "مسودة", queued: "في الانتظار", published: "منشور", failed: "فشل" },
    empty: "لا منشورات بعد.",
  },
} as const;
export type SocialMetricsTableLabels = Partial<(typeof METRIC_STRINGS)["en"]>;

/** Strings and locale of the composer. */
export function useSocialStrings(locale: () => string | undefined, labels: () => SocialComposerLabels | undefined) {
  const nq = useNasaq();
  const lang = computed(() => locale() ?? nq.locale.value);
  const t = computed(() => ({ ...STRINGS[lang.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as (typeof STRINGS)["en"]);
  return { t, locale: lang };
}

/** Strings and locale of the metrics table. */
export function useSocialMetricStrings(locale: () => string | undefined, labels: () => SocialMetricsTableLabels | undefined) {
  const nq = useNasaq();
  const lang = computed(() => locale() ?? nq.locale.value);
  const t = computed(() => ({ ...METRIC_STRINGS[lang.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as (typeof METRIC_STRINGS)["en"]);
  return { t, locale: lang };
}
