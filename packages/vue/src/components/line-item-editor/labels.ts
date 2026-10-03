import { computed } from "vue";
import { useNasaq } from "../../provider";

export const LINE_ITEM_STRINGS = {
  en: {
    item: "Item",
    itemPlaceholder: "Search products or type a name",
    quantity: "Qty",
    unitPrice: "Unit price",
    discount: "Disc.",
    tax: "Tax",
    total: "Total",
    addProduct: "Add product",
    addFree: "Add free line",
    remove: "Remove line",
    duplicate: "Duplicate line",
    moveUp: "Move up",
    moveDown: "Move down",
    lineActions: "Line actions",
    line: "Line",
    increase: "Increase quantity",
    decrease: "Decrease quantity",
    noMatch: "No matching product. The text becomes a free line.",
    open: "Open list",
    clear: "Clear",
    nameRequired: "Name the item or pick a product.",
    freeLine: "Free line",
    empty: "No lines yet",
    emptyText: "Pick a product to fill its name, price and tax, or add a free line.",
    lines: "Lines",
    subtotal: "Subtotal",
    discountRow: "Discounts",
    orderDiscount: "Order discount",
    percent: "Percent",
    amount: "Amount",
    taxRow: "Tax",
    taxIncluded: "Tax included",
    taxRate: "Tax rate",
    exempt: "No tax",
    totalDue: "Total",
    totals: "Totals",
    inStock: "in stock",
  },
  ar: {
    item: "الصنف",
    itemPlaceholder: "ابحث عن منتج أو اكتب اسمًا",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    addProduct: "إضافة منتج",
    addFree: "إضافة بند حر",
    remove: "حذف البند",
    duplicate: "تكرار البند",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    lineActions: "إجراءات البند",
    line: "البند",
    increase: "زيادة الكمية",
    decrease: "تقليل الكمية",
    noMatch: "لا يوجد منتج مطابق. سيصبح النص بندًا حرًا.",
    open: "فتح القائمة",
    clear: "مسح",
    nameRequired: "اكتب اسم الصنف أو اختر منتجًا.",
    freeLine: "بند حر",
    empty: "لا توجد بنود بعد",
    emptyText: "اختر منتجًا ليملأ الاسم والسعر والضريبة، أو أضف بندًا حرًا.",
    lines: "البنود",
    subtotal: "المجموع الفرعي",
    discountRow: "الخصومات",
    orderDiscount: "خصم على الطلب",
    percent: "نسبة",
    amount: "مبلغ",
    taxRow: "الضريبة",
    taxIncluded: "شامل الضريبة",
    taxRate: "نسبة الضريبة",
    exempt: "بدون ضريبة",
    totalDue: "الإجمالي",
    totals: "الإجماليات",
    inStock: "في المخزون",
  },
} as const;

export type LineItemEditorStrings = { [K in keyof (typeof LINE_ITEM_STRINGS)["en"]]: string };
export type LineItemEditorLabels = Partial<LineItemEditorStrings>;

export interface LineItemEditorProduct {
  id: string;
  name: string;
  sku?: string;
  /** Price of one unit in minor units. */
  price: number;
  /** Tax rate in basis points (1500 is 15%). */
  taxBps?: number;
  /** Units in stock. Shown as a hint, never enforced. */
  stock?: number;
  /** "kg", "box"... Shown next to the stock hint. */
  unit?: string;
}

export interface LineItemEditorLine {
  id: string;
  /** The product this line was filled from, or empty for a free line. */
  productId?: string | null;
  name: string;
  /** Up to three decimals. */
  quantity: number;
  /** Minor units. */
  unitPrice: number;
  /** Line discount in basis points, 0 to 10000. */
  discountBps?: number;
  /** Tax rate in basis points. Falls back to `defaultTaxBps`. */
  taxBps?: number;
}

/** Merged strings for the active locale plus `labels`. */
export function useLineItemEditorStrings(labels?: () => LineItemEditorLabels | undefined) {
  const nq = useNasaq();
  return computed(() => ({ ...LINE_ITEM_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as LineItemEditorStrings);
}
