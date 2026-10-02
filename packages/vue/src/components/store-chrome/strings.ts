// Strings for the storefront header, search, announcement bar and footer (English and Arabic), same keys as the React kit.
import { computed } from "vue";
import { useNasaq } from "../../provider";

const STRINGS = {
  en: {
    // announcement bar
    announcements: "Announcements",
    dismiss: "Dismiss announcement",
    previousAnnouncement: "Previous announcement",
    nextAnnouncement: "Next announcement",
    announcementOf: "{n} of {total}",
    // header
    skipToContent: "Skip to content",
    menu: "Menu",
    closeMenu: "Close menu",
    mainNavigation: "Main navigation",
    mobileNavigation: "Mobile navigation",
    cart: "Cart",
    cartWithCount: "Cart, {n}",
    wishlist: "Wishlist",
    wishlistWithCount: "Wishlist, {n}",
    account: "Account",
    viewAll: "View all {name}",
    shopAll: "Shop all",
    // search
    search: "Search",
    searchPlaceholder: "Search products, brands and categories",
    searchLabel: "Search the store",
    clearSearch: "Clear search",
    suggestions: "Search suggestions",
    productsGroup: "Products",
    categoriesGroup: "Categories",
    recentGroup: "Recent searches",
    popularGroup: "Popular searches",
    clearRecent: "Clear",
    searchFor: "Search for “{query}”",
    noSuggestions: "No suggestions for “{query}”. Press Enter to search anyway.",
    suggestionsCount: "{n} suggestions available",
    inCategory: "in {category}",
    // footer
    footer: "Site footer",
    newsletterTitle: "Get offers before anyone else",
    newsletterHint: "One email a week. Unsubscribe any time.",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    subscribe: "Subscribe",
    subscribed: "You are subscribed. Check your inbox to confirm.",
    invalidEmail: "Enter a valid email address.",
    subscribeFailed: "We could not subscribe you. Try again.",
    followUs: "Follow us",
    paymentMethods: "We accept",
    language: "Language",
    currency: "Currency",
    rights: "All rights reserved.",
  },
  ar: {
    announcements: "الإعلانات",
    dismiss: "إخفاء الإعلان",
    previousAnnouncement: "الإعلان السابق",
    nextAnnouncement: "الإعلان التالي",
    announcementOf: "{n} من {total}",
    skipToContent: "انتقل إلى المحتوى",
    menu: "القائمة",
    closeMenu: "إغلاق القائمة",
    mainNavigation: "التنقل الرئيسي",
    mobileNavigation: "التنقل في الجوال",
    cart: "السلة",
    cartWithCount: "السلة، {n} منتجات",
    wishlist: "المفضلة",
    wishlistWithCount: "المفضلة، {n} منتجات",
    account: "حسابي",
    viewAll: "عرض كل {name}",
    shopAll: "تسوّق الكل",
    search: "بحث",
    searchPlaceholder: "ابحث عن منتج أو علامة تجارية أو قسم",
    searchLabel: "البحث في المتجر",
    clearSearch: "مسح البحث",
    suggestions: "اقتراحات البحث",
    productsGroup: "المنتجات",
    categoriesGroup: "الأقسام",
    recentGroup: "عمليات البحث الأخيرة",
    popularGroup: "الأكثر بحثًا",
    clearRecent: "مسح",
    searchFor: "ابحث عن «{query}»",
    noSuggestions: "لا توجد اقتراحات لـ «{query}». اضغط Enter للبحث على أي حال.",
    suggestionsCount: "يوجد {n} اقتراحات",
    inCategory: "في {category}",
    footer: "تذييل الموقع",
    newsletterTitle: "كن أول من يصله العرض",
    newsletterHint: "رسالة واحدة أسبوعيًا، ويمكنك إلغاء الاشتراك في أي وقت.",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    subscribe: "اشترك",
    subscribed: "تم اشتراكك. راجع بريدك لتأكيد الاشتراك.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    subscribeFailed: "تعذّر إتمام الاشتراك. حاول مجددًا.",
    followUs: "تابعنا",
    paymentMethods: "وسائل الدفع",
    language: "اللغة",
    currency: "العملة",
    rights: "جميع الحقوق محفوظة.",
  },
};

export type StoreChromeLabels = Partial<(typeof STRINGS)["en"]>;

export const storeChromeFill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale of the storefront chrome. */
export function useStoreChromeStrings(labels: () => StoreChromeLabels | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as (typeof STRINGS)["en"]);
  return { t, locale: nq.locale };
}
