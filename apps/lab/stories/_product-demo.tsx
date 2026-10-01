/*
 * Demo data for the product page, reviews and Q&A stories. Products come from ./_store-demo.
 * Everything here is illustrative. Money is integer minor units (USD, or SAR in Arabic).
 */
import type { ProductDeliveryConfig, ProductQuestion, ProductReview, ProductSizeGuideData, ProductSpec } from "@nasaq/web";
import { useNasaq } from "@nasaq/web";
import { storeProducts } from "./_store-demo";

export { STORE_CURRENCY } from "./_store-demo";
export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const useAr = () => useNasaq().locale.startsWith("ar");

export const demoProduct = (ar: boolean, id = "tee") => storeProducts(ar ? "ar" : "en").find((p) => p.id === id)!;
export const relatedProducts = (ar: boolean, id = "tee") => storeProducts(ar ? "ar" : "en").filter((p) => p.id !== id).slice(0, 4);

export const breadcrumbs = (ar: boolean, category: string, name: string) => [
  { label: ar ? "المتجر" : "Store", href: "#" },
  { label: category, href: "#" },
  { label: name },
];

export const sizeGuide = (ar: boolean): ProductSizeGuideData => ({
  columns: ar ? ["المقاس", "الصدر (سم)", "الطول (سم)"] : ["Size", "Chest (cm)", "Length (cm)"],
  rows: [
    ["S", "94", "68"],
    ["M", "100", "70"],
    ["L", "106", "72"],
    ["XL", "112", "74"],
  ],
  footer: ar ? "القياسات تقريبية وقد تختلف بمقدار ١ إلى ٢ سم." : "Measurements are approximate and may vary by 1 to 2 cm.",
});

export const delivery = (ar: boolean): ProductDeliveryConfig => ({
  cities: [
    { id: "cairo", label: ar ? "القاهرة" : "Cairo", etaDays: [1, 2], fee: 0 },
    { id: "giza", label: ar ? "الجيزة" : "Giza", etaDays: [1, 3], fee: 4000 },
    { id: "alex", label: ar ? "الإسكندرية" : "Alexandria", etaDays: [2, 4], fee: 6000 },
    { id: "aswan", label: ar ? "أسوان" : "Aswan", etaDays: [4, 7], fee: 9000 },
  ],
  defaultCityId: "cairo",
  skipWeekdays: [5, 6],
  cutoffHour: 14,
  now: "2026-09-30T09:00:00Z",
});

export const specs = (ar: boolean): ProductSpec[] =>
  ar
    ? [
        { label: "الخامة", value: "١٠٠٪ قطن مصري" },
        { label: "الوزن", value: "٢٤٠ جم/م²" },
        { label: "العناية", value: "غسيل بارد، لا تستخدم المجفف" },
        { label: "بلد الصنع", value: "مصر" },
      ]
    : [
        { label: "Material", value: "100% Egyptian cotton" },
        { label: "Weight", value: "240 gsm" },
        { label: "Care", value: "Cold wash, do not tumble dry" },
        { label: "Made in", value: "Egypt" },
      ];

export const shippingInfo = (ar: boolean) =>
  ar
    ? "الشحن مجاني للطلبات فوق ١٠٠٠ ر.س. يمكنك الإرجاع خلال ١٤ يومًا من الاستلام إذا كان المنتج بحالته الأصلية."
    : "Free shipping on orders over $1,000. Return within 14 days of delivery if the item is unused.";

const P = (n: string) => ({ src: `/store/${n}.svg`, alt: "" });

export const reviews = (ar: boolean): ProductReview[] => [
  { id: "r1", author: ar ? "منى أحمد" : "Mona Ahmed", rating: 5, title: ar ? "أفضل تيشيرت اشتريته" : "Best tee I have bought", body: ar ? "الخامة ثقيلة ومريحة والمقاس مضبوط تمامًا. غسلته أكثر من عشر مرات ولم يتغير شكله ولا لونه. أنصح به بشدة لكل من يبحث عن قطعة أساسية تدوم." : "Heavy, comfortable fabric and the fit is spot on. I have washed it more than ten times and it has not changed shape or colour. Highly recommended for anyone who wants a basic that lasts.", date: "2026-09-12T10:00:00Z", verified: true, helpful: 24, fit: "true", variantLabel: ar ? "أسود · M" : "Black · M", photos: [P("tee-black"), P("tee-navy")], reply: { author: ar ? "فريق Nile Basics" : "Nile Basics team", body: ar ? "شكرًا لكِ يا منى، سعدنا بأن القطعة أعجبتك." : "Thank you Mona, we are glad you like it.", date: "2026-09-13T08:00:00Z" } },
  { id: "r2", author: ar ? "كريم سعيد" : "Karim Said", rating: 4, title: ar ? "جيد لكن ضيق قليلًا" : "Good but a little snug", body: ar ? "الجودة ممتازة لكن المقاس أضيق قليلًا من المتوقع، اطلب مقاسًا أكبر." : "Excellent quality but it runs slightly small, order a size up.", date: "2026-09-05T10:00:00Z", verified: true, helpful: 11, fit: "small", variantLabel: ar ? "أبيض · L" : "White · L" },
  { id: "r3", author: ar ? "هدى محمود" : "Hoda Mahmoud", rating: 5, body: ar ? "لون رملي جميل جدًا وتوصيل سريع إلى الإسكندرية." : "Lovely sand colour and fast delivery to Alexandria.", date: "2026-08-28T10:00:00Z", helpful: 6, fit: "true", photos: [P("tee-sand")] },
  { id: "r4", author: ar ? "يوسف علي" : "Youssef Ali", rating: 2, title: ar ? "الخياطة تحتاج تحسينًا" : "Stitching needs work", body: ar ? "القماش جيد لكن وجدت خيطًا مفكوكًا عند الكم بعد الغسلة الأولى. تواصلت مع الدعم وتم استبدال القطعة بسرعة، فالخدمة ممتازة." : "The fabric is good but I found a loose thread at the sleeve after the first wash. Support replaced it quickly, so the service was great.", date: "2026-08-20T10:00:00Z", verified: true, helpful: 3, fit: "large", reply: { author: ar ? "فريق Nile Basics" : "Nile Basics team", body: ar ? "نعتذر عن ذلك، وقد أبلغنا فريق الجودة." : "Sorry about that, we told our quality team.", date: "2026-08-21T08:00:00Z" } },
  { id: "r5", author: ar ? "سلمى حسن" : "Salma Hassan", rating: 5, title: ar ? "هدية رائعة" : "Great gift", body: ar ? "اشتريته هدية لأخي وأعجبه كثيرًا." : "Bought it as a gift for my brother and he loved it.", date: "2026-08-10T10:00:00Z", verified: true, helpful: 2 },
  { id: "r6", author: ar ? "عمر فتحي" : "Omar Fathy", rating: 3, body: ar ? "عادي، توقعت أن يكون أثقل قليلًا حسب الوصف." : "Fine, I expected it to be a bit heavier from the description.", date: "2026-07-30T10:00:00Z", helpful: 1, fit: "true" },
  { id: "r7", author: ar ? "ليلى إبراهيم" : "Layla Ibrahim", rating: 4, body: ar ? "قطعة مريحة وبسعر مناسب." : "Comfortable and fairly priced.", date: "2026-07-14T10:00:00Z", verified: true, helpful: 0 },
];

export const questions = (ar: boolean): ProductQuestion[] => [
  { id: "q1", author: ar ? "أحمد" : "Ahmed", question: ar ? "هل ينكمش القماش بعد الغسيل؟" : "Does the fabric shrink after washing?", date: "2026-09-08T10:00:00Z", votes: 14, answers: [
    { id: "a1", author: "Nile Basics", seller: true, body: ar ? "لا، القماش معالج مسبقًا ضد الانكماش. اغسله بماء بارد للحفاظ على الشكل." : "No, the fabric is pre-shrunk. Wash it cold to keep the shape.", date: "2026-09-09T08:00:00Z", votes: 9 },
    { id: "a2", author: ar ? "منى" : "Mona", body: ar ? "غسلته عدة مرات ولم ينكمش." : "I have washed it several times and it has not shrunk.", date: "2026-09-10T08:00:00Z", votes: 4 },
    { id: "a3", author: ar ? "كريم" : "Karim", body: ar ? "انكمش قليلًا في الطول فقط." : "It shrank a little in length only.", date: "2026-09-11T08:00:00Z", votes: 1 },
  ] },
  { id: "q2", author: ar ? "سارة" : "Sara", question: ar ? "هل يتوفر مقاس XXL؟" : "Is size XXL available?", date: "2026-09-02T10:00:00Z", votes: 6, answers: [
    { id: "a4", author: "Nile Basics", seller: true, body: ar ? "حاليًا حتى XL فقط، وسيتوفر XXL الشهر القادم." : "Up to XL for now. XXL arrives next month.", date: "2026-09-03T08:00:00Z", votes: 5 },
  ] },
  { id: "q3", author: ar ? "خالد" : "Khaled", question: ar ? "هل يصلح للاستخدام الرياضي؟" : "Is it suitable for sports?", date: "2026-08-25T10:00:00Z", votes: 2, answers: [] },
];

/** A big enough review set to page through and to make the histogram interesting. */
export const manyReviews = (ar: boolean): ProductReview[] => {
  const base = reviews(ar);
  const extra: ProductReview[] = Array.from({ length: 14 }, (_, i) => ({
    id: `x${i}`,
    author: ar ? `عميل ${i + 1}` : `Customer ${i + 1}`,
    rating: [5, 5, 4, 5, 3, 4, 5][i % 7]!,
    body: ar ? "منتج جيد بسعر مناسب وتوصيل في الموعد." : "A good product at a fair price, delivered on time.",
    date: `2026-06-${String(28 - i).padStart(2, "0")}T10:00:00Z`,
    verified: i % 2 === 0,
    helpful: i % 5,
  }));
  return [...base, ...extra];
};
