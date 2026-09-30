"use client";

import { useOptionalNasaq } from "../../provider/nasaq-provider";

/** English and Arabic copy for the product page pieces. Every entry can be overridden with the `labels` prop. */
export const PDP_STRINGS = {
  en: {
    // gallery
    gallery: "Product images",
    imageOf: (n: string, total: string) => `Image ${n} of ${total}`,
    prevImage: "Previous image",
    nextImage: "Next image",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fullScreen: "View full screen",
    lightbox: "Product images, full screen",
    video: "Video",
    showImage: (n: string) => `Show image ${n}`,
    noImage: "No image available",
    // variants
    selectOption: (name: string) => `Select ${name}`,
    soldOut: "Sold out",
    unavailable: "Unavailable",
    sizeGuide: "Size guide",
    // quantity
    quantity: "Quantity",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    maxReached: (n: string) => `Only ${n} available`,
    // price
    from: "From",
    percentOff: (p: string) => `${p} off`,
    // stock
    inStock: "In stock",
    lowStock: (n: string) => `Only ${n} left in stock`,
    outOfStock: "Out of stock",
    backorder: "Available on backorder",
    // delivery
    deliverTo: "Deliver to",
    city: "City",
    arrives: (range: string) => `Arrives ${range}`,
    deliveryFee: (fee: string) => `Delivery ${fee}`,
    freeDelivery: "Free delivery",
    // actions
    addToCart: "Add to cart",
    adding: "Adding to cart",
    added: "Added to cart",
    buyNow: "Buy now",
    addFailed: "Could not add this to your cart. Try again.",
    pickFirst: (name: string) => `Select ${name} first`,
    addWishlist: "Add to wishlist",
    removeWishlist: "Remove from wishlist",
    share: "Share",
    linkCopied: "Link copied",
    // size guide dialog
    sizeGuideTitle: "Size guide",
    sizeGuideDescription: "Measurements of the finished product.",
    // sections
    description: "Description",
    specs: "Specifications",
    shipping: "Shipping and returns",
    reviews: "Reviews",
    sections: "Product information",
    sku: "SKU",
    brand: "Brand",
    category: "Category",
    // trust
    trustSecure: "Secure payment",
    trustSecureText: "Your payment details are encrypted.",
    trustReturns: "Easy returns",
    trustReturnsText: "Return within 14 days.",
    trustDelivery: "Fast delivery",
    trustDeliveryText: "Tracked shipping across Egypt.",
    trustAuthentic: "Original products",
    trustAuthenticText: "Sold by the brand or its partners.",
    // page
    home: "Home",
    related: "You may also like",
    stickyBar: "Add to cart bar",
  },
  ar: {
    gallery: "صور المنتج",
    imageOf: (n: string, total: string) => `الصورة ${n} من ${total}`,
    prevImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    fullScreen: "عرض بملء الشاشة",
    lightbox: "صور المنتج بملء الشاشة",
    video: "فيديو",
    showImage: (n: string) => `عرض الصورة ${n}`,
    noImage: "لا توجد صورة",
    selectOption: (name: string) => `اختر ${name}`,
    soldOut: "نفد المخزون",
    unavailable: "غير متاح",
    sizeGuide: "دليل المقاسات",
    quantity: "الكمية",
    decrease: "تقليل الكمية",
    increase: "زيادة الكمية",
    maxReached: (n: string) => `المتاح ${n} فقط`,
    from: "ابتداءً من",
    percentOff: (p: string) => `خصم ${p}`,
    inStock: "متوفر",
    lowStock: (n: string) => `باقي ${n} فقط في المخزون`,
    outOfStock: "غير متوفر حاليًا",
    backorder: "متاح بالطلب المسبق",
    deliverTo: "التوصيل إلى",
    city: "المدينة",
    arrives: (range: string) => `يصلك ${range}`,
    deliveryFee: (fee: string) => `رسوم التوصيل ${fee}`,
    freeDelivery: "توصيل مجاني",
    addToCart: "أضف إلى السلة",
    adding: "جارٍ الإضافة إلى السلة",
    added: "تمت الإضافة إلى السلة",
    buyNow: "اشتري الآن",
    addFailed: "تعذّرت الإضافة إلى السلة. حاول مرة أخرى.",
    pickFirst: (name: string) => `اختر ${name} أولًا`,
    addWishlist: "أضف إلى المفضلة",
    removeWishlist: "أزل من المفضلة",
    share: "مشاركة",
    linkCopied: "تم نسخ الرابط",
    sizeGuideTitle: "دليل المقاسات",
    sizeGuideDescription: "قياسات المنتج بعد التصنيع.",
    description: "الوصف",
    specs: "المواصفات",
    shipping: "الشحن والاسترجاع",
    reviews: "التقييمات",
    sections: "معلومات المنتج",
    sku: "رمز المنتج",
    brand: "العلامة التجارية",
    category: "الفئة",
    trustSecure: "دفع آمن",
    trustSecureText: "بيانات الدفع مشفّرة بالكامل.",
    trustReturns: "استرجاع سهل",
    trustReturnsText: "يمكنك الاسترجاع خلال ١٤ يومًا.",
    trustDelivery: "توصيل سريع",
    trustDeliveryText: "شحن مع تتبع داخل مصر.",
    trustAuthentic: "منتجات أصلية",
    trustAuthenticText: "من العلامة نفسها أو شركائها.",
    home: "الرئيسية",
    related: "قد يعجبك أيضًا",
    stickyBar: "شريط الإضافة إلى السلة",
  },
} as const;

type Strings = { [K in keyof typeof PDP_STRINGS.en]: (typeof PDP_STRINGS.en)[K] extends (...a: infer A) => string ? (...a: A) => string : string };
export type ProductDetailLabels = Partial<Strings>;

/** Active-locale strings with overrides, plus the locale and direction. */
export function usePdpStrings(labels?: ProductDetailLabels): { t: Strings; ar: boolean; rtl: boolean; locale: string } {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const rtl = nasaq?.isRtl ?? ar;
  return { t: { ...PDP_STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, rtl, locale };
}
