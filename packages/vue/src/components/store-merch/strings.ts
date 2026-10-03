// Strings for the storefront merchandising blocks (English and Arabic), same keys as the React kit.
import { computed } from "vue";
import { useNasaq } from "../../provider";

const STRINGS = {
  en: {
    shopNow: "Shop now",
    shopCategory: "Shop {name}",
    itemsCount: "Items: {n}",
    categories: "Shop by category",
    promotions: "Promotions",
    // flash deals
    flashDeals: "Flash deals",
    endsIn: "Ends in",
    days: "days",
    hours: "hours",
    minutes: "minutes",
    seconds: "seconds",
    dayShort: "d",
    hourShort: "h",
    minuteShort: "m",
    secondShort: "s",
    dealEnded: "This deal has ended",
    timeLeft: "Time left: {time}",
    claimed: "{percent}% claimed",
    almostGone: "Almost gone",
    viewAllDeals: "View all deals",
    // carousel
    relatedProducts: "You may also like",
    recentlyViewed: "Recently viewed",
    carouselOf: "{title} carousel",
    viewAll: "View all",
    // brands
    brands: "Our brands",
    brandLink: "Shop {name}",
  },
  ar: {
    shopNow: "تسوّق الآن",
    shopCategory: "تسوّق {name}",
    itemsCount: "{n} منتجات",
    categories: "تسوّق حسب القسم",
    promotions: "العروض",
    flashDeals: "عروض سريعة",
    endsIn: "ينتهي خلال",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثوانٍ",
    dayShort: "ي",
    hourShort: "س",
    minuteShort: "د",
    secondShort: "ث",
    dealEnded: "انتهى هذا العرض",
    timeLeft: "الوقت المتبقي: {time}",
    claimed: "تم استهلاك {percent}%",
    almostGone: "أوشك على النفاد",
    viewAllDeals: "عرض كل العروض",
    relatedProducts: "قد يعجبك أيضًا",
    recentlyViewed: "شاهدتها مؤخرًا",
    carouselOf: "شريط {title}",
    viewAll: "عرض الكل",
    brands: "علاماتنا التجارية",
    brandLink: "تسوّق {name}",
  },
};

export type MerchLabels = Partial<(typeof STRINGS)["en"]>;

export const merchFill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale for the merchandising blocks. English outside a NasaqProvider. */
export function useMerchStrings(labels: () => MerchLabels | undefined = () => undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as (typeof STRINGS)["en"]);
  return { t, locale: nq.locale };
}
