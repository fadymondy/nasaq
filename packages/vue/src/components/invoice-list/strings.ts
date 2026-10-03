import type { InvoiceStatus } from "../invoice-view";

export const STRINGS = {
  en: {
    invoices: "Invoices",
    payments: "Payments",
    tabs: "Billing history",
    number: "Invoice",
    customer: "Customer",
    issued: "Issued",
    due: "Due",
    amount: "Amount",
    status: "Status",
    search: "Search invoices…",
    searchPayments: "Search payments…",
    view: "View invoice",
    download: "Download",
    downloadInvoice: (n: string) => `Download invoice ${n}`,
    pay: "Pay now",
    outstanding: "Outstanding",
    overdueTotal: "Overdue",
    paidTotal: "Paid",
    emptyTitle: "No invoices yet",
    emptyDescription: "Invoices appear here after your first billing date.",
    emptyPaymentsTitle: "No payments yet",
    emptyPaymentsDescription: "Payments appear here once an invoice is paid.",
    date: "Date",
    invoiceRef: "Invoice",
    method: "Method",
    reference: "Reference",
    succeeded: "Succeeded",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    label: "Invoices",
    labelPayments: "Payments",
    downloadFailed: "The invoice could not be downloaded.",
  },
  ar: {
    invoices: "الفواتير",
    payments: "المدفوعات",
    tabs: "سجل الفوترة",
    number: "الفاتورة",
    customer: "العميل",
    issued: "الإصدار",
    due: "الاستحقاق",
    amount: "المبلغ",
    status: "الحالة",
    search: "ابحث في الفواتير…",
    searchPayments: "ابحث في المدفوعات…",
    view: "عرض الفاتورة",
    download: "تنزيل",
    downloadInvoice: (n: string) => `تنزيل الفاتورة ${n}`,
    pay: "ادفع الآن",
    outstanding: "المستحق",
    overdueTotal: "المتأخر",
    paidTotal: "المدفوع",
    emptyTitle: "لا توجد فواتير بعد",
    emptyDescription: "تظهر الفواتير هنا بعد أول موعد فوترة.",
    emptyPaymentsTitle: "لا توجد مدفوعات بعد",
    emptyPaymentsDescription: "تظهر المدفوعات هنا عند سداد أي فاتورة.",
    date: "التاريخ",
    invoiceRef: "الفاتورة",
    method: "الطريقة",
    reference: "المرجع",
    succeeded: "ناجحة",
    pending: "قيد المعالجة",
    failed: "فاشلة",
    refunded: "مستردة",
    label: "الفواتير",
    labelPayments: "المدفوعات",
    downloadFailed: "تعذّر تنزيل الفاتورة.",
  },
};

export type InvoiceListStrings = typeof STRINGS.en;
export type InvoiceListLabels = Partial<InvoiceListStrings>;

export interface InvoiceSummary {
  id: string;
  /** "INV-2026-0042". Shown left-to-right. */
  number: string;
  customer?: string;
  issueDate: Date | number | string;
  dueDate?: Date | number | string;
  amount: number;
  status: InvoiceStatus;
}

export type PaymentStatus = "succeeded" | "pending" | "failed" | "refunded";

export interface PaymentRecord {
  id: string;
  date: Date | number | string;
  amount: number;
  status: PaymentStatus;
  /** "Visa ending 4242". Already localised. */
  method: string;
  /** The invoice this payment settled. */
  invoiceNumber?: string;
  /** Gateway reference. Shown left-to-right. */
  reference?: string;
}

/** Sums invoice amounts for the summary tiles: open and overdue are outstanding, overdue on its own, and paid. */
export function summarizeInvoices(invoices: readonly InvoiceSummary[]) {
  const sum = (test: (s: InvoiceStatus) => boolean) => invoices.filter((i) => test(i.status)).reduce((total, i) => total + i.amount, 0);
  return {
    outstanding: sum((s) => s === "open" || s === "overdue"),
    overdue: sum((s) => s === "overdue"),
    paid: sum((s) => s === "paid"),
  };
}
