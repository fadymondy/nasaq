import type { Component } from "vue";
import { computed } from "vue";
import { useNasaq } from "../../provider";
import type { CatalogItem, CatalogResult } from "../catalog-store";
import type { PermissionRisk } from "./marketplace-format";

export const STRINGS = {
  en: {
    extensions: "Extensions",
    templates: "Templates",
    view: "Browse",
    featured: "Featured",
    publish: "Publish",
    back: "Back to the store",
    install: "Install",
    overview: "Overview",
    changelog: "Changelog",
    reviews: "Reviews",
    screenshots: "Screenshots",
    permissions: "Permissions",
    permissionsHint: "What this extension can do once installed.",
    noPermissions: "It asks for no permissions.",
    risk: { low: "Low", medium: "Medium", high: "High" } satisfies Record<PermissionRisk, string>,
    links: "Links",
    details: "Details",
    publisher: "Publisher",
    version: "Version",
    updated: "Updated",
    category: "Category",
    compatibility: "Works with",
    size: "Size",
    license: "License",
    tags: "Tags",
    installs: "installs",
    by: (p: string) => `by ${p}`,
    noChangelog: "No release notes yet.",
    noReviews: "No reviews yet.",
    related: "More like this",
    uninstall: "Uninstall",
    uninstalling: "Removing",
    failed: "Something went wrong. Try again.",
    free: "Free",
    /* publish form */
    publishTitle: "Publish an extension",
    publishBody: "Send it for review. Once approved it appears in the store.",
    name: "Name",
    summary: "One-line summary",
    summaryHint: (n: string) => `Up to ${n} characters.`,
    description: "Description",
    categoryLabel: "Category",
    categoryPlaceholder: "Choose a category",
    versionLabel: "Version",
    repository: "Source repository",
    repositoryHint: "A public https link, for review.",
    pricing: "Price",
    pricingFree: "Free",
    pricingPaid: "Paid",
    priceAmount: "Price per month",
    tagsLabel: "Tags",
    tagsPlaceholder: "Add a tag and press Enter",
    permissionsLabel: "Permissions it asks for",
    cancel: "Cancel",
    submit: "Submit for review",
    submitting: "Sending",
    submitted: "Sent for review. We will email you when it is approved.",
    errors: { required: "This is required.", invalid: "Check this value.", tooLong: "This is too long." },
    /* templates */
    templatesSearch: "Templates",
    useTemplate: "Use template",
    using: "Creating",
    uses: "uses",
    noTemplates: "No templates here yet",
    noTemplatesBody: "Pick another category.",
    allTemplates: "All",
    templateCategories: "Template categories",
    preview: "Preview",
  },
  ar: {
    extensions: "الإضافات",
    templates: "القوالب",
    view: "تصفّح",
    featured: "مميّزة",
    publish: "انشر",
    back: "العودة إلى المتجر",
    install: "تثبيت",
    overview: "نظرة عامة",
    changelog: "سجل التغييرات",
    reviews: "التقييمات",
    screenshots: "لقطات الشاشة",
    permissions: "الصلاحيات",
    permissionsHint: "ما تستطيع هذه الإضافة فعله بعد تثبيتها.",
    noPermissions: "لا تطلب أي صلاحيات.",
    risk: { low: "منخفضة", medium: "متوسطة", high: "عالية" } satisfies Record<PermissionRisk, string>,
    links: "الروابط",
    details: "التفاصيل",
    publisher: "الناشر",
    version: "الإصدار",
    updated: "آخر تحديث",
    category: "الفئة",
    compatibility: "يعمل مع",
    size: "الحجم",
    license: "الترخيص",
    tags: "الوسوم",
    installs: "تثبيت",
    by: (p: string) => `من ${p}`,
    noChangelog: "لا ملاحظات إصدار بعد.",
    noReviews: "لا تقييمات بعد.",
    related: "المزيد مثلها",
    uninstall: "إزالة",
    uninstalling: "جارٍ الإزالة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    free: "مجاني",
    publishTitle: "انشر إضافة",
    publishBody: "أرسلها للمراجعة. عند الموافقة تظهر في المتجر.",
    name: "الاسم",
    summary: "ملخص في سطر",
    summaryHint: (n: string) => `حتى ${n} حرفًا.`,
    description: "الوصف",
    categoryLabel: "الفئة",
    categoryPlaceholder: "اختر فئة",
    versionLabel: "الإصدار",
    repository: "مستودع المصدر",
    repositoryHint: "رابط https عام، للمراجعة.",
    pricing: "السعر",
    pricingFree: "مجاني",
    pricingPaid: "مدفوع",
    priceAmount: "السعر شهريًا",
    tagsLabel: "الوسوم",
    tagsPlaceholder: "أضف وسمًا واضغط Enter",
    permissionsLabel: "الصلاحيات التي تطلبها",
    cancel: "إلغاء",
    submit: "أرسل للمراجعة",
    submitting: "جارٍ الإرسال",
    submitted: "أُرسلت للمراجعة. سنراسلك عند الموافقة عليها.",
    errors: { required: "هذا الحقل مطلوب.", invalid: "تحقق من هذه القيمة.", tooLong: "النص أطول من اللازم." },
    templatesSearch: "القوالب",
    useTemplate: "استخدم القالب",
    using: "جارٍ الإنشاء",
    uses: "استخدام",
    noTemplates: "لا قوالب هنا بعد",
    noTemplatesBody: "اختر فئة أخرى.",
    allTemplates: "الكل",
    templateCategories: "فئات القوالب",
    preview: "معاينة",
  },
};
export type MarketplaceLabels = typeof STRINGS.en;

/** Built-in strings for the active locale (Arabic under an Arabic provider) with overrides on top. */
export function useMarketplaceLabels(labels?: () => Partial<MarketplaceLabels> | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as MarketplaceLabels);
  return { t, locale: nq.locale, ar: computed(() => nq.locale.value.startsWith("ar")) };
}

export interface MarketplacePermission {
  id: string;
  label: string;
  description?: string;
  /** Default `low`. */
  risk?: PermissionRisk;
}

export interface MarketplaceRelease {
  version: string;
  date: Date | number | string;
  notes: string[];
}

export interface MarketplaceReview {
  id: string;
  author: string;
  rating: number;
  date: Date | number | string;
  body: string;
}

export interface MarketplaceListing extends CatalogItem {
  /** Shown in the featured strip at the top of the store. */
  featured?: boolean;
  /** Image URLs for the detail page. */
  screenshots?: { src: string; alt: string }[];
  permissions?: MarketplacePermission[];
  changelog?: MarketplaceRelease[];
  reviews?: MarketplaceReview[];
  /** Website, docs, source: `{ label, href }`. */
  links?: { label: string; href: string }[];
  /** "Works with": products or versions. */
  compatibility?: string;
  license?: string;
  /** e.g. "1.2 MB". */
  size?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  summary: string;
  /** Matches a template category id. */
  category: string;
  /** Preview image URL. Without one a tile with `icon` shows. */
  preview?: string;
  previewAlt?: string;
  /** A lucide-vue-next icon. */
  icon?: Component;
  author?: string;
  uses?: number;
  tags?: string[];
}

export type MarketplaceResult = CatalogResult;

export const riskVariant: Record<PermissionRisk, "neutral" | "warning" | "danger"> = { low: "neutral", medium: "warning", high: "danger" };
