<script setup lang="ts">
import { Banknote, CircleAlert, Download, Eye, ReceiptText } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import {
  NqDataTable,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableColumn,
} from "../data-table";
import { NqInvoiceStatusBadge, useInvoiceStrings, type InvoiceStatus } from "../invoice-view";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { STRINGS, summarizeInvoices, type InvoiceListLabels, type InvoiceListStrings, type InvoiceSummary, type PaymentRecord } from "./strings";

// Invoices and payments as filterable tables with a status filter, search, sorting, paging, a download button on
// every row and three summary tiles. Built on NqDataTable and NqStatCard.
const props = withDefaults(
  defineProps<{
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
    class?: HTMLAttributes["class"];
  }>(),
  { showSummary: true, pageSize: 8, defaultTab: "invoices" },
);

const PAYMENT_TONE = { succeeded: "success", pending: "warning", failed: "danger", refunded: "info" } as const;

const { t: base, locale } = useInvoiceStrings();
const t = computed<InvoiceListStrings>(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const money = computed(() => ({ style: "currency", currency: props.currency }) as const);
const downloading = ref<string | null>(null);
const failed = ref<string | null>(null);
const summary = computed(() => summarizeInvoices(props.invoices));

const statusLabel = (s: InvoiceStatus) => (s === "paid" ? base.value.paidStatus : base.value[s]);
async function download(invoice: InvoiceSummary) {
  if (!props.onDownload || downloading.value) return;
  downloading.value = invoice.id;
  failed.value = null;
  try {
    await props.onDownload(invoice);
  } catch (e) {
    failed.value = e instanceof Error && e.message ? e.message : t.value.downloadFailed;
  } finally {
    downloading.value = null;
  }
}

const columns = computed<DataTableColumn<InvoiceSummary>[]>(() => [
  {
    id: "number",
    header: t.value.number,
    cell: (r) => h("bdi", { dir: "ltr", class: "font-mono text-foreground" }, r.number),
    sortValue: (r) => r.number,
    searchValue: (r) => `${r.number} ${r.customer ?? ""}`,
    hideable: false,
  },
  ...(props.invoices.some((i) => i.customer)
    ? [{ id: "customer", header: t.value.customer, cell: (r: InvoiceSummary) => r.customer ?? "", sortValue: (r: InvoiceSummary) => r.customer }]
    : []),
  { id: "issued", header: t.value.issued, cell: (r) => h(NqDateTime, { value: r.issueDate }), sortValue: (r) => new Date(r.issueDate) },
  { id: "due", header: t.value.due, cell: (r) => (r.dueDate ? h(NqDateTime, { value: r.dueDate }) : "–"), sortValue: (r) => (r.dueDate ? new Date(r.dueDate) : null) },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    cell: (r) => h(NqInvoiceStatusBadge, { status: r.status }),
    sortValue: (r) => r.status,
    filterValue: (r) => r.status,
  },
  { id: "amount", header: t.value.amount, align: "end", cell: (r) => h(NqNum, { value: r.amount, format: money.value }), sortValue: (r) => r.amount },
  ...(props.onDownload
    ? [
        {
          id: "download",
          header: () => h("span", { class: "sr-only" }, t.value.download),
          label: t.value.download,
          hideable: false,
          align: "end" as const,
          cell: (r: InvoiceSummary) =>
            h(
              NqButton,
              { size: "icon-sm", variant: "ghost", "aria-label": t.value.downloadInvoice(r.number), loading: downloading.value === r.id, onClick: () => void download(r) },
              () => h(Download, { "aria-hidden": "true" }),
            ),
        },
      ]
    : []),
]);

const invoiceTable = useDataTable({
  data: () => props.invoices as InvoiceSummary[],
  columns: () => columns.value,
  getRowId: (r) => r.id,
  pageSize: props.pageSize,
  defaultSort: { id: "issued", direction: "desc" },
});

const paymentColumns = computed<DataTableColumn<PaymentRecord>[]>(() => [
  { id: "date", header: t.value.date, cell: (r) => h(NqDateTime, { value: r.date }), sortValue: (r) => new Date(r.date) },
  {
    id: "invoice",
    header: t.value.invoiceRef,
    cell: (r) => (r.invoiceNumber ? h("bdi", { dir: "ltr", class: "font-mono" }, r.invoiceNumber) : "–"),
    searchValue: (r) => `${r.invoiceNumber ?? ""} ${r.reference ?? ""} ${r.method}`,
    sortValue: (r) => r.invoiceNumber,
  },
  { id: "method", header: t.value.method, cell: (r) => r.method, sortValue: (r) => r.method },
  {
    id: "reference",
    header: t.value.reference,
    defaultHidden: true,
    cell: (r) => (r.reference ? h("bdi", { dir: "ltr", class: "font-mono text-muted-foreground" }, r.reference) : "–"),
  },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    cell: (r) => h(NqStatus, { tone: PAYMENT_TONE[r.status] }, () => t.value[r.status]),
    sortValue: (r) => r.status,
    filterValue: (r) => r.status,
  },
  { id: "amount", header: t.value.amount, align: "end", cell: (r) => h(NqNum, { value: r.amount, format: money.value }), sortValue: (r) => r.amount },
]);
const paymentTable = useDataTable({
  data: () => (props.payments ?? []) as PaymentRecord[],
  columns: () => paymentColumns.value,
  getRowId: (r) => r.id,
  pageSize: props.pageSize,
  defaultSort: { id: "date", direction: "desc" },
});

const invoiceStatuses = computed(() => (["open", "overdue", "paid", "draft", "void", "refunded"] as const).map((s) => ({ value: s, label: statusLabel(s) })));
const paymentStatuses = computed(() => (["succeeded", "pending", "failed", "refunded"] as const).map((s) => ({ value: s, label: t.value[s] })));
const rowActions = (r: InvoiceSummary) => [
  ...(props.onOpen ? [{ id: "view", label: t.value.view, icon: Eye, onSelect: () => props.onOpen?.(r) }] : []),
  ...(props.onDownload ? [{ id: "download", label: t.value.download, icon: Download, onSelect: () => void download(r) }] : []),
  ...(props.onPay && (r.status === "open" || r.status === "overdue") ? [{ id: "pay", label: t.value.pay, icon: Banknote, group: "pay", onSelect: () => props.onPay?.(r) }] : []),
];
const invoiceLabel = (r: InvoiceSummary) => r.number;
const paymentLabel = (r: PaymentRecord) => r.invoiceNumber ?? r.reference ?? r.id;
</script>

<template>
  <div data-slot="invoice-list" :class="cn('flex flex-col gap-6', props.class)">
    <NqStatGrid v-if="props.showSummary">
      <NqStatCard :label="t.outstanding" :value="summary.outstanding" :format="money" :loading="props.loading" />
      <NqStatCard :label="t.overdueTotal" :value="summary.overdue" :format="money" :loading="props.loading" />
      <NqStatCard :label="t.paidTotal" :value="summary.paid" :format="money" :loading="props.loading" />
    </NqStatGrid>
    <NqTabs v-if="props.payments" :default-value="props.defaultTab">
      <NqTabsList variant="underline" :aria-label="t.tabs">
        <NqTabsTab value="invoices">{{ t.invoices }}</NqTabsTab>
        <NqTabsTab value="payments">{{ t.payments }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
      <NqTabsPanel value="invoices">
        <div class="flex flex-col gap-3">
          <NqDataTableToolbar>
            <NqDataTableSearch :table="invoiceTable" :placeholder="t.search" />
            <NqDataTableFacetFilter :table="invoiceTable" column="status" :options="invoiceStatuses" />
          </NqDataTableToolbar>
          <p v-if="failed" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
            <CircleAlert aria-hidden="true" class="size-4" />
            {{ failed }}
          </p>
          <NqDataTable :table="invoiceTable" :label="t.label" :row-label="invoiceLabel" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="props.onOpen" :row-actions="rowActions">
            <template #empty><NqEmptyState :icon="ReceiptText" :title="t.emptyTitle" :description="t.emptyDescription" class="border-0" /></template>
          </NqDataTable>
          <NqDataTablePagination :table="invoiceTable" />
        </div>
      </NqTabsPanel>
      <NqTabsPanel value="payments">
        <div class="flex flex-col gap-3">
          <NqDataTableToolbar>
            <NqDataTableSearch :table="paymentTable" :placeholder="t.searchPayments" />
            <NqDataTableFacetFilter :table="paymentTable" column="status" :options="paymentStatuses" />
          </NqDataTableToolbar>
          <NqDataTable :table="paymentTable" :label="t.labelPayments" :row-label="paymentLabel" :loading="props.loading" :error="props.error" :on-retry="props.onRetry">
            <template #empty><NqEmptyState :icon="Banknote" :title="t.emptyPaymentsTitle" :description="t.emptyPaymentsDescription" class="border-0" /></template>
          </NqDataTable>
          <NqDataTablePagination :table="paymentTable" />
        </div>
      </NqTabsPanel>
    </NqTabs>
    <div v-else class="flex flex-col gap-3">
      <NqDataTableToolbar>
        <NqDataTableSearch :table="invoiceTable" :placeholder="t.search" />
        <NqDataTableFacetFilter :table="invoiceTable" column="status" :options="invoiceStatuses" />
      </NqDataTableToolbar>
      <p v-if="failed" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
        <CircleAlert aria-hidden="true" class="size-4" />
        {{ failed }}
      </p>
      <NqDataTable :table="invoiceTable" :label="t.label" :row-label="invoiceLabel" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="props.onOpen" :row-actions="rowActions">
        <template #empty><NqEmptyState :icon="ReceiptText" :title="t.emptyTitle" :description="t.emptyDescription" class="border-0" /></template>
      </NqDataTable>
      <NqDataTablePagination :table="invoiceTable" />
    </div>
  </div>
</template>
