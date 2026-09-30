"use client";

import { CircleCheck, CircleDot, CircleX, Download, FileClock, Printer, RotateCcw, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime, Num } from "../numeric";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
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

/** Merged strings for the active locale plus `labels`. Shared by the invoice list, which imports it. */
export function useInvoiceStrings(labels?: InvoiceLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

/* ------------------------------------------------------------------ types */

export type InvoiceStatus = "draft" | "open" | "paid" | "overdue" | "void" | "refunded";

export interface InvoiceParty {
  name: string;
  /** Address lines, one per line. */
  address?: string[];
  email?: string;
  phone?: string;
  /** VAT or tax registration number. Shown left-to-right. */
  taxId?: string;
  /** Your logo, as an element. Never recolour or redraw it. */
  logo?: ReactNode;
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
  /** ISO 4217 code. */
  currency: string;
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

/* ------------------------------------------------------------------ status */

const STATUS_VARIANT = { draft: "neutral", open: "info", paid: "success", overdue: "danger", void: "outline", refunded: "warning" } as const;
const STATUS_ICON = { draft: FileClock, open: CircleDot, paid: CircleCheck, overdue: TriangleAlert, void: CircleX, refunded: RotateCcw } as const;

export interface InvoiceStatusBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant" | "children"> {
  status: InvoiceStatus;
  labels?: InvoiceLabels;
}

/** The status as a chip with its own icon, so it never relies on colour alone. */
export function InvoiceStatusBadge({ status, labels, ...props }: InvoiceStatusBadgeProps) {
  const { t } = useInvoiceStrings(labels);
  const Icon = STATUS_ICON[status];
  return (
    <Badge data-slot="invoice-status" data-status={status} variant={STATUS_VARIANT[status]} {...props}>
      <Icon aria-hidden />
      {status === "paid" ? t.paidStatus : t[status]}
    </Badge>
  );
}

/* ------------------------------------------------------------------ print */

/**
 * On paper only the sheet prints: everything else on the page is hidden, the sheet moves to the top of the
 * page, and colours are forced to black on white whatever theme the screen uses.
 */
const PRINT_CSS = `
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

/* ------------------------------------------------------------------ InvoiceView */

export interface InvoiceViewProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  invoice: InvoiceData;
  /**
   * Builds and saves the PDF. Yours: this component only shows the busy state and any error. Omit to hide the
   * button (Print still works: "Save as PDF" is in every browser's print dialog).
   */
  onDownload?: () => Promise<void>;
  /** Replaces `window.print()`. */
  onPrint?: () => void;
  /** Shows "Pay now" while the invoice is open or overdue. */
  onPay?: () => void;
  /** Extra buttons in the action bar, before the built-in ones. */
  actions?: ReactNode;
  /** Hide the whole action bar. Default false. */
  hideActions?: boolean;
  labels?: InvoiceLabels;
}

function Party({ party, label, t }: { party: InvoiceParty; label: string; t: Strings }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-body-sm">
      <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-label text-foreground">{party.name}</p>
      {party.address?.map((line) => (
        <p key={line} className="text-muted-foreground">
          {line}
        </p>
      ))}
      {party.email ? (
        <bdi dir="ltr" className="text-start text-muted-foreground">
          {party.email}
        </bdi>
      ) : null}
      {party.phone ? (
        <bdi dir="ltr" className="text-start text-muted-foreground">
          {party.phone}
        </bdi>
      ) : null}
      {party.taxId ? (
        <p className="text-muted-foreground">
          {t.taxId}: <bdi dir="ltr">{party.taxId}</bdi>
        </p>
      ) : null}
    </div>
  );
}

/**
 * An invoice as a document: parties, dates, line items, totals, payments and notes, with a status chip and an
 * action bar (download, print, pay). Printing produces only the sheet, black on white, with rows kept whole.
 */
export function InvoiceView({ invoice, onDownload, onPrint, onPay, actions, hideActions = false, labels, className, ...props }: InvoiceViewProps) {
  const { t } = useInvoiceStrings(labels);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const money = { style: "currency", currency: invoice.currency } as const;
  const totals = computeInvoice(invoice);
  const payable = (invoice.status === "open" || invoice.status === "overdue") && totals.due > 0;

  const download = async () => {
    if (!onDownload || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDownload();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.downloadFailed);
    } finally {
      setBusy(false);
    }
  };

  const sumRow = (label: string, value: number, strong = false, negative = false) => (
    <div className={cn("flex justify-between gap-6", strong ? "border-t border-border pt-2 text-label text-foreground" : "text-body-sm text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className={cn(!strong && "text-foreground")}>
        <Num value={negative ? -value : value} format={money} />
      </dd>
    </div>
  );

  return (
    <section data-slot="invoice-view" data-status={invoice.status} aria-labelledby={titleId} className={cn("flex flex-col gap-4", className)} {...props}>
      <style>{PRINT_CSS}</style>
      {hideActions ? null : (
        <div role="toolbar" aria-label={t.actions} data-slot="invoice-actions" className="flex flex-wrap items-center justify-end gap-2 print:hidden">
          {error ? (
            <p role="alert" className="me-auto text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          {actions}
          {onDownload ? (
            <Button loading={busy} onClick={() => void download()}>
              <Download aria-hidden />
              {t.download}
            </Button>
          ) : null}
          <Button onClick={() => (onPrint ? onPrint() : window.print())}>
            <Printer aria-hidden />
            {t.print}
          </Button>
          {onPay && payable ? (
            <Button variant="primary" onClick={onPay}>
              {t.pay}
            </Button>
          ) : null}
        </div>
      )}

      <article
        data-slot="invoice-sheet"
        className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-card border border-border bg-card p-6 text-card-foreground @container sm:p-10"
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            {invoice.from.logo ? <div className="h-9 [&_img]:h-full [&_svg]:h-full">{invoice.from.logo}</div> : null}
            <h1 id={titleId} className="text-h1 text-foreground">
              {t.invoice}
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {t.number} <bdi dir="ltr" className="font-mono text-foreground">{invoice.number}</bdi>
            </p>
          </div>
          <InvoiceStatusBadge status={invoice.status} labels={labels} className="h-6 px-2" />
        </header>

        <dl className="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-caption text-muted-foreground">{t.issued}</dt>
            <dd className="text-foreground">
              <DateTime value={invoice.issueDate} />
            </dd>
          </div>
          {invoice.dueDate ? (
            <div>
              <dt className="text-caption text-muted-foreground">{t.due}</dt>
              <dd className={cn("text-foreground", invoice.status === "overdue" && "text-nq-danger-text")}>
                <DateTime value={invoice.dueDate} />
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-caption text-muted-foreground">{t.currency}</dt>
            <dd className="text-foreground">
              <bdi dir="ltr">{invoice.currency}</bdi>
            </dd>
          </div>
        </dl>

        <div className="grid gap-6 sm:grid-cols-2" data-keep-together>
          <Party party={invoice.from} label={t.from} t={t} />
          <Party party={invoice.to} label={t.billTo} t={t} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border text-caption text-muted-foreground">
                <th scope="col" className="pb-2 pe-3 text-start font-medium">
                  {t.description}
                </th>
                <th scope="col" className="px-3 pb-2 text-end font-medium">
                  {t.quantity}
                </th>
                <th scope="col" className="px-3 pb-2 text-end font-medium">
                  {t.unitPrice}
                </th>
                <th scope="col" className="ps-3 pb-2 text-end font-medium">
                  {t.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-border align-top">
                  <td className="py-3 pe-3">
                    <p className="text-foreground">{line.description}</p>
                    {line.details ? <p className="text-caption text-muted-foreground">{line.details}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-end text-foreground">
                    <Num value={line.quantity} />
                  </td>
                  <td className="px-3 py-3 text-end text-foreground">
                    <Num value={line.unitPrice} format={money} />
                  </td>
                  <td className="ps-3 py-3 text-end text-foreground">
                    <Num value={line.quantity * line.unitPrice} format={money} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl data-keep-together className="ms-auto flex w-full max-w-72 flex-col gap-2">
          {sumRow(t.subtotal, totals.subtotal)}
          {totals.discount > 0 ? sumRow(t.discount, totals.discount, false, true) : null}
          {totals.tax > 0 ? sumRow(t.tax, totals.tax) : null}
          {sumRow(t.total, totals.total, true)}
          {totals.paid > 0 ? sumRow(t.paid, totals.paid, false, true) : null}
          {invoice.status !== "draft" ? sumRow(t.amountDue, totals.due, true) : null}
        </dl>

        {invoice.payments?.length ? (
          <section data-keep-together aria-label={t.payments} className="flex flex-col gap-2">
            <h2 className="text-label text-foreground">{t.payments}</h2>
            <table className="w-full border-collapse text-body-sm">
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t.date}</th>
                  <th scope="col">{t.method}</th>
                  <th scope="col">{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="py-2 pe-3 text-muted-foreground">
                      <DateTime value={p.date} />
                    </td>
                    <td className="px-3 py-2 text-foreground">{p.method}</td>
                    <td className="ps-3 py-2 text-end text-foreground">
                      <Num value={p.amount} format={money} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {invoice.notes || invoice.terms ? (
          <footer data-keep-together className="grid gap-4 border-t border-border pt-6 text-body-sm sm:grid-cols-2">
            {invoice.notes ? (
              <div>
                <h2 className="text-label text-foreground">{t.notes}</h2>
                <p className="text-muted-foreground">{invoice.notes}</p>
              </div>
            ) : null}
            {invoice.terms ? (
              <div>
                <h2 className="text-label text-foreground">{t.terms}</h2>
                <p className="text-muted-foreground">{invoice.terms}</p>
              </div>
            ) : null}
          </footer>
        ) : null}
      </article>
    </section>
  );
}
