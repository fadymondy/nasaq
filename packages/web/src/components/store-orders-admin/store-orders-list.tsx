"use client";

import { Download, FileText, PackageCheck, Plus, Printer, Search, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import {
  DataTable,
  DataTableBulkActions,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  type DataTableColumn,
  useDataTable,
} from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { DateTime, Num } from "../numeric";
import { EmptyState } from "../states";
import { FULFILMENT_LABEL, FULFILMENT_VARIANT, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT, PAYMENT_LABEL, PAYMENT_VARIANT } from "../store-order-timeline/order-labels";
import { useStoreAdminStrings, type StoreAdminLabels } from "./admin-strings";
import { StoreMoney } from "./money";
import { outstandingPicks, planFulfilment } from "./order-math";
import { type OrderFilters, type OrderView, activeView, filterOrders, orderFulfilment, ordersToCsv, removeView, upsertView, viewCounts } from "./orders-list-logic";
import { useCurrency } from "../../provider/nasaq-provider";

export type StoreOrderDocumentKind = "invoice" | "packing-slip";

/** Chips for an order's status, payment and fulfilment. They read the same words as the customer's account. */
export function StoreOrderStatusBadge({ status }: { status: CommerceOrder["status"] }) {
  const { ar } = useStoreAdminStrings();
  return <Badge variant={ORDER_STATUS_VARIANT[status]}>{ORDER_STATUS_LABEL[status][ar ? "ar" : "en"]}</Badge>;
}
export function StorePaymentBadge({ payment }: { payment: CommerceOrder["payment"] }) {
  const { ar } = useStoreAdminStrings();
  return <Badge variant={PAYMENT_VARIANT[payment]}>{PAYMENT_LABEL[payment][ar ? "ar" : "en"]}</Badge>;
}
export function StoreFulfilmentBadge({ order }: { order: Pick<CommerceOrder, "lines" | "status"> }) {
  const { ar } = useStoreAdminStrings();
  const state = orderFulfilment(order);
  return <Badge variant={FULFILMENT_VARIANT[state]}>{FULFILMENT_LABEL[state][ar ? "ar" : "en"]}</Badge>;
}

/** Whether "mark fulfilled" can do anything for this order: something is outstanding and the order is not blocked. */
export const canMarkFulfilled = (order: CommerceOrder) => planFulfilment(order, { picks: outstandingPicks(order.lines) }).ok;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export interface StoreOrdersListProps {
  orders: readonly CommerceOrder[];
  /** ISO 4217 code of the store's currency. */
  /** Defaults to USD, or SAR in Arabic. */
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
  className?: string;
}

/**
 * The store admin's order list: a data table with status, payment and fulfilment chips, search and facet filters,
 * saved views with live counts, and bulk actions (mark fulfilled, print, export).
 */
export function StoreOrdersList({
  orders,
  currency: currencyProp,
  views: customViews = [],
  onViewsChange,
  onOpenOrder,
  onMarkFulfilled,
  onPrint,
  onExport,
  loading,
  error,
  onRetry,
  pageSize = 10,
  labels,
  className,
}: StoreOrdersListProps) {
  const currency = useCurrency(currencyProp);
  const { t, ar } = useStoreAdminStrings(labels);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const [mine, setMine] = useState<OrderView[]>([...customViews]);
  const saved = onViewsChange ? [...customViews] : mine;
  const setSaved = (next: OrderView[]) => (onViewsChange ? onViewsChange(next) : setMine(next));

  const builtIn = useMemo(
    (): OrderView[] => [
      { id: "all", name: t.viewAll, filters: {} },
      { id: "to-fulfil", name: t.viewToFulfil, filters: { payment: ["paid", "cod"], fulfilment: ["unfulfilled", "partial"] } },
      { id: "unpaid", name: t.viewUnpaid, filters: { payment: ["pending", "authorized", "failed"] } },
      { id: "delivered", name: t.viewDelivered, filters: { status: ["delivered"] } },
      { id: "refunds", name: t.viewRefunds, filters: { payment: ["refunded", "partially-refunded"] } },
    ],
    [t],
  );
  const allViews = [...builtIn, ...saved];
  const counts = useMemo(() => viewCounts(orders, allViews), [orders, allViews]);
  const current = activeView(allViews, { filters, query });
  const filtered = useMemo(() => filterOrders(orders, { filters, query }), [orders, filters, query]);
  const isFiltered = !!query.trim() || Object.values(filters).some((v) => v.length > 0);

  const pick = (view: OrderView) => {
    setFilters(view.filters);
    setQuery(view.query ?? "");
  };

  const columns = useMemo<DataTableColumn<CommerceOrder>[]>(
    () => [
      { id: "number", header: t.order, cell: (o) => <span className="font-medium text-foreground">{o.number}</span>, sortValue: (o) => o.number, hideable: false },
      { id: "date", header: t.date, cell: (o) => <DateTime value={o.placedAt} format={{ dateStyle: "medium" }} className="text-muted-foreground" />, sortValue: (o) => o.placedAt },
      {
        id: "customer",
        header: t.customer,
        cell: (o) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{o.customer.name}</span>
            {o.customer.email ? <span dir="ltr" className="truncate text-caption text-muted-foreground">{o.customer.email}</span> : null}
          </span>
        ),
        sortValue: (o) => o.customer.name,
      },
      { id: "payment", header: t.payment, label: t.payment, cell: (o) => <StorePaymentBadge payment={o.payment} />, filterValue: (o) => o.payment },
      { id: "fulfilment", header: t.fulfilment, label: t.fulfilment, cell: (o) => <StoreFulfilmentBadge order={o} />, filterValue: (o) => orderFulfilment(o) },
      { id: "status", header: t.status, label: t.status, cell: (o) => <StoreOrderStatusBadge status={o.status} />, filterValue: (o) => o.status, defaultHidden: false },
      { id: "items", header: t.items, cell: (o) => <Num value={o.totals.itemCount} />, sortValue: (o) => o.totals.itemCount, align: "end", defaultHidden: true },
      { id: "total", header: t.total, cell: (o) => <StoreMoney amount={o.totals.total} currency={currency} />, sortValue: (o) => o.totals.total, align: "end" },
    ],
    [t, currency],
  );

  const table = useDataTable<CommerceOrder>({
    data: filtered as CommerceOrder[],
    columns,
    getRowId: (o) => o.id,
    pageSize,
    selectable: true,
    defaultSort: { id: "date", direction: "desc" },
    // Search and the saved views run through orders-list-logic so the counts on the views match the table; the facet
    // filters are shared with the table, which applies the same values again.
    filters: { value: filters, onChange: setFilters },
  });

  const selected = table.selectedRows;
  const eligible = selected.filter(canMarkFulfilled);
  const exportOrders = (rows: CommerceOrder[]) => {
    const csv = ordersToCsv(rows, { currency, digits: Math.log10(currency === "JPY" ? 1 : currency === "KWD" ? 1000 : 100) });
    if (onExport) onExport(rows, csv);
    else download("orders.csv", csv);
  };

  const statusOptions = Object.keys(ORDER_STATUS_LABEL).map((v) => ({ value: v, label: ORDER_STATUS_LABEL[v as CommerceOrder["status"]][ar ? "ar" : "en"] }));
  const paymentOptions = Object.keys(PAYMENT_LABEL).map((v) => ({ value: v, label: PAYMENT_LABEL[v as CommerceOrder["payment"]][ar ? "ar" : "en"] }));
  const fulfilmentOptions = (["unfulfilled", "partial", "fulfilled", "none"] as const).map((v) => ({ value: v, label: FULFILMENT_LABEL[v][ar ? "ar" : "en"] }));

  return (
    <div data-slot="store-orders-list" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div role="group" aria-label={t.views} className="flex flex-wrap items-center gap-1.5">
        {allViews.map((view) => {
          const active = current?.id === view.id;
          const custom = saved.some((v) => v.id === view.id);
          return (
            <span key={view.id} className={cn("inline-flex items-center rounded-control border", active ? "border-primary bg-nq-selected" : "border-border bg-card")}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => pick(view)}
                className="inline-flex h-control-sm items-center gap-1.5 rounded-control px-2.5 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                {view.name}
                <Num value={counts[view.id] ?? 0} className="text-caption text-muted-foreground" />
              </button>
              {custom ? (
                <button
                  type="button"
                  aria-label={`${t.deleteView}: ${view.name}`}
                  onClick={() => {
                    setSaved(removeView(saved, view.id));
                    if (active) pick(builtIn[0]!);
                  }}
                  className="me-1 inline-flex size-5 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  <X aria-hidden className="size-3" />
                </button>
              ) : null}
            </span>
          );
        })}
        {isFiltered && !current ? (
          <Button size="sm" variant="ghost" onClick={() => { setViewName(""); setSaving(true); }}>
            <Plus aria-hidden />
            {t.saveView}
          </Button>
        ) : null}
      </div>

      <DataTableToolbar>
        <div className="relative w-full min-w-40 sm:w-64">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t.searchOrders}
            placeholder={t.searchOrders}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            className="h-control-sm ps-8"
          />
        </div>
        <DataTableFacetFilter table={table} column="status" title={t.status} options={statusOptions} />
        <DataTableFacetFilter table={table} column="payment" title={t.payment} options={paymentOptions} />
        <DataTableFacetFilter table={table} column="fulfilment" title={t.fulfilment} options={fulfilmentOptions} />
        <DataTableViewOptions table={table} />
        <Button size="sm" variant="secondary" disabled={!filtered.length} onClick={() => exportOrders(filtered as CommerceOrder[])} className="ms-auto">
          <Download aria-hidden />
          {t.exportCsv}
        </Button>
      </DataTableToolbar>

      <DataTableBulkActions table={table}>
        <Button size="sm" variant="secondary" disabled={!eligible.length || !onMarkFulfilled} onClick={() => onMarkFulfilled?.(eligible)} title={eligible.length < selected.length ? t.someSkipped(selected.length - eligible.length) : undefined}>
          <PackageCheck aria-hidden />
          {t.markFulfilled(eligible.length)}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPrint?.(selected, "packing-slip")}>
          <Truck aria-hidden />
          {t.printSlips}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPrint?.(selected, "invoice")}>
          <Printer aria-hidden />
          {t.printInvoices}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => exportOrders(selected)}>
          <Download aria-hidden />
          {t.exportSelected}
        </Button>
      </DataTableBulkActions>

      <DataTable
        table={table}
        label={t.orders}
        rowLabel={(o) => o.number}
        loading={loading}
        error={error ? t.loadError : undefined}
        onRetry={onRetry}
        onRowClick={onOpenOrder}
        rowActions={(o) => [
          { id: "open", label: t.openOrder, icon: FileText, onSelect: () => onOpenOrder?.(o) },
          ...(canMarkFulfilled(o) && onMarkFulfilled ? [{ id: "fulfil", label: t.markFulfilled(1), icon: PackageCheck, onSelect: () => onMarkFulfilled([o]) }] : []),
          { id: "slip", label: t.printSlip, icon: Truck, group: "print", onSelect: () => onPrint?.([o], "packing-slip") },
          { id: "invoice", label: t.printInvoice, icon: Printer, group: "print", onSelect: () => onPrint?.([o], "invoice") },
        ]}
        empty={
          isFiltered ? (
            <EmptyState
              title={t.noMatch}
              description={t.noMatchHint}
              actions={
                <Button size="sm" variant="secondary" onClick={() => pick(builtIn[0]!)}>
                  {t.clearFilters}
                </Button>
              }
            />
          ) : (
            <EmptyState title={t.noOrders} description={t.noOrdersText} />
          )
        }
      />
      <DataTablePagination table={table} />

      <Dialog open={saving} onOpenChange={setSaving}>
        <DialogContent className="max-w-sm">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!viewName.trim()) return;
              setSaved(upsertView(saved, { id: `view-${Date.now().toString(36)}`, name: viewName, filters, ...(query.trim() ? { query } : {}) }));
              setSaving(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.saveView}</DialogTitle>
              <DialogDescription>{t.saveViewText}</DialogDescription>
            </DialogHeader>
            <Input aria-label={t.viewName} placeholder={t.viewName} value={viewName} onChange={(e) => setViewName(e.target.value)} autoFocus />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setSaving(false)}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="primary" disabled={!viewName.trim()}>
                {t.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
