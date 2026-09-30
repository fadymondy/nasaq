/* Shared demo data for the W4 stories: text utilities, health trackers, brand guidelines. */
import type { BrandFont, BrandOgCard, FlaggedEntry, FoodCatalogueItem, FoodFamily, QuickLogItem } from "@nasaq/web";
import { useNasaq } from "@nasaq/web";

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useAr() {
  return useNasaq().locale.startsWith("ar");
}

export const families: FoodFamily[] = [
  { id: "citrus", name: "Citrus", nameAr: "الحمضيات" },
  { id: "spicy", name: "Spicy", nameAr: "الحار" },
  { id: "fried", name: "Fried", nameAr: "المقليات" },
  { id: "caffeinated", name: "Caffeinated", nameAr: "المحتوي على الكافيين" },
];

export const catalogue: FoodCatalogueItem[] = [
  { id: "f1", kind: "food", name: "Oatmeal", nameAr: "شوفان", verdict: "safe", verdictSource: "clinician", pinned: true, isPublic: true },
  { id: "f2", kind: "food", name: "Banana", nameAr: "موز", verdict: "safe", verdictSource: "catalogue", isPublic: true },
  { id: "f3", kind: "drink", name: "Espresso", nameAr: "إسبريسو", verdict: "trigger", verdictSource: "you", triggerFamilies: ["caffeinated"], note: "Only after breakfast, one shot at most.", pinned: true },
  { id: "f4", kind: "food", name: "Orange", nameAr: "برتقال", verdict: "trigger", verdictSource: "catalogue", triggerFamilies: ["citrus"], isPublic: true },
  { id: "f5", kind: "food", name: "Falafel", nameAr: "فلافل", verdict: "trigger", verdictSource: "you", triggerFamilies: ["fried", "spicy"] },
  { id: "f6", kind: "drink", name: "Water", nameAr: "ماء", verdict: "safe", verdictSource: "clinician", pinned: true, isPublic: true },
  { id: "f7", kind: "food", name: "Dragon fruit", nameAr: "فاكهة التنين", verdict: "unreviewed", verdictSource: "none" },
  { id: "f8", kind: "drink", name: "Karkade", nameAr: "كركديه", verdict: "unreviewed", verdictSource: "none", note: "Ask at the next visit." },
];

export const quickItems: QuickLogItem[] = [
  { id: "q1", name: "Water", nameAr: "ماء" },
  { id: "q2", name: "Espresso", nameAr: "إسبريسو" },
  { id: "q3", name: "Oatmeal", nameAr: "شوفان" },
  { id: "q4", name: "Banana", nameAr: "موز" },
  { id: "q5", name: "Karkade", nameAr: "كركديه" },
  { id: "q6", name: "Orange", nameAr: "برتقال" },
];

export const flagged: FlaggedEntry[] = [
  { id: "g1", at: "2026-09-30T08:10:00", label: "Espresso", reason: "Second caffeine entry before the cut-off.", area: "Caffeine" },
  { id: "g2", at: "2026-09-30T13:25:00", label: "Orange juice", reason: "Citrus family is marked as a trigger.", area: "Reflux" },
];

export const flaggedAr: FlaggedEntry[] = [
  { id: "g1", at: "2026-09-30T08:10:00", label: "إسبريسو", reason: "إدخال ثانٍ للكافيين قبل موعد التوقف.", area: "الكافيين" },
  { id: "g2", at: "2026-09-30T13:25:00", label: "عصير برتقال", reason: "عائلة الحمضيات مصنفة كمحفّز.", area: "الارتجاع" },
];

export const fonts = (ar: boolean): BrandFont[] => [
  { id: "sans", family: "Inter", role: ar ? "العناوين والنص" : "Headings and body", sample: ar ? "أبجد هوز حطي كلمن" : "The quick brown fox", weights: "400, 500, 600", licence: "SIL Open Font Licence", href: "https://rsms.me/inter/" },
  { id: "mono", family: "JetBrains Mono", role: ar ? "الأرقام والشيفرة" : "Numbers and code", kind: "mono", sample: "0123456789", weights: "400, 500", licence: "SIL Open Font Licence", href: "https://www.jetbrains.com/lp/mono/" },
];

export const ogCards = (ar: boolean): BrandOgCard[] => [
  { id: "o1", title: ar ? "نسق: نظام التصميم" : "Nasaq design system", description: ar ? "مكونات تعمل من اليمين إلى اليسار منذ البداية." : "Components that work right to left from the start." },
  { id: "o2", title: ar ? "دليل الهوية" : "Brand guidelines", description: ar ? "الشعار والألوان والاستخدام." : "Logo, colour and usage.", size: [1200, 630] },
];

export const longText =
  "Nasaq ships components that read right to left natively. Visit https://nasaq-ui.fadymondy.com/docs or write to hello@example.com, and see www.example.com/path?q=1. Trailing punctuation stays outside the link.";
export const arabicMixed = "مرحبا بك في نسق، زر https://nasaq-ui.fadymondy.com/docs أو راسلنا على hello@example.com للمزيد.";
