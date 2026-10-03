import { computed } from "vue";
import { useNasaq } from "../../provider";

// Strings, types, totals math and print CSS for the invoice view.

export const STRINGS = {
  en: {
    invoice: "Invoice",
    number: "Invoice number",
    issued: "Issued",
    due: "Due",
    currency: "Currency",
    from: "From",
    billTo: "Billed to",
    taxId: "Tax number",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    total: "Total",
    paid: "Paid",
    amountDue: "Amount due",
    payments: "Payments",
    method: "Method",
    date: "Date",
    notes: "Notes",
    terms: "Terms",
    download: "Download PDF",
    print: "Print",
    pay: "Pay now",
    actions: "Invoice actions",
    working: "Preparing",
    downloadFailed: "The file could not be prepared. Try again.",
    draft: "Draft",
    open: "Open",
    paidStatus: "Paid",
    overdue: "Overdue",
    void: "Void",
    refunded: "Refunded",
  },
  ar: {
    invoice: "فاتورة",
    number: "رقم الفاتورة",
    issued: "تاريخ الإصدار",
    due: "تاريخ الاستحقاق",
    currency: "العملة",
    from: "من",
    billTo: "الفاتورة إلى",
    taxId: "الرقم الضريبي",
    description: "الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    amount: "المبلغ",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    paid: "المدفوع",
    amountDue: "المبلغ المستحق",
    payments: "الدفعات",
    method: "الطريقة",
    date: "التاريخ",
    notes: "ملاحظات",
    terms: "الشروط",
    download: "تنزيل PDF",
    print: "طباعة",
    pay: "ادفع الآن",
    actions: "إجراءات الفاتورة",
    working: "جارٍ التجهيز",
    downloadFailed: "تعذّر تجهيز الملف. حاول مرة أخرى.",
    draft: "مسودة",
    open: "مفتوحة",
    paidStatus: "مدفوعة",
    overdue: "متأخرة",
    void: "ملغاة",
    refunded: "مستردة",
  },
};

type Strings = typeof STRINGS.en;
export type InvoiceLabels = Partial<Strings>;

/** Merged strings for the active locale plus `labels`. */
export function useInvoiceStrings(labels?: () => InvoiceLabels | undefined) {
  const nq = useNasaq();
  const t = computed<Strings>(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { t, locale: nq.locale };
}

export type InvoiceStatus = "draft" | "open" | "paid" | "overdue" | "void" | "refunded";

export interface InvoiceParty {
  name: string;
  /** Address lines, one per line. */
  address?: string[];
  email?: string;
  phone?: string;
  /** VAT or tax registration number. Shown left-to-right. */
  taxId?: string;
  /** Your logo as an image URL. Or use the `logo` slot. Never recolour or redraw it. */
  logo?: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  /** A second, quieter line: the period, the plan, the seats. */
  details?: string;
  quantity: number;
  unitPrice: number;
  /** Tax as a fraction of this line: 0.15. Falls back to the invoice's `taxRate`. */
  taxRate?: number;
}

export interface InvoicePayment {
  id: string;
  date: Date | number | string;
  /** "Visa ending 4242", "Bank transfer". Already localised. */
  method: string;
  amount: number;
}

export interface InvoiceData {
  number: string;
  status: InvoiceStatus;
  issueDate: Date | number | string;
  dueDate?: Date | number | string;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  from: InvoiceParty;
  to: InvoiceParty;
  lines: readonly InvoiceLine[];
  /** A fixed amount taken off the subtotal. */
  discount?: number;
  /** Tax as a fraction, for lines without their own rate. */
  taxRate?: number;
  payments?: readonly InvoicePayment[];
  notes?: string;
  terms?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Subtotal, discount, tax, total, paid and balance. The discount is spread over the lines in proportion, so tax
 * is charged on what the customer actually pays.
 */
export function computeInvoice(invoice: Pick<InvoiceData, "lines" | "discount" | "taxRate" | "payments" | "status">): InvoiceTotals {
  const subtotal = round2(invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));
  const discount = Math.min(subtotal, round2(invoice.discount ?? 0));
  const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
  const tax = round2(invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * factor * (l.taxRate ?? invoice.taxRate ?? 0), 0));
  const total = round2(subtotal - discount + tax);
  const paid = round2((invoice.payments ?? []).reduce((sum, p) => sum + p.amount, 0));
  const settled = invoice.status === "void" || invoice.status === "refunded" || invoice.status === "draft";
  return { subtotal, discount, tax, total, paid, due: settled ? 0 : Math.max(0, round2(total - paid)) };
}

/**
 * On paper only the sheet prints: everything else on the page is hidden, the sheet moves to the top of the
 * page, and colours are forced to black on white whatever theme the screen uses.
 */
export const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  body * { visibility: hidden !important; }
  [data-slot="invoice-sheet"], [data-slot="invoice-sheet"] * { visibility: visible !important; }
  [data-slot="invoice-sheet"] {
    position: absolute !important; inset-block-start: 0; inset-inline: 0; width: 100% !important; max-width: none !important;
    margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
    background: white !important; color: black !important; color-scheme: light;
    --foreground: black; --muted-foreground: oklch(0.4 0 0); --border: oklch(0.82 0 0); --card: white; --nq-surface: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  [data-slot="invoice-sheet"] tr, [data-slot="invoice-sheet"] [data-keep-together] { break-inside: avoid; }
  [data-slot="invoice-sheet"] thead { display: table-header-group; }
}
`;
