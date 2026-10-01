"use client";

import { Package, RotateCcw, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder, CommerceProduct } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button, buttonVariants } from "../button";
import { Input } from "../field";
import { DateTime, Num } from "../numeric";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "../store-order-timeline/order-labels";
import { trackingUrl } from "../store-order-timeline/timeline-model";
import { StoreMoney } from "../store-orders-admin/money";
import { Toggle, ToggleGroup } from "../toggle-group";
import { type OrderGroup, type ReorderPlan, ORDER_GROUPS, filterCustomerOrders, newestOrdersFirst, orderGroupCounts, reorderPlan } from "./account-logic";
import { type StoreAccountLabels, type StoreAccountStrings, useStoreAccountStrings } from "./account-strings";
import { useCurrency } from "../../provider/nasaq-provider";

export interface StoreOrderHistoryProps {
  orders: readonly CommerceOrder[];
  /** Current catalogue, used to decide what "Order again" can add today. */
  products?: readonly CommerceProduct[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  trackingTemplate?: string;
  onOpenOrder?: (order: CommerceOrder) => void;
  /** Called with the lines that can go in the cart. The list shows what was added, reduced or skipped. */
  onReorder?: (order: CommerceOrder, plan: ReorderPlan) => void;
  onOpenCart?: () => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreAccountLabels;
  className?: string;
}

/** The customer's order history: filter by status group, search, open an order, track it or order it again. */
export function StoreOrderHistory({ orders, products = [], currency: currencyProp, trackingTemplate, onOpenOrder, onReorder, onOpenCart, loading, error, onRetry, labels, className }: StoreOrderHistoryProps) {
  const currency = useCurrency(currencyProp);
  const { t, ar } = useStoreAccountStrings(labels);
  const [group, setGroup] = useState<OrderGroup>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<ReorderPlan | null>(null);
  const counts = useMemo(() => orderGroupCounts(orders), [orders]);
  const shown = useMemo(() => newestOrdersFirst(filterCustomerOrders(orders, { group, query })), [orders, group, query]);
  const lang = ar ? "ar" : "en";

  const reorder = (order: CommerceOrder) => {
    const plan = reorderPlan(order, products);
    setNotice(plan);
    if (plan.add.length) onReorder?.(order, plan);
  };

  if (error) {
    return (
      <ErrorState
        title={t.loadError}
        actions={
          onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <section data-slot="store-order-history" aria-label={t.ordersTitle} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input type="search" aria-label={t.searchOrders} placeholder={t.searchOrders} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9" />
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ToggleGroup aria-label={t.ordersTitle} value={[group]} onValueChange={(v) => v[0] && setGroup(v[0] as OrderGroup)}>
            {ORDER_GROUPS.map((g) => (
              <Toggle key={g} value={g}>
                {t.groups[g]}
                <Num value={counts[g]} className="ms-1.5 text-muted-foreground" />
              </Toggle>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {notice ? <ReorderNotice plan={notice} t={t} onOpenCart={onOpenCart} /> : null}

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : shown.length === 0 ? (
        orders.length === 0 ? (
          <EmptyState icon={Package} title={t.noOrders} description={t.noOrdersText} />
        ) : (
          <EmptyState
            icon={Search}
            title={t.noMatch}
            description={t.noMatchHint}
            actions={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setGroup("all");
                  setQuery("");
                }}
              >
                {t.clearFilters}
              </Button>
            }
          />
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {shown.map((order) => {
            const url = trackingUrl(order.tracking, trackingTemplate);
            const count = order.lines.reduce((s, l) => s + l.quantity, 0);
            return (
              <li key={order.id} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold">
                      {t.order} <bdi>{order.number}</bdi>
                    </span>
                    <span className="text-body-sm text-muted-foreground">
                      {t.placedOn} <DateTime value={order.placedAt} format={{ dateStyle: "medium" }} />
                    </span>
                  </div>
                  <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status][lang]}</Badge>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  {order.lines.slice(0, 4).map((line) => (
                    <span key={line.id} className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                      {line.image ? <img src={line.image} alt={line.name} className="size-full object-cover" /> : <Package aria-hidden className="size-6 text-muted-foreground" />}
                    </span>
                  ))}
                  {order.lines.length > 4 ? (
                    <span className="text-body-sm text-muted-foreground">
                      +<Num value={order.lines.length - 4} />
                    </span>
                  ) : null}
                  <span className="ms-auto flex shrink-0 flex-col items-end text-body-sm">
                    <StoreMoney amount={order.totals.total} currency={currency} className="font-semibold" />
                    <span className="text-muted-foreground">
                      <Num value={count} /> {t.items}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onOpenOrder?.(order)}>
                    {t.viewOrder}
                  </Button>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                      <Truck aria-hidden />
                      {t.trackOrder}
                    </a>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => reorder(order)}>
                    <RotateCcw aria-hidden />
                    {t.orderAgain}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** What "Order again" did: added, reduced for stock, skipped. Shared by the list and the order page. */
export function ReorderNotice({ plan, t, onOpenCart }: { plan: ReorderPlan; t: StoreAccountStrings; onOpenCart?: () => void }) {
  const added = plan.add.length;
  const changedPrice = plan.add.some((l) => l.priceChanged);
  return (
    <div role="status" className="flex flex-col gap-1 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm">
      <span className="font-medium">{added > 0 ? t.reorderAdded(added) : t.reorderNothing}</span>
      {plan.reduced.length > 0 ? <span>{t.reorderReduced(plan.reduced.length)}</span> : null}
      {plan.skipped.length > 0 && added > 0 ? <span>{t.reorderSkipped(plan.skipped.length)}</span> : null}
      {changedPrice ? <span className="text-muted-foreground">{t.reorderPriceChanged}</span> : null}
      {added > 0 && onOpenCart ? (
        <Button size="sm" variant="secondary" className="mt-1 self-start" onClick={onOpenCart}>
          {t.goToCart}
        </Button>
      ) : null}
    </div>
  );
}
