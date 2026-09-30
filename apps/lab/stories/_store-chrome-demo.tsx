/*
 * Demo data for the storefront chrome, merchandising and listing stories (Store Header, Store Merchandising, Store
 * Listing and the Home, Category and Search pages). Products come from ./_store-demo. Category ids equal the products'
 * `category` text, so they are per language. Illustrations are the flat lab-only SVGs in apps/lab/public/store.
 */
import type { ListingCategoryNode, StoreAnnouncement, StoreBanner, StoreBrand, StoreCategoryTile, StoreFlashDeal, StoreFooterColumn, StoreFooterOption, StoreFooterSocial, StoreNavItem } from "@nasaq/web";
import type { CommerceProduct } from "@nasaq/web";
import { StoreAnnouncementBar, StoreFooter, StoreHeader, useNasaq } from "@nasaq/web";
import { type ReactNode, useState } from "react";
import { storeProducts } from "./_store-demo";

export { STORE_CURRENCY, storeProducts } from "./_store-demo";
export const useAr = () => useNasaq().locale.startsWith("ar");

const t = (ar: boolean, en: string, arText: string) => (ar ? arText : en);

export function chromeCategoryTree(ar: boolean): ListingCategoryNode[] {
  return [
    { id: t(ar, "Clothing", "ملابس"), label: t(ar, "Clothing", "ملابس") },
    { id: t(ar, "Shoes", "أحذية"), label: t(ar, "Shoes", "أحذية") },
    {
      id: t(ar, "Home", "المنزل"),
      label: t(ar, "Home", "المنزل"),
    },
    { id: t(ar, "Accessories", "إكسسوارات"), label: t(ar, "Accessories", "إكسسوارات") },
    { id: t(ar, "Electronics", "إلكترونيات"), label: t(ar, "Electronics", "إلكترونيات") },
    { id: t(ar, "Beauty", "جمال"), label: t(ar, "Beauty", "جمال") },
  ];
}

export function chromeNav(ar: boolean): StoreNavItem[] {
  const cat = (en: string, arText: string) => t(ar, en, arText);
  return [
    {
      id: "clothing",
      label: cat("Clothing", "ملابس"),
      href: "#clothing",
      columns: [
        { title: cat("Tops", "القمصان"), links: [{ label: cat("T-shirts", "تيشيرتات"), href: "#tees" }, { label: cat("Hoodies", "هوديز"), href: "#hoodies", badge: cat("New", "جديد") }], viewAll: { label: cat("View all clothing", "عرض كل الملابس"), href: "#clothing" } },
        { title: cat("Headwear", "أغطية الرأس"), links: [{ label: cat("Caps", "قبعات"), href: "#caps" }] },
        { title: cat("Shoes", "أحذية"), links: [{ label: cat("Sneakers", "أحذية رياضية"), href: "#sneakers" }] },
      ],
      featured: { title: cat("Autumn edit", "تشكيلة الخريف"), description: cat("Layers in earthy tones", "طبقات بألوان ترابية"), href: "#autumn", image: "/store/hoodie-green.svg" },
    },
    {
      id: "home",
      label: cat("Home", "المنزل"),
      columns: [
        { title: cat("Kitchen", "المطبخ"), links: [{ label: cat("Mugs", "أكواب"), href: "#mugs" }, { label: cat("Bottles", "زجاجات"), href: "#bottles" }] },
        { title: cat("Living", "المعيشة"), links: [{ label: cat("Lighting", "إضاءة"), href: "#lighting" }, { label: cat("Plants", "نباتات"), href: "#plants" }] },
      ],
      featured: { title: cat("Handmade ceramics", "خزف مصنوع يدويًا"), href: "#ceramics", image: "/store/mug-sand.svg" },
    },
    { id: "accessories", label: cat("Accessories", "إكسسوارات"), href: "#accessories" },
    { id: "electronics", label: cat("Electronics", "إلكترونيات"), href: "#electronics" },
    { id: "sale", label: cat("Sale", "التخفيضات"), href: "#sale", highlight: true },
  ];
}

export function chromeAnnouncements(ar: boolean): StoreAnnouncement[] {
  return [
    { id: "ship", content: t(ar, "Free delivery on orders over EGP 1,000", "شحن مجاني للطلبات فوق ١٬٠٠٠ جنيه"), href: "#shipping" },
    { id: "returns", content: t(ar, "30-day easy returns", "استرجاع سهل خلال ٣٠ يومًا") },
    { id: "app", content: t(ar, "Members get early access to new drops", "الأعضاء يحصلون على وصول مبكر للإصدارات الجديدة"), href: "#members" },
  ];
}

export function chromeFooterColumns(ar: boolean): StoreFooterColumn[] {
  return [
    { title: t(ar, "Shop", "تسوّق"), links: [{ label: t(ar, "New arrivals", "وصل حديثًا"), href: "#new" }, { label: t(ar, "Best sellers", "الأكثر مبيعًا"), href: "#best" }, { label: t(ar, "Sale", "التخفيضات"), href: "#sale" }] },
    { title: t(ar, "Help", "المساعدة"), links: [{ label: t(ar, "Shipping", "الشحن"), href: "#shipping" }, { label: t(ar, "Returns", "الاسترجاع"), href: "#returns" }, { label: t(ar, "Size guide", "دليل المقاسات"), href: "#sizes" }, { label: t(ar, "Contact us", "تواصل معنا"), href: "#contact" }] },
    { title: t(ar, "Company", "الشركة"), links: [{ label: t(ar, "About", "من نحن"), href: "#about" }, { label: t(ar, "Careers", "الوظائف"), href: "#careers" }, { label: t(ar, "Stores", "الفروع"), href: "#stores" }] },
    { title: t(ar, "Legal", "قانوني"), links: [{ label: t(ar, "Privacy", "الخصوصية"), href: "#privacy" }, { label: t(ar, "Terms", "الشروط"), href: "#terms" }] },
  ];
}

export const chromeSocial: StoreFooterSocial[] = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "YouTube", href: "https://youtube.com" },
];

export const chromeLanguages: StoreFooterOption[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];
export const chromeCurrencies: StoreFooterOption[] = [
  { value: "EGP", label: "EGP" },
  { value: "USD", label: "USD" },
];

export function chromePopular(ar: boolean): string[] {
  return ar ? ["هودي", "سماعات", "كوب", "حذاء رياضي"] : ["hoodie", "headphones", "mug", "sneakers"];
}

export function chromeTiles(ar: boolean): StoreCategoryTile[] {
  return [
    { id: "clothing", label: t(ar, "Clothing", "ملابس"), image: "/store/tee-navy.svg", count: 3, href: "#clothing" },
    { id: "shoes", label: t(ar, "Shoes", "أحذية"), image: "/store/sneaker-white.svg", count: 1, href: "#shoes" },
    { id: "home", label: t(ar, "Home", "المنزل"), image: "/store/lamp-sand.svg", count: 4, href: "#home" },
    { id: "accessories", label: t(ar, "Accessories", "إكسسوارات"), image: "/store/watch-black.svg", count: 3, href: "#accessories" },
    { id: "electronics", label: t(ar, "Electronics", "إلكترونيات"), image: "/store/headphones-black.svg", count: 1, href: "#electronics" },
    { id: "beauty", label: t(ar, "Beauty", "جمال"), image: "/store/perfume-sand.svg", count: 1, href: "#beauty" },
  ];
}

export function chromeHero(ar: boolean): StoreBanner[] {
  return [
    { id: "h1", eyebrow: t(ar, "New season", "موسم جديد"), title: t(ar, "Everyday essentials, made to last", "أساسيات يومية تدوم طويلًا"), description: t(ar, "Soft cotton, honest prices and free delivery over EGP 1,000.", "قطن ناعم وأسعار عادلة وشحن مجاني فوق ١٬٠٠٠ جنيه."), cta: t(ar, "Shop the collection", "تسوّق التشكيلة"), href: "#collection", image: "/store/hoodie-navy.svg", tone: "brand" },
    { id: "h2", eyebrow: t(ar, "Home", "المنزل"), title: t(ar, "Small things that warm a room", "تفاصيل صغيرة تدفّئ المكان"), cta: t(ar, "Shop home", "تسوّق المنزل"), href: "#home", image: "/store/lamp-sand.svg", tone: "dark" },
  ];
}

export function chromePromos(ar: boolean): StoreBanner[] {
  return [
    { id: "p1", title: t(ar, "Up to 30% off watches", "خصم حتى ٣٠٪ على الساعات"), cta: t(ar, "Shop watches", "تسوّق الساعات"), href: "#watches", image: "/store/watch-navy.svg", tone: "soft" },
    { id: "p2", eyebrow: t(ar, "Just in", "وصل حديثًا"), title: t(ar, "Wireless headphones", "سماعات لاسلكية"), cta: t(ar, "Discover", "اكتشف"), href: "#audio", image: "/store/headphones-white.svg", tone: "dark" },
  ];
}

export function chromeBrands(): StoreBrand[] {
  return ["Nile Basics", "Delta Run", "Fayoum Clay", "Souk Goods", "Delta Sound", "Khan Scents"].map((name) => ({ id: name, name, href: `#${name.replace(/\s/g, "-").toLowerCase()}` }));
}

/** Three deals ending in a few hours, one nearly sold out. `now` keeps them stable for the render. */
export function chromeDeals(ar: boolean, now: number): StoreFlashDeal[] {
  const list: CommerceProduct[] = storeProducts(ar ? "ar" : "en");
  const pick = ["watch", "sneaker", "headphones", "hoodie"].map((id) => list.find((p) => p.id === id)!).filter(Boolean);
  return pick.map((product, i) => ({ id: `deal-${product.id}`, product, endsAt: now + (3 + i) * 3_600_000 + 25 * 60_000, sold: [82, 34, 61, 12][i]!, total: 100 }));
}

export function chromePayments() {
  return ["Visa", "Mastercard", "Meeza", "Cash on delivery"];
}

/* ------------------------------------------------------------------ page shell */

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Header, content and footer wired the way a shop would: cart count grows as products are added. */
export function StoreShell({ children, query, cartStart = 0, onCart }: { children: (api: { addToCart: () => Promise<void>; cartCount: number }) => ReactNode; query?: string; cartStart?: number; onCart?: () => void }) {
  const ar = useAr();
  const [q, setQ] = useState(query ?? "");
  const [cart, setCart] = useState(cartStart);
  const [lang, setLang] = useState(ar ? "ar" : "en");
  const [currency, setCurrency] = useState("EGP");
  const products = storeProducts(ar ? "ar" : "en");
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <StoreHeader
        brand={ar ? "متجر النيل" : "Nile Store"}
        nav={chromeNav(ar)}
        announcement={<StoreAnnouncementBar items={chromeAnnouncements(ar)} />}
        search={{ products, categoryTree: chromeCategoryTree(ar), currency: "EGP", popular: chromePopular(ar), onSearch: () => undefined, onSelectProduct: () => undefined, onSelectCategory: () => undefined, value: q, onValueChange: setQ }}
        cartCount={cart}
        onCartClick={onCart ?? (() => undefined)}
        wishlistCount={2}
        onWishlistClick={() => undefined}
        onAccountClick={() => undefined}
      />
      <main>{children({ addToCart: async () => { await wait(500); setCart((c) => c + 1); }, cartCount: cart })}</main>
      <StoreFooter
        brand={ar ? "متجر النيل" : "Nile Store"}
        tagline={ar ? "أساسيات يومية بجودة تدوم." : "Everyday essentials, built to last."}
        columns={chromeFooterColumns(ar)}
        onSubscribe={async () => wait(600)}
        payments={chromePayments().map((p) => (
          <span key={p} className="rounded-control border border-border bg-card px-2 py-1 text-caption text-foreground">{p}</span>
        ))}
        social={chromeSocial}
        languages={chromeLanguages}
        language={lang}
        onLanguageChange={setLang}
        currencies={chromeCurrencies}
        currency={currency}
        onCurrencyChange={setCurrency}
        legal={ar ? "© ٢٠٢٦ متجر النيل. جميع الحقوق محفوظة." : "© 2026 Nile Store. All rights reserved."}
      />
    </div>
  );
}
