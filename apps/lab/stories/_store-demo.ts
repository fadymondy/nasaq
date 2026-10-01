/*
 * Shared demo data for the commerce kit stories (storefront + store admin).
 * Images are flat demo illustrations in apps/lab/public/store (lab only, never shipped).
 * Money is integer minor units; components default to USD, or SAR in Arabic.
 */
import type { CommerceAddress, CommerceCartLine, CommerceOrder, CommerceProduct, CommerceShippingMethod, CommerceVariant } from "@nasaq/web";

export type StoreLocale = "en" | "ar";
/** Unset, so every store component shows its default: US dollars, or Saudi riyals in Arabic. */
export const STORE_CURRENCY: string | undefined = undefined;
const img = (name: string, alt: string) => ({ src: `/store/${name}.svg`, alt, width: 800, height: 800 });

type Colour = "black" | "white" | "red" | "blue" | "green" | "sand" | "navy" | "pink";
const COLOUR_NAMES: Record<Colour, [string, string]> = {
  black: ["Black", "أسود"], white: ["White", "أبيض"], red: ["Red", "أحمر"], blue: ["Blue", "أزرق"],
  green: ["Green", "أخضر"], sand: ["Sand", "رملي"], navy: ["Navy", "كحلي"], pink: ["Pink", "وردي"],
};
// Swatch colours come from the Nasaq tag/chart tokens, not raw hex.
const SWATCH: Record<Colour, string> = {
  black: "var(--nq-fg)", white: "var(--nq-bg)", red: "var(--nq-danger)", blue: "var(--nq-info)",
  green: "var(--nq-success)", sand: "var(--nq-warning)", navy: "var(--nq-brand)", pink: "var(--nq-accent, var(--nq-brand))",
};

interface Seed {
  id: string; shape: string; en: string; ar: string; brand: string; category: [string, string];
  colours: Colour[]; sizes?: string[]; price: number; compareAt?: number; rating?: [number, number];
  badge?: [string, string]; soldOut?: string[]; desc: [string, string];
}

const SEEDS: Seed[] = [
  { id: "tee", shape: "tee", en: "Everyday cotton tee", ar: "تيشيرت قطني يومي", brand: "Nile Basics", category: ["Clothing", "ملابس"], colours: ["black", "white", "navy", "sand"], sizes: ["S", "M", "L", "XL"], price: 34900, compareAt: 44900, rating: [4.6, 214], badge: ["Bestseller", "الأكثر مبيعًا"], soldOut: ["white/S", "navy/XL"], desc: ["Heavyweight Egyptian cotton, pre-shrunk, relaxed fit.", "قطن مصري ثقيل، معالج ضد الانكماش، بقصة مريحة."] },
  { id: "hoodie", shape: "hoodie", en: "Fleece hoodie", ar: "هودي فليس", brand: "Nile Basics", category: ["Clothing", "ملابس"], colours: ["navy", "green", "black"], sizes: ["S", "M", "L", "XL"], price: 89900, rating: [4.8, 96], desc: ["Brushed fleece inside, kangaroo pocket, ribbed cuffs.", "فليس ناعم من الداخل، جيب أمامي، وأساور مضلعة."] },
  { id: "sneaker", shape: "sneaker", en: "Runner sneakers", ar: "حذاء رياضي للجري", brand: "Delta Run", category: ["Shoes", "أحذية"], colours: ["white", "black", "red"], sizes: ["40", "41", "42", "43", "44"], price: 149900, compareAt: 179900, rating: [4.4, 58], badge: ["New", "جديد"], soldOut: ["red/40", "red/41", "red/42", "red/43", "red/44"], desc: ["Lightweight mesh upper with a cushioned sole.", "جزء علوي شبكي خفيف ونعل مبطن."] },
  { id: "mug", shape: "mug", en: "Stoneware mug", ar: "كوب فخاري", brand: "Fayoum Clay", category: ["Home", "المنزل"], colours: ["sand", "blue", "green"], price: 19900, rating: [4.9, 402], desc: ["Hand-glazed, 350 ml, dishwasher safe.", "مزجج يدويًا، ٣٥٠ مل، آمن في غسالة الأطباق."] },
  { id: "bag", shape: "bag", en: "Canvas tote bag", ar: "حقيبة قماشية", brand: "Souk Goods", category: ["Accessories", "إكسسوارات"], colours: ["sand", "black", "navy"], price: 29900, rating: [4.3, 77], desc: ["Heavy canvas with an inner zip pocket.", "قماش ثقيل مع جيب داخلي بسحاب."] },
  { id: "watch", shape: "watch", en: "Minimal watch", ar: "ساعة بسيطة", brand: "Delta Time", category: ["Accessories", "إكسسوارات"], colours: ["black", "navy", "sand"], price: 249900, compareAt: 299900, rating: [4.7, 131], badge: ["−16%", "‎−16%"], desc: ["Sapphire glass, 5 ATM, leather strap.", "زجاج سافير، مقاومة للماء ٥ ضغط جوي، سوار جلد."] },
  { id: "bottle", shape: "bottle", en: "Insulated bottle", ar: "زجاجة معزولة", brand: "Souk Goods", category: ["Home", "المنزل"], colours: ["green", "blue", "pink", "black"], price: 39900, rating: [4.5, 188], desc: ["Keeps drinks cold 24 h or hot 12 h. 750 ml.", "تحافظ على البرودة ٢٤ ساعة والسخونة ١٢ ساعة. ٧٥٠ مل."] },
  { id: "lamp", shape: "lamp", en: "Desk lamp", ar: "مصباح مكتب", brand: "Fayoum Clay", category: ["Home", "المنزل"], colours: ["sand", "white"], price: 119900, rating: [4.2, 23], desc: ["Warm dimmable LED, linen shade.", "إضاءة LED دافئة قابلة للتعتيم، غطاء كتان."] },
  { id: "headphones", shape: "headphones", en: "Wireless headphones", ar: "سماعات لاسلكية", brand: "Delta Sound", category: ["Electronics", "إلكترونيات"], colours: ["black", "white", "navy"], price: 329900, compareAt: 389900, rating: [4.6, 342], badge: ["Deal", "عرض"], desc: ["Active noise cancelling, 40 h battery.", "عزل نشط للضوضاء، بطارية ٤٠ ساعة."] },
  { id: "plant", shape: "plant", en: "Potted snake plant", ar: "نبات الثعبان في أصيص", brand: "Green Nile", category: ["Home", "المنزل"], colours: ["green"], price: 24900, rating: [4.8, 65], desc: ["Low light, low water, terracotta pot.", "إضاءة قليلة، ري قليل، أصيص فخار."] },
  { id: "perfume", shape: "perfume", en: "Oud eau de parfum", ar: "عطر عود", brand: "Khan Scents", category: ["Beauty", "جمال"], colours: ["sand", "pink"], sizes: ["50 ml", "100 ml"], price: 189900, rating: [4.7, 49], desc: ["Oud, amber and rose. Long lasting.", "عود وعنبر وورد. ثبات طويل."] },
  { id: "cap", shape: "cap", en: "Baseball cap", ar: "قبعة بيسبول", brand: "Nile Basics", category: ["Accessories", "إكسسوارات"], colours: ["navy", "black", "red", "sand"], price: 24900, rating: [4.1, 31], soldOut: ["red"], desc: ["Adjustable strap, embroidered logo.", "حزام قابل للتعديل وشعار مطرز."] },
];

export function storeProducts(locale: StoreLocale = "en"): CommerceProduct[] {
  const i = locale === "ar" ? 1 : 0;
  return SEEDS.map((s): CommerceProduct => {
    const options: CommerceProduct["options"] = [
      { id: "colour", name: i ? "اللون" : "Colour", display: "swatch", values: s.colours.map((c) => ({ id: c, label: COLOUR_NAMES[c][i]!, color: SWATCH[c], image: `/store/${s.shape}-${c}.svg` })) },
    ];
    if (s.sizes) options.push({ id: "size", name: i ? "المقاس" : "Size", display: "button", values: s.sizes.map((z) => ({ id: z, label: z })) });
    const combos = s.sizes ? s.colours.flatMap((c) => s.sizes!.map((z) => [c, z] as const)) : s.colours.map((c) => [c, undefined] as const);
    const variants = combos.map(([c, z], n): CommerceVariant => {
      const key = z ? `${c}/${z}` : c;
      const out = s.soldOut?.includes(key);
      const bump = z === "100 ml" ? 80000 : z === "XL" ? 2000 : 0;
      return {
        id: `${s.id}-${key.replace(/[\s/]+/g, "-").toLowerCase()}`,
        sku: `${s.id.toUpperCase()}-${c.slice(0, 3).toUpperCase()}${z ? `-${z.replace(/\s/g, "")}` : ""}`,
        options: (z ? { colour: c, size: z } : { colour: c }) as Record<string, string>,
        price: s.price + bump,
        ...(s.compareAt ? { compareAt: s.compareAt + bump } : {}),
        stock: out ? 0 : 2 + ((n * 7) % 23),
        image: `/store/${s.shape}-${c}.svg`,
      };
    });
    return {
      id: s.id, slug: s.id, name: i ? s.ar : s.en, brand: s.brand, category: s.category[i], description: s.desc[i],
      images: s.colours.map((c) => img(`${s.shape}-${c}`, `${i ? s.ar : s.en} – ${COLOUR_NAMES[c][i]!}`)),
      options, variants,
      ...(s.rating ? { rating: { average: s.rating[0], count: s.rating[1] } } : {}),
      ...(s.badge ? { badges: [s.badge[i]] } : {}),
      status: "active",
    };
  });
}

export function storeCart(locale: StoreLocale = "en"): CommerceCartLine[] {
  const p = storeProducts(locale);
  const line = (prod: CommerceProduct, vi: number, qty: number, extra: Partial<CommerceCartLine> = {}): CommerceCartLine => {
    const v = prod.variants[vi]!;
    const label = prod.options.map((o) => o.values.find((x) => x.id === v.options[o.id])?.label).filter(Boolean).join(" · ");
    return { id: `line-${v.id}`, productId: prod.id, variantId: v.id, name: prod.name, variantLabel: label, unitPrice: v.price, quantity: qty, ...(v.image ? { image: v.image } : {}), ...(v.compareAt ? { compareAt: v.compareAt } : {}), ...(v.stock !== undefined ? { maxQuantity: v.stock } : {}), ...extra };
  };
  return [line(p[0]!, 1, 2), line(p[3]!, 0, 1), line(p[8]!, 0, 1), line(p[6]!, 2, 1, { savedForLater: true })];
}

export function storeShippingMethods(locale: StoreLocale = "en"): CommerceShippingMethod[] {
  const i = locale === "ar";
  return [
    { id: "standard", label: i ? "شحن عادي" : "Standard delivery", price: 6000, freeOver: 150000, etaDays: [3, 5], kind: "delivery" },
    { id: "express", label: i ? "شحن سريع" : "Express delivery", price: 12000, etaDays: [1, 2], kind: "express" },
    { id: "pickup", label: i ? "استلام من الفرع" : "Pick up in store", price: 0, etaDays: [0, 1], kind: "pickup" },
  ];
}

export function storeAddresses(locale: StoreLocale = "en"): CommerceAddress[] {
  const i = locale === "ar";
  return [
    { id: "home", name: i ? "سارة أحمد" : "Sara Ahmed", phone: "+20 100 123 4567", line1: i ? "١٢ شارع النخيل" : "12 Palm Street", line2: i ? "الدور ٣، شقة ٨" : "Floor 3, Apt 8", city: i ? "القاهرة" : "Cairo", region: i ? "مدينة نصر" : "Nasr City", postalCode: "11765", country: "EG", isDefault: true },
    { id: "work", name: i ? "سارة أحمد" : "Sara Ahmed", phone: "+20 100 123 4567", line1: i ? "٤٥ شارع التحرير" : "45 Tahrir Street", city: i ? "الجيزة" : "Giza", region: i ? "الدقي" : "Dokki", postalCode: "12611", country: "EG" },
  ];
}

const STATUSES: CommerceOrder["status"][] = ["delivered", "shipped", "processing", "paid", "pending", "cancelled", "refunded", "out-for-delivery", "partially-fulfilled", "delivered"];
const CUSTOMERS = [["Sara Ahmed", "سارة أحمد"], ["Omar Nasser", "عمر ناصر"], ["Mona Adel", "منى عادل"], ["Youssef Kamal", "يوسف كمال"], ["Laila Hassan", "ليلى حسن"]];

export function storeOrders(locale: StoreLocale = "en"): CommerceOrder[] {
  const i = locale === "ar" ? 1 : 0;
  const products = storeProducts(locale);
  const ship = storeShippingMethods(locale)[0]!;
  const addr = storeAddresses(locale)[0]!;
  return STATUSES.map((status, n): CommerceOrder => {
    const a = products[n % products.length]!;
    const b = products[(n + 4) % products.length]!;
    const lines = [a, b].slice(0, n % 3 === 0 ? 1 : 2).map((p, k) => {
      const v = p.variants[(n + k) % p.variants.length]!;
      return { id: `o${n}-l${k}`, productId: p.id, variantId: v.id, name: p.name, unitPrice: v.price, quantity: 1 + ((n + k) % 2), ...(v.image ? { image: v.image } : {}), ...(status === "partially-fulfilled" && k === 0 ? { fulfilled: 1 } : {}) };
    });
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const shipping = subtotal >= (ship.freeOver ?? Infinity) ? 0 : ship.price;
    const day = String(28 - n * 2).padStart(2, "0");
    return {
      id: `ord-${1040 + n}`, number: `#${1040 + n}`, placedAt: `2026-09-${day}T1${n % 10}:2${n % 6}:00Z`, status,
      payment: status === "pending" ? "pending" : status === "refunded" ? "refunded" : n === 4 ? "cod" : "paid",
      customer: { name: CUSTOMERS[n % CUSTOMERS.length]![i]!, email: `customer${n}@example.com`, phone: "+20 100 000 00" + String(10 + n) },
      lines, shippingAddress: addr, billingAddress: addr, shippingMethod: ship,
      totals: { subtotal, discount: 0, shipping, tax: 0, total: subtotal + shipping, itemCount: lines.reduce((s, l) => s + l.quantity, 0), savings: 0 },
      ...(["shipped", "out-for-delivery", "delivered"].includes(status) ? { tracking: { carrier: "Bosta", number: `BST${880120 + n}` } } : {}),
      events: [
        { at: `2026-09-${day}T10:00:00Z`, kind: "placed", label: i ? "تم إنشاء الطلب" : "Order placed" },
        ...(status !== "pending" ? [{ at: `2026-09-${day}T10:01:00Z`, kind: "paid", label: i ? "تم الدفع" : "Payment captured" }] : []),
      ],
    };
  });
}
