/*
 * Shared demo data for batch V1: the point-of-sale register, the line-item editor and the accounting and stock
 * ledgers. Deterministic, no network. Names, prices and accounts are invented. Every amount is in minor units (halalas).
 */
import { type AccountingAccount, type AccountingEntry, type LineItemEditorProduct, type PosProduct, type StockMovement, type StockProduct, type StockWarehouse, useNasaq } from "@nasaq/web";
import type { ReactNode } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");

/** Pick English or Arabic text. */
export const t = (ar: boolean, en: string, arText: string) => (ar ? arText : en);

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const CURRENCY = "SAR";
/** Saudi VAT, 15%, in basis points. */
export const VAT_BPS = 1500;

/* ------------------------------------------------------------------------------------------- catalogue */

interface Item {
  id: string;
  en: string;
  ar: string;
  sku: string;
  price: number;
  category: "drinks" | "bakery" | "food" | "retail";
  taxBps?: number;
  stock: number;
  barcode: string;
}

const ITEMS: Item[] = [
  { id: "p-espresso", en: "Espresso", ar: "إسبريسو", sku: "DRK-001", price: 1200, category: "drinks", stock: 120, barcode: "6281000000011" },
  { id: "p-flat", en: "Flat white", ar: "فلات وايت", sku: "DRK-002", price: 1600, category: "drinks", stock: 120, barcode: "6281000000028" },
  { id: "p-capp", en: "Cappuccino", ar: "كابتشينو", sku: "DRK-003", price: 1500, category: "drinks", stock: 120, barcode: "6281000000035" },
  { id: "p-latte", en: "Spanish latte", ar: "سبانش لاتيه", sku: "DRK-004", price: 1750, category: "drinks", stock: 90, barcode: "6281000000042" },
  { id: "p-americano", en: "Iced americano", ar: "أمريكانو مثلج", sku: "DRK-005", price: 1400, category: "drinks", stock: 90, barcode: "6281000000059" },
  { id: "p-water", en: "Water 330ml", ar: "مياه ٣٣٠ مل", sku: "DRK-006", price: 300, category: "drinks", taxBps: 0, stock: 300, barcode: "6281000000066" },
  { id: "p-croissant", en: "Butter croissant", ar: "كرواسون بالزبدة", sku: "BKR-001", price: 1300, category: "bakery", stock: 40, barcode: "6281000000073" },
  { id: "p-maamoul", en: "Date maamoul", ar: "معمول بالتمر", sku: "BKR-002", price: 900, category: "bakery", stock: 60, barcode: "6281000000080" },
  { id: "p-cheesecake", en: "Cheesecake slice", ar: "قطعة تشيز كيك", sku: "BKR-003", price: 2200, category: "bakery", stock: 18, barcode: "6281000000097" },
  { id: "p-sandwich", en: "Chicken sandwich", ar: "ساندويتش دجاج", sku: "FOD-001", price: 2800, category: "food", stock: 25, barcode: "6281000000103" },
  { id: "p-halloumi", en: "Halloumi wrap", ar: "لفافة حلوم", sku: "FOD-002", price: 2400, category: "food", stock: 22, barcode: "6281000000110" },
  { id: "p-beans", en: "Coffee beans 250g", ar: "حبوب قهوة ٢٥٠ جم", sku: "RTL-001", price: 6500, category: "retail", stock: 48, barcode: "6281000000127" },
  { id: "p-tumbler", en: "Steel tumbler", ar: "كوب ستانلس", sku: "RTL-002", price: 8900, category: "retail", stock: 14, barcode: "6281000000134" },
  { id: "p-dripbag", en: "Drip bags x10", ar: "أكياس تقطير ×١٠", sku: "RTL-003", price: 4500, category: "retail", stock: 32, barcode: "6281000000141" },
];

const CATEGORY_LABELS = {
  drinks: { en: "Drinks", ar: "المشروبات" },
  bakery: { en: "Bakery", ar: "المخبوزات" },
  food: { en: "Food", ar: "الأطعمة" },
  retail: { en: "Retail", ar: "المنتجات" },
} as const;

export const posCategories = (ar: boolean) => (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((id) => ({ id, label: CATEGORY_LABELS[id][ar ? "ar" : "en"] }));

export const posProducts = (ar: boolean): PosProduct[] =>
  ITEMS.map((i) => ({ id: i.id, name: ar ? i.ar : i.en, sku: i.sku, barcode: i.barcode, price: i.price, taxBps: i.taxBps ?? VAT_BPS, category: i.category, stock: i.stock }));

export const editorProducts = (ar: boolean): LineItemEditorProduct[] =>
  ITEMS.map((i) => ({ id: i.id, name: ar ? i.ar : i.en, sku: i.sku, price: i.price, taxBps: i.taxBps ?? VAT_BPS, stock: i.stock }));

/* ------------------------------------------------------------------------------------------- accounting */

export const accounts = (ar: boolean): AccountingAccount[] => [
  { id: "1000", code: "1000", name: t(ar, "Assets", "الأصول"), type: "asset" },
  { id: "1100", code: "1100", name: t(ar, "Cash and bank", "النقد والبنوك"), type: "asset", parentId: "1000" },
  { id: "1110", code: "1110", name: t(ar, "Cash drawer", "صندوق الكاشير"), type: "asset", parentId: "1100" },
  { id: "1120", code: "1120", name: t(ar, "Al Rajhi current account", "حساب الراجحي الجاري"), type: "asset", parentId: "1100" },
  { id: "1200", code: "1200", name: t(ar, "Accounts receivable", "الذمم المدينة"), type: "asset", parentId: "1000" },
  { id: "1300", code: "1300", name: t(ar, "Inventory", "المخزون"), type: "asset", parentId: "1000" },
  { id: "2000", code: "2000", name: t(ar, "Liabilities", "الالتزامات"), type: "liability" },
  { id: "2100", code: "2100", name: t(ar, "Accounts payable", "الذمم الدائنة"), type: "liability", parentId: "2000" },
  { id: "2200", code: "2200", name: t(ar, "VAT payable", "ضريبة القيمة المضافة المستحقة"), type: "liability", parentId: "2000" },
  { id: "3000", code: "3000", name: t(ar, "Equity", "حقوق الملكية"), type: "equity" },
  { id: "3100", code: "3100", name: t(ar, "Owner capital", "رأس مال المالك"), type: "equity", parentId: "3000" },
  { id: "4000", code: "4000", name: t(ar, "Revenue", "الإيرادات"), type: "revenue" },
  { id: "4100", code: "4100", name: t(ar, "Café sales", "مبيعات المقهى"), type: "revenue", parentId: "4000" },
  { id: "4200", code: "4200", name: t(ar, "Retail sales", "مبيعات التجزئة"), type: "revenue", parentId: "4000" },
  { id: "5000", code: "5000", name: t(ar, "Expenses", "المصروفات"), type: "expense" },
  { id: "5100", code: "5100", name: t(ar, "Cost of goods sold", "تكلفة البضاعة المباعة"), type: "expense", parentId: "5000" },
  { id: "5200", code: "5200", name: t(ar, "Rent", "الإيجار"), type: "expense", parentId: "5000" },
  { id: "5300", code: "5300", name: t(ar, "Salaries", "الرواتب"), type: "expense", parentId: "5000" },
];

const line = (accountId: string, debit: number, credit: number, memo?: string) => ({ accountId, debit, credit, memo });

export const journalEntries = (ar: boolean): AccountingEntry[] => [
  {
    id: "je-1",
    number: "JE-0001",
    date: "2026-09-01",
    memo: t(ar, "Owner capital injected", "إيداع رأس مال المالك"),
    status: "posted",
    lines: [line("1120", 25000000, 0), line("3100", 0, 25000000)],
  },
  {
    id: "je-2",
    number: "JE-0002",
    date: "2026-09-03",
    memo: t(ar, "Buy coffee beans and cups on credit", "شراء حبوب وأكواب بالآجل"),
    status: "posted",
    lines: [line("1300", 4200000, 0), line("2200", 630000, 0, t(ar, "Input VAT", "ضريبة المدخلات")), line("2100", 0, 4830000)],
  },
  {
    id: "je-3",
    number: "JE-0003",
    date: "2026-09-05",
    memo: t(ar, "September rent", "إيجار سبتمبر"),
    status: "posted",
    lines: [line("5200", 1800000, 0), line("1120", 0, 1800000)],
  },
  {
    id: "je-4",
    number: "JE-0004",
    date: "2026-09-12",
    memo: t(ar, "Week 2 café sales", "مبيعات المقهى، الأسبوع ٢"),
    status: "posted",
    lines: [line("1110", 3450000, 0), line("4100", 0, 3000000), line("2200", 0, 450000, t(ar, "Output VAT 15%", "ضريبة المخرجات ١٥٪"))],
  },
  {
    id: "je-5",
    number: "JE-0005",
    date: "2026-09-15",
    memo: t(ar, "Pay supplier invoice", "سداد فاتورة مورد"),
    status: "posted",
    lines: [line("2100", 2000000, 0), line("1120", 0, 2000000)],
  },
  {
    id: "je-6",
    number: "JE-0006",
    date: "2026-09-19",
    memo: t(ar, "Retail sales on account", "مبيعات تجزئة بالآجل"),
    status: "posted",
    lines: [line("1200", 1150000, 0), line("4200", 0, 1000000), line("2200", 0, 150000)],
  },
  {
    id: "je-7",
    number: "JE-0007",
    date: "2026-09-26",
    memo: t(ar, "Cost of goods sold", "تكلفة البضاعة المباعة"),
    status: "posted",
    lines: [line("5100", 1250000, 0), line("1300", 0, 1250000)],
  },
  {
    id: "je-8",
    number: "JE-0008",
    date: "2026-09-28",
    memo: t(ar, "September salaries", "رواتب سبتمبر"),
    status: "posted",
    lines: [line("5300", 3200000, 0), line("1120", 0, 3200000)],
  },
];

/* ------------------------------------------------------------------------------------------- stock */

export const stockProducts = (ar: boolean): StockProduct[] =>
  ITEMS.filter((i) => i.category === "retail" || i.id === "p-water" || i.id === "p-croissant").map((i) => ({ id: i.id, name: ar ? i.ar : i.en, sku: i.sku, unit: t(ar, "pcs", "قطعة"), reorderPoint: i.category === "retail" ? 12 : 30 }));

export const stockWarehouses = (ar: boolean): StockWarehouse[] => [
  { id: "wh-main", name: t(ar, "Riyadh main warehouse", "المستودع الرئيسي بالرياض"), code: "RUH" },
  { id: "wh-jed", name: t(ar, "Jeddah branch", "فرع جدة"), code: "JED" },
  { id: "wh-shop", name: t(ar, "Olaya shop floor", "صالة العليا"), code: "SHP" },
];

const mv = (n: number, day: number, productId: string, warehouseId: string, type: StockMovement["type"], quantity: number, reference?: string, note?: string): StockMovement => ({
  id: `mv-${n}`,
  date: `2026-09-${String(day).padStart(2, "0")}T${String(8 + (n % 9)).padStart(2, "0")}:${String((n * 7) % 60).padStart(2, "0")}:00`,
  productId,
  warehouseId,
  type,
  quantity,
  reference,
  note,
});

/** Signed quantities: receive and adjust-up are positive, issue and adjust-down negative. */
export const stockMovements = (ar: boolean): StockMovement[] => [
  mv(1, 1, "p-beans", "wh-main", "receive", 120, "PO-2041", t(ar, "Opening delivery", "استلام أولي")),
  mv(2, 1, "p-tumbler", "wh-main", "receive", 40, "PO-2041"),
  mv(3, 1, "p-dripbag", "wh-main", "receive", 80, "PO-2041"),
  mv(4, 2, "p-water", "wh-main", "receive", 600, "PO-2044"),
  mv(5, 3, "p-beans", "wh-jed", "receive", 30, "TR-118", t(ar, "Transfer from Riyadh", "تحويل من الرياض")),
  mv(6, 3, "p-beans", "wh-main", "issue", -30, "TR-118", t(ar, "Transfer to Jeddah", "تحويل إلى جدة")),
  mv(7, 5, "p-beans", "wh-shop", "receive", 24, "TR-121"),
  mv(8, 5, "p-beans", "wh-main", "issue", -24, "TR-121"),
  mv(9, 8, "p-tumbler", "wh-shop", "receive", 12, "TR-122"),
  mv(10, 8, "p-tumbler", "wh-main", "issue", -12, "TR-122"),
  mv(11, 10, "p-beans", "wh-shop", "issue", -9, "POS-8841", t(ar, "Shop sales", "مبيعات المتجر")),
  mv(12, 12, "p-water", "wh-shop", "receive", 240, "TR-125"),
  mv(13, 12, "p-water", "wh-main", "issue", -240, "TR-125"),
  mv(14, 14, "p-dripbag", "wh-main", "issue", -18, "SO-5520", t(ar, "Wholesale order", "طلب جملة")),
  mv(15, 16, "p-tumbler", "wh-shop", "issue", -5, "POS-8902"),
  mv(16, 18, "p-croissant", "wh-shop", "receive", 60, "PO-2050"),
  mv(17, 19, "p-croissant", "wh-shop", "issue", -44, "POS-8950", t(ar, "Daily sales", "مبيعات اليوم")),
  mv(18, 20, "p-croissant", "wh-shop", "adjust", -6, "CNT-0920", t(ar, "Stock count: waste", "جرد: تالف")),
  mv(19, 22, "p-beans", "wh-main", "issue", -34, "SO-5533"),
  mv(20, 23, "p-water", "wh-shop", "issue", -180, "POS-9012"),
  mv(21, 24, "p-tumbler", "wh-jed", "receive", 8, "TR-130"),
  mv(22, 24, "p-tumbler", "wh-main", "issue", -8, "TR-130"),
  mv(23, 25, "p-beans", "wh-jed", "issue", -19, "POS-J-310"),
  mv(24, 27, "p-dripbag", "wh-main", "adjust", 2, "CNT-0927", t(ar, "Stock count: found", "جرد: زيادة")),
  mv(25, 29, "p-water", "wh-main", "receive", 200, "PO-2061"),
];

/* ------------------------------------------------------------------------------------------- page shell */

/** The frame every V1 page story uses: a title, a line of help and the content, full width up to 6xl. */
export function V1Page({ title, description, children, actions }: { title: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title-lg text-foreground">{title}</h1>
            <p className="text-body text-muted-foreground">{description}</p>
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}
