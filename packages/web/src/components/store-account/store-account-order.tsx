"use client";

import { ArrowLeft, Package, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder, CommerceProduct } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime, Num } from "../numeric";
import { StoreOrderTimeline } from "../store-order-timeline/store-order-timeline";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "../store-order-timeline/order-labels";
import { StoreMoney } from "../store-orders-admin/money";
import { lineFulfilled, lineRefunded } from "../store-orders-admin/order-math";
import { type ReorderPlan, reorderPlan } from "./account-logic";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";
import { type ReturnRequest, deliveredAt, returnWindow, returnableLines } from "./return-math";
import { ReorderNotice } from "./store-order-history";
import { StoreReturnStatus } from "./store-return-status";
import { useCurrency } from "../../provider/nasaq-provider";

export interface StoreAccountOrderProps {
  order: CommerceOrder;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  requests?: readonly ReturnRequest[];
  products?: readonly CommerceProduct[];
  /** Carrier link template with `{number}`. */
  trackingTemplate?: string;
  /** Days after delivery a return can be requested. Default 30. */
  returnDays?: number;
  /** Reference time for the return window. Default: now. */
  now?: number | Date;
  onBack?: () => void;
  onReorder?: (order: CommerceOrder, plan: ReorderPlan) => void;
  onOpenCart?: () => void;
  onReturn?: (order: CommerceOrder) => void;
  onCancelReturn?: (request: ReturnRequest) => void;
  labels?: StoreAccountLabels;
  className?: string;
}

/**
 * One order in the customer's account: the tracking timeline with a carrier link, the items with what shipped or was
 * refunded, the totals, the address, and any returns with their RMA status.
 */
export function StoreAccountOrder({ order, currency: currencyProp, requests = [], products = [], trackingTemplate, returnDays = 30, now, onBack, onReorder, onOpenCart, onReturn, onCancelReturn, labels, className }: StoreAccountOrderProps) {
  const currency = useCurrency(currencyProp);
  const { t, ar } = useStoreAccountStrings(labels);
  const [notice, setNotice] = useState<ReorderPlan | null>(null);
  const clock = useMemo(() => now ?? Date.now(), [now]);
  const mine = requests.filter((r) => r.orderId === order.id);
  const delivered = deliveredAt(order);
  const win = returnWindow(delivered, returnDays, clock);
  const anyReturnable = returnableLines(order, requests).some((r) => r.returnable > 0);
  const canReturn = win.open && anyReturnable && !!onReturn;
  const lang = ar ? "ar" : "en";

  const reorder = () => {
    const plan = reorderPlan(order, products);
    setNotice(plan);
    if (plan.add.length) onReorder?.(order, plan);
  };

  return (
    <div data-slot="store-account-order" className={cn("flex min-w-0 flex-col gap-5", className)}>
      {onBack ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
          <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
          {t.backToOrders}
        </Button>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-h3 font-semibold">
            {t.order} <bdi>{order.number}</bdi>
          </h2>
          <span className="text-body-sm text-muted-foreground">
            {t.placedOn} <DateTime value={order.placedAt} format={{ dateStyle: "long" }} />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status][lang]}</Badge>
          <Button size="sm" variant="secondary" onClick={reorder}>
            <RotateCcw aria-hidden />
            {t.orderAgain}
          </Button>
          {canReturn ? (
            <Button size="sm" variant="secondary" onClick={() => onReturn?.(order)}>
              <Undo2 aria-hidden />
              {t.returnItems}
            </Button>
          ) : null}
        </div>
      </header>

      {notice ? <ReorderNotice plan={notice} t={t} onOpenCart={onOpenCart} /> : null}

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h3 className="m-0 text-label font-semibold">{t.progress}</h3>
        <StoreOrderTimeline variant="tracking" status={order.status} payment={order.payment} placedAt={order.placedAt} events={order.events} tracking={order.tracking} trackingTemplate={trackingTemplate} />
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h3 className="m-0 text-label font-semibold">{t.itemsOrdered}</h3>
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {order.lines.map((line) => {
            const shipped = lineFulfilled(line);
            const refunded = lineRefunded(line);
            return (
              <li key={line.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                  {line.image ? <img src={line.image} alt="" className="size-full object-cover" /> : <Package aria-hidden className="size-6 text-muted-foreground" />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{line.name}</span>
                  {line.variantLabel ? <span className="truncate text-body-sm text-muted-foreground">{line.variantLabel}</span> : null}
                  <span className="flex flex-wrap gap-1">
                    {shipped > 0 && shipped < line.quantity ? <Badge variant="info">{t.shippedQty(shipped)}</Badge> : null}
                    {refunded > 0 ? <Badge variant="neutral">{t.refundedQty(refunded)}</Badge> : null}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end text-body-sm">
                  <StoreMoney amount={line.unitPrice * line.quantity} currency={currency} className="font-medium" />
                  <span className="text-muted-foreground">
                    {t.quantity} <Num value={line.quantity} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-border pt-3 text-body-sm">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="m-0 text-end">
            <StoreMoney amount={order.totals.subtotal} currency={currency} />
          </dd>
          {order.totals.discount > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.discount}</dt>
              <dd className="m-0 text-end">
                <StoreMoney amount={order.totals.discount} currency={currency} negative />
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t.shipping}</dt>
          <dd className="m-0 text-end">{order.totals.shipping > 0 ? <StoreMoney amount={order.totals.shipping} currency={currency} /> : t.free}</dd>
          {order.totals.tax > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.tax}</dt>
              <dd className="m-0 text-end">
                <StoreMoney amount={order.totals.tax} currency={currency} />
              </dd>
            </>
          ) : null}
          <dt className="font-semibold">{t.paid}</dt>
          <dd className="m-0 text-end font-semibold">
            <StoreMoney amount={order.totals.total} currency={currency} />
          </dd>
        </dl>
      </section>

      {order.shippingAddress ? (
        <section className="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-body-sm">
          <h3 className="m-0 mb-1 text-label font-semibold">{t.shippingAddress}</h3>
          <address className="flex flex-col not-italic">
            <span className="font-medium">{order.shippingAddress.name}</span>
            <span>{order.shippingAddress.line1}</span>
            {order.shippingAddress.line2 ? <span>{order.shippingAddress.line2}</span> : null}
            <span>{[order.shippingAddress.region, order.shippingAddress.city].filter(Boolean).join(ar ? "، " : ", ")}</span>
            {order.shippingAddress.phone ? (
              <bdi dir="ltr" className="text-start text-muted-foreground">
                {order.shippingAddress.phone}
              </bdi>
            ) : null}
          </address>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-label font-semibold">{t.returnsTitle}</h3>
          <span className="text-body-sm text-muted-foreground">
            {!delivered ? t.returnNotYet : win.open ? t.returnDaysLeft(win.daysLeft) : t.returnClosed}
          </span>
        </div>
        {mine.length === 0 ? (
          <p className="m-0 text-body-sm text-muted-foreground">{t.noReturnsYet}</p>
        ) : (
          mine.map((r) => <StoreReturnStatus key={r.id} request={r} order={order} currency={currency} onCancel={onCancelReturn} labels={labels} />)
        )}
      </section>
    </div>
  );
}
