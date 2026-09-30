"use client";

import { Banknote, CircleAlert, Download, Eye, ReceiptText } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import {
  DataTable,
  type DataTableColumn,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { EmptyState } from "../states";
import { InvoiceStatusBadge, type InvoiceStatus, useInvoiceStrings } from "../invoice-view";
import { DateTime, Num } from "../numeric";
import { StatCard, StatGrid } from "../stat-card";
import { Status } from "../status";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
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

type Strings = typeof STRINGS.en;
export type InvoiceListLabels = Partial<Strings>;

/* ------------------------------------------------------------------ types */

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

const PAYMENT_TONE = { succeeded: "success", pending: "warning", failed: "danger", refunded: "info" } as const;

/** Sums invoice amounts for the summary tiles: open and overdue are outstanding, overdue on its own, and paid. */
export function summarizeInvoices(invoices: readonly InvoiceSummary[]) {
  const sum = (test: (s: InvoiceStatus) => boolean) => invoices.filter((i) => test(i.status)).reduce((total, i) => total + i.amount, 0);
  return {
    outstanding: sum((s) => s === "open" || s === "overdue"),
    overdue: sum((s) => s === "overdue"),
    paid: sum((s) => s === "paid"),
  };
}

/* ------------------------------------------------------------------ InvoiceList */

export interface InvoiceListProps extends Omit<ComponentProps<"div">, "children"> {
  invoices: readonly InvoiceSummary[];
  /** Adds a Payments tab. */
  payments?: readonly PaymentRecord[];
  /** ISO 4217 code for every amount. */
  currency: string;
  /** Opens the invoice. Makes rows clickable and adds "View invoice" to the row menu. */
  onOpen?: (invoice: InvoiceSummary) => void;
  /** Saves the invoice as a file. Adds a download button to every row. Reject to show the error. */
  onDownload?: (invoice: InvoiceSummary) => Promise<void>;
  /** Adds "Pay now" to open and overdue rows. */
  onPay?: (invoice: InvoiceSummary) => void;
  /** Show the outstanding / overdue / paid tiles. Default true. */
  showSummary?: boolean;
  /** Rows per page. Default 8. */
  pageSize?: number;
  loading?: boolean;
  /** Replaces the table with an error state. */
  error?: boolean;
  onRetry?: () => void;
  defaultTab?: "invoices" | "payments";
  labels?: InvoiceListLabels;
}

/**
 * Invoices and payments as filterable tables with a status filter, search, sorting, paging, a download button on
 * every row and three summary tiles. Built on `DataTable` and `StatCard`.
 */
export function InvoiceList({
  invoices,
  payments,
  currency,
  onOpen,
  onDownload,
  onPay,
  showSummary = true,
  pageSize = 8,
  loading,
  error,
  onRetry,
  defaultTab = "invoices",
  labels,
  className,
  ...props
}: InvoiceListProps) {
  const { t: base, ar } = useInvoiceStrings();
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings;
  const money = { style: "currency", currency } as const;
  const [downloading, setDownloading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const summary = summarizeInvoices(invoices);

  const statusLabel = (s: InvoiceStatus) => (s === "paid" ? base.paidStatus : base[s]);
  const download = async (invoice: InvoiceSummary) => {
    if (!onDownload || downloading) return;
    setDownloading(invoice.id);
    setFailed(null);
    try {
      await onDownload(invoice);
    } catch (e) {
      setFailed(e instanceof Error && e.message ? e.message : t.downloadFailed);
    } finally {
      setDownloading(null);
    }
  };

  const columns: DataTableColumn<InvoiceSummary>[] = [
    {
      id: "number",
      header: t.number,
      cell: (r) => (
        <bdi dir="ltr" className="font-mono text-foreground">
          {r.number}
        </bdi>
      ),
      sortValue: (r) => r.number,
      searchValue: (r) => `${r.number} ${r.customer ?? ""}`,
      hideable: false,
    },
    ...(invoices.some((i) => i.customer)
      ? [{ id: "customer", header: t.customer, cell: (r: InvoiceSummary) => r.customer ?? "", sortValue: (r: InvoiceSummary) => r.customer }]
      : []),
    { id: "issued", header: t.issued, cell: (r) => <DateTime value={r.issueDate} />, sortValue: (r) => new Date(r.issueDate) },
    { id: "due", header: t.due, cell: (r) => (r.dueDate ? <DateTime value={r.dueDate} /> : "–"), sortValue: (r) => (r.dueDate ? new Date(r.dueDate) : null) },
    {
      id: "status",
      header: t.status,
      label: t.status,
      cell: (r) => <InvoiceStatusBadge status={r.status} />,
      sortValue: (r) => r.status,
      filterValue: (r) => r.status,
    },
    { id: "amount", header: t.amount, align: "end", cell: (r) => <Num value={r.amount} format={money} />, sortValue: (r) => r.amount },
    ...(onDownload
      ? [
          {
            id: "download",
            header: <span className="sr-only">{t.download}</span>,
            label: t.download,
            hideable: false,
            align: "end" as const,
            cell: (r: InvoiceSummary) => (
              <Button size="icon-sm" variant="ghost" aria-label={t.downloadInvoice(r.number)} loading={downloading === r.id} onClick={() => void download(r)}>
                <Download aria-hidden />
              </Button>
            ),
          },
        ]
      : []),
  ];

  const invoiceTable = useDataTable({ data: invoices as InvoiceSummary[], columns, getRowId: (r) => r.id, pageSize, defaultSort: { id: "issued", direction: "desc" } });

  const paymentColumns: DataTableColumn<PaymentRecord>[] = [
    { id: "date", header: t.date, cell: (r) => <DateTime value={r.date} />, sortValue: (r) => new Date(r.date) },
    {
      id: "invoice",
      header: t.invoiceRef,
      cell: (r) =>
        r.invoiceNumber ? (
          <bdi dir="ltr" className="font-mono">
            {r.invoiceNumber}
          </bdi>
        ) : (
          "–"
        ),
      searchValue: (r) => `${r.invoiceNumber ?? ""} ${r.reference ?? ""} ${r.method}`,
      sortValue: (r) => r.invoiceNumber,
    },
    { id: "method", header: t.method, cell: (r) => r.method, sortValue: (r) => r.method },
    {
      id: "reference",
      header: t.reference,
      defaultHidden: true,
      cell: (r) =>
        r.reference ? (
          <bdi dir="ltr" className="font-mono text-muted-foreground">
            {r.reference}
          </bdi>
        ) : (
          "–"
        ),
    },
    {
      id: "status",
      header: t.status,
      label: t.status,
      cell: (r) => <Status tone={PAYMENT_TONE[r.status]}>{t[r.status]}</Status>,
      sortValue: (r) => r.status,
      filterValue: (r) => r.status,
    },
    { id: "amount", header: t.amount, align: "end", cell: (r) => <Num value={r.amount} format={money} />, sortValue: (r) => r.amount },
  ];
  const paymentTable = useDataTable({ data: (payments ?? []) as PaymentRecord[], columns: paymentColumns, getRowId: (r) => r.id, pageSize, defaultSort: { id: "date", direction: "desc" } });

  const invoiceView = (
    <div className="flex flex-col gap-3">
      <DataTableToolbar>
        <DataTableSearch table={invoiceTable} placeholder={t.search} />
        <DataTableFacetFilter
          table={invoiceTable}
          column="status"
          options={(["open", "overdue", "paid", "draft", "void", "refunded"] as const).map((s) => ({ value: s, label: statusLabel(s) }))}
        />
      </DataTableToolbar>
      {failed ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleAlert aria-hidden className="size-4" />
          {failed}
        </p>
      ) : null}
      <DataTable
        table={invoiceTable}
        label={t.label}
        rowLabel={(r) => r.number}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={onOpen}
        rowActions={(r) => [
          ...(onOpen ? [{ id: "view", label: t.view, icon: Eye, onSelect: () => onOpen(r) }] : []),
          ...(onDownload ? [{ id: "download", label: t.download, icon: Download, onSelect: () => void download(r) }] : []),
          ...(onPay && (r.status === "open" || r.status === "overdue") ? [{ id: "pay", label: t.pay, icon: Banknote, group: "pay", onSelect: () => onPay(r) }] : []),
        ]}
        empty={<EmptyState icon={ReceiptText} title={t.emptyTitle} description={t.emptyDescription} className="border-0" />}
      />
      <DataTablePagination table={invoiceTable} />
    </div>
  );

  const paymentView = (
    <div className="flex flex-col gap-3">
      <DataTableToolbar>
        <DataTableSearch table={paymentTable} placeholder={t.searchPayments} />
        <DataTableFacetFilter
          table={paymentTable}
          column="status"
          options={(["succeeded", "pending", "failed", "refunded"] as const).map((s) => ({ value: s, label: t[s] }))}
        />
      </DataTableToolbar>
      <DataTable
        table={paymentTable}
        label={t.labelPayments}
        rowLabel={(r) => r.invoiceNumber ?? r.reference ?? r.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={<EmptyState icon={Banknote} title={t.emptyPaymentsTitle} description={t.emptyPaymentsDescription} className="border-0" />}
      />
      <DataTablePagination table={paymentTable} />
    </div>
  );

  return (
    <div data-slot="invoice-list" className={cn("flex flex-col gap-6", className)} {...props}>
      {showSummary ? (
        <StatGrid>
          <StatCard label={t.outstanding} value={summary.outstanding} format={money} loading={loading} />
          <StatCard label={t.overdueTotal} value={summary.overdue} format={money} loading={loading} />
          <StatCard label={t.paidTotal} value={summary.paid} format={money} loading={loading} />
        </StatGrid>
      ) : null}
      {payments ? (
        <Tabs defaultValue={defaultTab}>
          <TabsList variant="underline" aria-label={t.tabs}>
            <TabsTab value="invoices">{t.invoices}</TabsTab>
            <TabsTab value="payments">{t.payments}</TabsTab>
            <TabsIndicator />
          </TabsList>
          <TabsPanel value="invoices">{invoiceView}</TabsPanel>
          <TabsPanel value="payments">{paymentView}</TabsPanel>
        </Tabs>
      ) : (
        invoiceView
      )}
    </div>
  );
}
