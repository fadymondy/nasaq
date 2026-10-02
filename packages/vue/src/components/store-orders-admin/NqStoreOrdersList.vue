<script setup lang="ts">
import { Download, FileText, PackageCheck, Plus, Printer, Search, Truck, X } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import {
  NqDataTable,
  NqDataTableBulkActions,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableToolbar,
  NqDataTableViewOptions,
  useDataTable,
  type DataTableColumn,
} from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "../store-order-timeline/order-labels";
import NqStoreFulfilmentBadge from "./NqStoreFulfilmentBadge.vue";
import NqStoreMoney from "./NqStoreMoney.vue";
import NqStoreOrderStatusBadge from "./NqStoreOrderStatusBadge.vue";
import NqStorePaymentBadge from "./NqStorePaymentBadge.vue";
import type { CommerceOrder } from "./order-types";
import { type OrderFilters, type OrderView, activeView, canMarkFulfilled, filterOrders, orderFulfilment, ordersToCsv, removeView, upsertView, viewCounts } from "./orders-list-logic";
import { commerceMinorFactor } from "./order-types";
import { useStoreAdminStrings, type StoreAdminLabels } from "./strings";

// The store admin's order list: a data table with status, payment and fulfilment chips, search and facet filters,
// saved views with live counts, and bulk actions (mark fulfilled, print, export).
export type StoreOrderDocumentKind = "invoice" | "packing-slip";

const props = withDefaults(
  defineProps<{
    orders: readonly CommerceOrder[];
    /** ISO 4217 code of the store's currency. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Saved views added by the team. The built-in ones (All, To fulfil, Unpaid, Delivered, Refunds) are always there. */
    views?: readonly OrderView[];
    onViewsChange?: (views: OrderView[]) => void;
    onOpenOrder?: (order: CommerceOrder) => void;
    /** Called with the orders that can be shipped in full. The parent updates them, for example with `applyFulfilment`. */
    onMarkFulfilled?: (orders: CommerceOrder[]) => void;
    onPrint?: (orders: CommerceOrder[], document: StoreOrderDocumentKind) => void;
    /** Called after the CSV is built. When omitted the browser downloads `orders.csv`. */
    onExport?: (orders: CommerceOrder[], csv: string) => void;
    loading?: boolean;
    error?: boolean;
    onRetry?: () => void;
    pageSize?: number;
    labels?: StoreAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { views: () => [], pageSize: 10 },
);

const currency = useCurrency(() => props.currency);
const { t, ar } = useStoreAdminStrings(() => props.labels);
const lang = computed(() => (ar.value ? "ar" : "en"));
const filters = ref<OrderFilters>({});
const query = ref("");
const saving = ref(false);
const viewName = ref("");
const mine = ref<OrderView[]>([...props.views]);
const saved = computed<OrderView[]>(() => (props.onViewsChange ? [...props.views] : mine.value));
const setSaved = (next: OrderView[]) => (props.onViewsChange ? props.onViewsChange(next) : (mine.value = next));

const builtIn = computed<OrderView[]>(() => {
  const views: OrderView[] = [
  { id: "all", name: t.value.viewAll, filters: {} },
  { id: "to-fulfil", name: t.value.viewToFulfil, filters: { payment: ["paid", "cod"], fulfilment: ["unfulfilled", "partial"] } },
  { id: "unpaid", name: t.value.viewUnpaid, filters: { payment: ["pending", "authorized", "failed"] } },
  { id: "delivered", name: t.value.viewDelivered, filters: { status: ["delivered"] } },
  { id: "refunds", name: t.value.viewRefunds, filters: { payment: ["refunded", "partially-refunded"] } },
  ];
  return views;
});
const allViews = computed(() => [...builtIn.value, ...saved.value]);
const counts = computed(() => viewCounts(props.orders, allViews.value));
const current = computed(() => activeView(allViews.value, { filters: filters.value, query: query.value }));
const filtered = computed(() => filterOrders(props.orders, { filters: filters.value, query: query.value }));
const isFiltered = computed(() => !!query.value.trim() || Object.values(filters.value).some((v) => v.length > 0));

function pick(view: OrderView) {
  filters.value = view.filters;
  query.value = view.query ?? "";
}

const columns = computed<DataTableColumn<CommerceOrder>[]>(() => [
  { id: "number", header: t.value.order, cell: (o) => h("span", { class: "font-medium text-foreground" }, o.number), sortValue: (o) => o.number, hideable: false },
  { id: "date", header: t.value.date, cell: (o) => h(NqDateTime, { value: o.placedAt, format: { dateStyle: "medium" }, class: "text-muted-foreground" }), sortValue: (o) => o.placedAt },
  {
    id: "customer",
    header: t.value.customer,
    cell: (o) =>
      h("span", { class: "flex min-w-0 flex-col" }, [
        h("span", { class: "truncate text-foreground" }, o.customer.name),
        o.customer.email ? h("span", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, o.customer.email) : null,
      ]),
    sortValue: (o) => o.customer.name,
  },
  { id: "payment", header: t.value.payment, label: t.value.payment, cell: (o) => h(NqStorePaymentBadge, { payment: o.payment }), filterValue: (o) => o.payment },
  { id: "fulfilment", header: t.value.fulfilment, label: t.value.fulfilment, cell: (o) => h(NqStoreFulfilmentBadge, { order: o }), filterValue: (o) => orderFulfilment(o) },
  { id: "status", header: t.value.status, label: t.value.status, cell: (o) => h(NqStoreOrderStatusBadge, { status: o.status }), filterValue: (o) => o.status, defaultHidden: false },
  { id: "items", header: t.value.items, cell: (o) => h(NqNum, { value: o.totals.itemCount }), sortValue: (o) => o.totals.itemCount, align: "end", defaultHidden: true },
  { id: "total", header: t.value.total, cell: (o) => h(NqStoreMoney, { amount: o.totals.total, currency: currency.value }), sortValue: (o) => o.totals.total, align: "end" },
]);

// Search and the saved views run through orders-list-logic so the counts on the views match the table; the facet
// filters are shared with the table, which applies the same values again.
const table = useDataTable<CommerceOrder>({
  data: () => filtered.value as CommerceOrder[],
  columns: () => columns.value,
  getRowId: (o) => o.id,
  pageSize: props.pageSize,
  selectable: true,
  defaultSort: { id: "date", direction: "desc" },
  filters: { value: () => filters.value, onChange: (v) => (filters.value = v) },
});

const selected = computed(() => table.selectedRows);
const eligible = computed(() => selected.value.filter(canMarkFulfilled));

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function exportOrders(rows: CommerceOrder[]) {
  const csv = ordersToCsv(rows, { currency: currency.value, digits: Math.log10(commerceMinorFactor(currency.value)) });
  if (props.onExport) props.onExport(rows, csv);
  else download("orders.csv", csv);
}

const statusOptions = computed(() => Object.keys(ORDER_STATUS_LABEL).map((v) => ({ value: v, label: ORDER_STATUS_LABEL[v as CommerceOrder["status"]][lang.value] })));
const paymentOptions = computed(() => Object.keys(PAYMENT_LABEL).map((v) => ({ value: v, label: PAYMENT_LABEL[v as CommerceOrder["payment"]][lang.value] })));
const fulfilmentOptions = computed(() => (["unfulfilled", "partial", "fulfilled", "none"] as const).map((v) => ({ value: v, label: FULFILMENT_LABEL[v][lang.value] })));

const rowActions = (o: CommerceOrder) => [
  { id: "open", label: t.value.openOrder, icon: FileText, onSelect: () => props.onOpenOrder?.(o) },
  ...(canMarkFulfilled(o) && props.onMarkFulfilled ? [{ id: "fulfil", label: t.value.markFulfilled(1), icon: PackageCheck, onSelect: () => props.onMarkFulfilled?.([o]) }] : []),
  { id: "slip", label: t.value.printSlip, icon: Truck, group: "print", onSelect: () => props.onPrint?.([o], "packing-slip") },
  { id: "invoice", label: t.value.printInvoice, icon: Printer, group: "print", onSelect: () => props.onPrint?.([o], "invoice") },
];

function removeSaved(view: OrderView) {
  setSaved(removeView(saved.value, view.id));
  if (current.value?.id === view.id) pick(builtIn.value[0]!);
}
function openSave() {
  viewName.value = "";
  saving.value = true;
}
let counter = 0;
function saveView() {
  if (!viewName.value.trim()) return;
  setSaved(upsertView(saved.value, { id: `view-${Date.now().toString(36)}-${(counter++).toString(36)}`, name: viewName.value, filters: filters.value, ...(query.value.trim() ? { query: query.value } : {}) }));
  saving.value = false;
}
</script>

<template>
  <div data-slot="store-orders-list" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div role="group" :aria-label="t.views" class="flex flex-wrap items-center gap-1.5">
      <span
        v-for="view in allViews"
        :key="view.id"
        :class="cn('inline-flex items-center rounded-control border', current?.id === view.id ? 'border-primary bg-nq-selected' : 'border-border bg-card')"
      >
        <button
          type="button"
          :aria-pressed="current?.id === view.id"
          class="inline-flex h-control-sm items-center gap-1.5 rounded-control px-2.5 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="pick(view)"
        >
          {{ view.name }}
          <NqNum :value="counts[view.id] ?? 0" class="text-caption text-muted-foreground" />
        </button>
        <button
          v-if="saved.some((v) => v.id === view.id)"
          type="button"
          :aria-label="`${t.deleteView}: ${view.name}`"
          class="me-1 inline-flex size-5 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="removeSaved(view)"
        >
          <X aria-hidden="true" class="size-3" />
        </button>
      </span>
      <NqButton v-if="isFiltered && !current" size="sm" variant="ghost" @click="openSave">
        <Plus aria-hidden="true" />
        {{ t.saveView }}
      </NqButton>
    </div>

    <NqDataTableToolbar>
      <div class="relative w-full min-w-40 sm:w-64">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :aria-label="t.searchOrders" :placeholder="t.searchOrders" class="h-control-sm ps-8" @keydown="(e: KeyboardEvent) => e.key === 'Escape' && (query = '')" />
      </div>
      <NqDataTableFacetFilter :table="table" column="status" :title="t.status" :options="statusOptions" />
      <NqDataTableFacetFilter :table="table" column="payment" :title="t.payment" :options="paymentOptions" />
      <NqDataTableFacetFilter :table="table" column="fulfilment" :title="t.fulfilment" :options="fulfilmentOptions" />
      <NqDataTableViewOptions :table="table" />
      <NqButton size="sm" variant="secondary" :disabled="!filtered.length" class="ms-auto" @click="exportOrders(filtered as CommerceOrder[])">
        <Download aria-hidden="true" />
        {{ t.exportCsv }}
      </NqButton>
    </NqDataTableToolbar>

    <NqDataTableBulkActions :table="table">
      <NqButton size="sm" variant="secondary" :disabled="!eligible.length || !props.onMarkFulfilled" :title="eligible.length < selected.length ? t.someSkipped(selected.length - eligible.length) : undefined" @click="props.onMarkFulfilled?.(eligible)">
        <PackageCheck aria-hidden="true" />
        {{ t.markFulfilled(eligible.length) }}
      </NqButton>
      <NqButton size="sm" variant="secondary" @click="props.onPrint?.(selected, 'packing-slip')">
        <Truck aria-hidden="true" />
        {{ t.printSlips }}
      </NqButton>
      <NqButton size="sm" variant="secondary" @click="props.onPrint?.(selected, 'invoice')">
        <Printer aria-hidden="true" />
        {{ t.printInvoices }}
      </NqButton>
      <NqButton size="sm" variant="secondary" @click="exportOrders(selected)">
        <Download aria-hidden="true" />
        {{ t.exportSelected }}
      </NqButton>
    </NqDataTableBulkActions>

    <NqDataTable
      :table="table"
      :label="t.orders"
      :row-label="(o: CommerceOrder) => o.number"
      :loading="props.loading"
      :error="props.error ? t.loadError : undefined"
      :on-retry="props.onRetry"
      :on-row-click="props.onOpenOrder"
      :row-actions="rowActions"
    >
      <template #empty>
        <NqEmptyState v-if="isFiltered" :title="t.noMatch" :description="t.noMatchHint" class="border-0">
          <template #actions>
            <NqButton size="sm" variant="secondary" @click="pick(builtIn[0]!)">{{ t.clearFilters }}</NqButton>
          </template>
        </NqEmptyState>
        <NqEmptyState v-else :title="t.noOrders" :description="t.noOrdersText" class="border-0" />
      </template>
    </NqDataTable>
    <NqDataTablePagination :table="table" />

    <NqDialog v-model:open="saving">
      <NqDialogContent class="max-w-sm">
        <form class="flex flex-col gap-4" @submit.prevent="saveView">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.saveView }}</NqDialogTitle>
            <NqDialogDescription>{{ t.saveViewText }}</NqDialogDescription>
          </NqDialogHeader>
          <NqInput v-model="viewName" :aria-label="t.viewName" :placeholder="t.viewName" autofocus />
          <NqDialogFooter>
            <NqButton type="button" variant="secondary" @click="saving = false">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :disabled="!viewName.trim()">{{ t.save }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
