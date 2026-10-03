export const SEO_STRINGS = {
  en: {
    title: "SEO preview",
    description: "How this page looks in search results and when it is shared.",
    google: "Google",
    openGraph: "Open Graph",
    x: "X",
    whatsapp: "WhatsApp",
    linkedin: "LinkedIn",
    desktop: "Desktop",
    mobile: "Mobile",
    device: "Device",
    fieldTitle: "Title",
    fieldDescription: "Meta description",
    fieldImage: "Share image URL",
    fieldUrl: "Page URL",
    length: (n: number, max: number) => `${n} of ${max} characters`,
    empty: "Empty",
    short: "Too short",
    good: "Good length",
    long: (n: number) => (n === 1 ? "1 character too long" : `${n} characters too long`),
    lengthOf: (what: string) => `${what} length`,
    noTitle: "Untitled page",
    noDescription: "No description. Search engines will pick text from the page.",
    noImage: "No share image",
    siteFallback: "Your site",
  },
  ar: {
    title: "معاينة SEO",
    description: "كيف تظهر هذه الصفحة في نتائج البحث وعند مشاركتها.",
    google: "Google",
    openGraph: "Open Graph",
    x: "X",
    whatsapp: "WhatsApp",
    linkedin: "LinkedIn",
    desktop: "سطح المكتب",
    mobile: "الجوال",
    device: "الجهاز",
    fieldTitle: "العنوان",
    fieldDescription: "الوصف التعريفي",
    fieldImage: "رابط صورة المشاركة",
    fieldUrl: "رابط الصفحة",
    length: (n: number, max: number) => `${n} من ${max} حرفًا`,
    empty: "فارغ",
    short: "قصير جدًا",
    good: "طول مناسب",
    long: (n: number) => (n === 1 ? "حرف واحد زائد" : `${n} حرفًا زائدًا`),
    lengthOf: (what: string) => `طول ${what}`,
    noTitle: "صفحة بلا عنوان",
    noDescription: "لا وصف. ستختار محركات البحث نصًا من الصفحة.",
    noImage: "لا صورة للمشاركة",
    siteFallback: "موقعك",
  },
};

export type SeoPreviewLabels = typeof SEO_STRINGS.en;
export type SeoPreviewPlatform = "google" | "open-graph" | "x" | "whatsapp" | "linkedin";

export interface SeoMeta {
  title: string;
  description: string;
  /** The full page URL. Shown left-to-right. */
  url: string;
  /** Site name for the result header and share cards. Default: the host. */
  siteName?: string;
  /** Favicon URL. Without one the first letter of the site name is drawn. */
  favicon?: string;
  /** Share image (Open Graph and X card). Without one a placeholder is drawn. */
  image?: string;
  /** Replaces the breadcrumb built from the URL, e.g. ["nasaq.dev", "Blog", "RTL guide"]. */
  breadcrumb?: readonly string[];
}
