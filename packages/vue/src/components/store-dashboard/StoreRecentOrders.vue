<script setup lang="ts">
import { computed, h } from "vue";
import { NqBadge } from "../badge";
import { NqDataTable, useDataTable, type DataTableColumn } from "../data-table";
import { NqDateTime } from "../numeric";
import { NqPrice } from "../price";
import type { CommerceOrder } from "./store-commerce";
import { ORDER_STATUS_VARIANT, type StoreDashboardLabels } from "./strings";

// The recent-orders widget: a sortable table, newest first. Clicking a row or its menu opens the order.
const props = defineProps<{
  orders: readonly CommerceOrder[];
  currency: string;
  /** Minor units to major. */
  toMajor: (minor: number) => number;
  t: StoreDashboardLabels;
  onOpenOrder?: (order: CommerceOrder) => void;
}>();

const columns = computed<DataTableColumn<CommerceOrder>[]>(() => [
  {
    id: "number",
    header: props.t.order,
    cell: (o) => h("bdi", { dir: "ltr", class: "text-label tabular-nums" }, o.number),
    sortValue: (o) => o.placedAt,
    searchValue: (o) => o.number,
  },
  { id: "customer", header: props.t.customer, cell: (o) => h("span", { class: "block max-w-40 truncate" }, o.customer.name) },
  { id: "status", header: props.t.status, cell: (o) => h(NqBadge, { variant: ORDER_STATUS_VARIANT[o.status] }, () => props.t.orderStatus[o.status]) },
  { id: "total", header: props.t.total, align: "end", cell: (o) => h(NqPrice, { amount: props.toMajor(o.totals.total), currency: props.currency, size: "sm" }) },
  {
    id: "placed",
    header: props.t.placed,
    cell: (o) => h(NqDateTime, { value: o.placedAt, format: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, class: "text-body-sm text-muted-foreground" }),
    className: "hidden sm:table-cell",
    headerClassName: "hidden sm:table-cell",
  },
]);

const table = useDataTable<CommerceOrder>({ data: computed(() => [...props.orders]), columns, getRowId: (o) => o.id, defaultSort: { id: "number", direction: "desc" } });
const rowActions = computed(() => {
  const open = props.onOpenOrder;
  return open ? (o: CommerceOrder) => [{ id: "open", label: props.t.openOrder, onSelect: () => open(o) }] : undefined;
});
</script>

<template>
  <NqDataTable :table="table" :label="t.ordersTable" :row-label="(o: CommerceOrder) => o.number" :on-row-click="onOpenOrder" :row-actions="rowActions">
    <template #empty>{{ t.noOrders }}</template>
  </NqDataTable>
</template>
