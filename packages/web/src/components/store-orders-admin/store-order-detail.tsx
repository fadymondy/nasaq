"use client";

import { ArrowLeft, Ban, FileText, Mail, MapPin, PackageCheck, Phone, Printer, Truck, Undo2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceAddress, CommerceOrder } from "../../lib/commerce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { StoreOrderTimeline } from "../store-order-timeline";
import { Switch } from "../switch";
import { ToggleGroup, Toggle } from "../toggle-group";
import { Alert } from "../alert";
import { useStoreAdminStrings, type StoreAdminLabels } from "./admin-strings";
import { StoreMoney, storeMinorToMajor } from "./money";
import {
  type ApplyMeta,
  type FulfilmentPlan,
  type LinePick,
  type RefundPlan,
  type RefundRecord,
  type Restock,
  applyCancel,
  applyFulfilment,
  applyNote,
  applyRefund,
  canCancel,
  canRefund,
  fulfilmentProgress,
  lineFulfilled,
  lineOutstanding,
  lineRefundable,
  lineRefunded,
  paymentSummary,
  planCancel,
  planFulfilment,
  planRefund,
  refundRemaining,
  shippingRefunded,
} from "./order-math";
import { StoreFulfilmentBadge, StoreOrderStatusBadge, StorePaymentBadge, type StoreOrderDocumentKind } from "./store-orders-list";
import { commerceMinorFactor as storeMinorFactor } from "../../lib/commerce";

export interface StoreOrderChange {
  order: CommerceOrder;
  refunds: RefundRecord[];
  /** Units going back on the shelf because of a refund or a cancel. Update your stock with this. */
  restock?: Restock[];
}

export interface StoreOrderDetailProps {
  order: CommerceOrder;
  /** Refunds already made, oldest first. */
  refunds?: readonly RefundRecord[];
  currency: string;
  /** Called with the updated order after a shipment, refund, cancel or note. You store it. */
  onChange?: (change: StoreOrderChange) => void;
  onBack?: () => void;
  onPrint?: (document: StoreOrderDocumentKind) => void;
  /** Who is acting, written on the timeline. */
  actor?: string;
  /** Carriers offered when shipping. */
  carriers?: readonly string[];
  trackingTemplate?: string;
  /** Timestamp source for new events. Default: now. */
  now?: () => string;
  labels?: StoreAdminLabels;
  className?: string;
}

const DEFAULT_CARRIERS = ["Bosta", "Aramex", "DHL", "Egypt Post"];

function AddressBlock({ address, fallback }: { address?: CommerceAddress; fallback: string }) {
  if (!address) return <p className="text-body-sm text-muted-foreground">{fallback}</p>;
  return (
    <address className="flex flex-col text-body-sm not-italic text-foreground">
      <span className="font-medium">{address.name}</span>
      <span>{address.line1}</span>
      {address.line2 ? <span>{address.line2}</span> : null}
      <span>{[address.region, address.city].filter(Boolean).join(", ")}</span>
      {address.postalCode ? <bdi dir="ltr" className="text-start">{address.postalCode}</bdi> : null}
      {address.phone ? <bdi dir="ltr" className="text-start text-muted-foreground">{address.phone}</bdi> : null}
    </address>
  );
}

function InfoCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle as="h3">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

/** A number box for a per-line quantity, with its ceiling shown. */
function QtyField({ label, value, max, onChange, invalid }: { label: string; value: number; max: number; onChange: (n: number) => void; invalid?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={value}
        disabled={max === 0}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        className="w-20"
        ltr
      />
      <span className="text-caption text-muted-foreground">/ <Num value={max} /></span>
    </div>
  );
}

/**
 * One order in the store admin: its lines and money, customer, address and payment cards, and the actions that change
 * it: ship some or all of it with tracking, refund by line or by amount (with a restock switch), cancel, and add notes to
 * the timeline. Every change goes through the pure `order-math` module, and `onChange` gets the updated order.
 */
export function StoreOrderDetail({
  order,
  refunds = [],
  currency,
  onChange,
  onBack,
  onPrint,
  actor,
  carriers = DEFAULT_CARRIERS,
  trackingTemplate,
  now = () => new Date().toISOString(),
  labels,
  className,
}: StoreOrderDetailProps) {
  const { t } = useStoreAdminStrings(labels);
  const [dialog, setDialog] = useState<"fulfil" | "refund" | "cancel" | null>(null);
  const summary = paymentSummary(order, refunds);
  const progress = fulfilmentProgress(order.lines);
  const cancellable = canCancel(order);
  const refundable = canRefund(order, refunds);
  const shippable = order.lines.some((l) => lineOutstanding(l) > 0) && !["cancelled", "refunded", "returned"].includes(order.status) && order.payment !== "failed";
  const meta = (label: string, note?: string): ApplyMeta => ({ at: now(), label, ...(actor ? { by: actor } : {}), ...(note ? { note } : {}) });

  return (
    <div data-slot="store-order-detail" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ms-2 w-fit">
              <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              {t.backToOrders}
            </Button>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 font-semibold text-foreground">{order.number}</h1>
            <StoreOrderStatusBadge status={order.status} />
            <StorePaymentBadge payment={order.payment} />
            <StoreFulfilmentBadge order={order} />
          </div>
          <p className="text-body-sm text-muted-foreground">
            {t.placedOn} <DateTime value={order.placedAt} format={{ dateStyle: "long", timeStyle: "short" }} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onPrint?.("packing-slip")}>
            <Truck aria-hidden />
            {t.packingSlip}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onPrint?.("invoice")}>
            <Printer aria-hidden />
            {t.invoice}
          </Button>
          <Button variant="secondary" size="sm" disabled={!cancellable} onClick={() => setDialog("cancel")} title={cancellable ? undefined : t.cannotCancel}>
            <Ban aria-hidden />
            {t.cancelOrder}
          </Button>
          <Button variant="secondary" size="sm" disabled={!refundable} onClick={() => setDialog("refund")}>
            <Undo2 aria-hidden />
            {t.refund}
          </Button>
          <Button variant="primary" size="sm" disabled={!shippable} onClick={() => setDialog("fulfil")}>
            <PackageCheck aria-hidden />
            {t.fulfil}
          </Button>
        </div>
      </header>

      {order.payment === "pending" ? <Alert tone="warning" title={t.unpaidTitle}>{t.unpaidText}</Alert> : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.items}</CardTitle>
              <CardAction className="text-body-sm text-muted-foreground">{t.shippedOf(progress.shipped, progress.total)}</CardAction>
            </CardHeader>
            <CardContent className="flex flex-col">
              <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
                {order.lines.map((line) => {
                  const shipped = lineFulfilled(line);
                  const refunded = lineRefunded(line);
                  const waiting = lineOutstanding(line);
                  return (
                    <li key={line.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {line.image ? <img src={line.image} alt="" className="size-14 shrink-0 rounded-control border border-border bg-secondary object-cover" /> : <span aria-hidden className="size-14 shrink-0 rounded-control border border-border bg-secondary" />}
                      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                        <span className="truncate text-body-sm font-medium text-foreground">{line.name}</span>
                        {line.variantLabel ? <span className="text-caption text-muted-foreground">{line.variantLabel}</span> : null}
                        <span className="flex flex-wrap gap-1.5">
                          {shipped > 0 ? <Badge variant="success">{t.shippedCount(shipped)}</Badge> : null}
                          {waiting > 0 ? <Badge variant="warning">{t.toShipCount(waiting)}</Badge> : null}
                          {refunded > 0 ? <Badge variant="neutral">{t.refundedCount(refunded)}</Badge> : null}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2 text-body-sm text-muted-foreground">
                        <StoreMoney amount={line.unitPrice} currency={currency} />
                        <span aria-hidden>×</span>
                        <Num value={line.quantity} />
                      </div>
                      <StoreMoney amount={line.unitPrice * line.quantity} currency={currency} className="w-24 shrink-0 text-end text-body-sm font-medium text-foreground" />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.payment}</CardTitle>
              <CardAction>
                <StorePaymentBadge payment={order.payment} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-body-sm">
                <dt className="text-muted-foreground">{t.subtotal}</dt>
                <dd className="m-0 text-end"><StoreMoney amount={order.totals.subtotal} currency={currency} /></dd>
                {order.totals.discount > 0 ? (
                  <>
                    <dt className="text-muted-foreground">{t.discount}</dt>
                    <dd className="m-0 text-end"><StoreMoney amount={order.totals.discount} currency={currency} negative /></dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">{t.shipping}{order.shippingMethod ? ` (${order.shippingMethod.label})` : ""}</dt>
                <dd className="m-0 text-end">{order.totals.shipping > 0 ? <StoreMoney amount={order.totals.shipping} currency={currency} /> : t.free}</dd>
                {order.totals.tax > 0 ? (
                  <>
                    <dt className="text-muted-foreground">{t.tax}</dt>
                    <dd className="m-0 text-end"><StoreMoney amount={order.totals.tax} currency={currency} /></dd>
                  </>
                ) : null}
                <dt className="border-t border-border pt-2 font-medium text-foreground">{t.total}</dt>
                <dd className="m-0 border-t border-border pt-2 text-end font-semibold text-foreground"><StoreMoney amount={summary.total} currency={currency} /></dd>
                {summary.refunded > 0 ? (
                  <>
                    <dt className="text-muted-foreground">{t.refunded}</dt>
                    <dd className="m-0 text-end"><StoreMoney amount={summary.refunded} currency={currency} negative /></dd>
                    <dt className="font-medium text-foreground">{t.netPaid}</dt>
                    <dd className="m-0 text-end font-medium"><StoreMoney amount={summary.net} currency={currency} /></dd>
                  </>
                ) : null}
                {summary.due > 0 ? (
                  <>
                    <dt className="font-medium text-foreground">{t.due}</dt>
                    <dd className="m-0 text-end font-medium"><StoreMoney amount={summary.due} currency={currency} /></dd>
                  </>
                ) : null}
              </dl>
              {refunds.length ? (
                <ul className="m-0 mt-3 flex list-none flex-col gap-1 border-t border-border p-0 pt-3 text-caption text-muted-foreground">
                  {refunds.map((r, i) => (
                    <li key={r.id ?? i} className="flex flex-wrap justify-between gap-2">
                      <span>{r.at ? <DateTime value={r.at} format={{ dateStyle: "medium" }} /> : t.refunded}{r.note && r.note !== "cancel" ? ` · ${r.note}` : ""}{r.restock ? ` · ${t.restocked}` : ""}</span>
                      <StoreMoney amount={r.amount} currency={currency} negative />
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.timeline}</CardTitle>
            </CardHeader>
            <CardContent>
              <StoreOrderTimeline
                variant="activity"
                status={order.status}
                payment={order.payment}
                events={order.events}
                onAddNote={onChange ? (note) => onChange({ order: applyNote(order, meta(t.noteAdded, note)), refunds: [...refunds] }) : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <InfoCard title={t.customer}>
            <span className="text-body-sm font-medium text-foreground">{order.customer.name}</span>
            {order.customer.email ? (
              <a href={`mailto:${order.customer.email}`} dir="ltr" className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
                <Mail aria-hidden className="size-3.5" />
                <span className="text-start">{order.customer.email}</span>
              </a>
            ) : null}
            {order.customer.phone ? (
              <a href={`tel:${order.customer.phone}`} dir="ltr" className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
                <Phone aria-hidden className="size-3.5" />
                <span className="text-start">{order.customer.phone}</span>
              </a>
            ) : null}
          </InfoCard>
          <InfoCard title={t.shippingAddress}>
            <AddressBlock address={order.shippingAddress} fallback={t.noAddress} />
            {order.shippingMethod ? (
              <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <MapPin aria-hidden className="size-3.5" />
                {order.shippingMethod.label}
              </span>
            ) : null}
          </InfoCard>
          <InfoCard title={t.billingAddress}>
            <AddressBlock address={order.billingAddress} fallback={t.sameAsShipping} />
          </InfoCard>
          <InfoCard title={t.shipment}>
            {order.tracking ? (
              <>
                <span className="text-body-sm text-foreground">{order.tracking.carrier}</span>
                <bdi dir="ltr" className="text-start font-mono text-body-sm text-muted-foreground">{order.tracking.number}</bdi>
                {trackingTemplate || order.tracking.url ? (
                  <a href={order.tracking.url ?? trackingTemplate!.replace("{number}", encodeURIComponent(order.tracking.number))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-body-sm text-foreground underline underline-offset-4">
                    <FileText aria-hidden className="size-3.5" />
                    {t.trackShipment}
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.noTracking}</p>
            )}
          </InfoCard>
        </aside>
      </div>

      <FulfilDialog
        open={dialog === "fulfil"}
        onOpenChange={(o) => setDialog(o ? "fulfil" : null)}
        order={order}
        carriers={carriers}
        t={t}
        onConfirm={(plan, tracking) => {
          onChange?.({ order: applyFulfilment(order, plan, meta(plan.completes ? t.shippedAll : t.shippedSome, tracking ? `${tracking.carrier} ${tracking.number}` : undefined), tracking), refunds: [...refunds] });
          setDialog(null);
        }}
      />
      <RefundDialog
        open={dialog === "refund"}
        onOpenChange={(o) => setDialog(o ? "refund" : null)}
        order={order}
        refunds={refunds}
        currency={currency}
        t={t}
        onConfirm={(plan) => {
          const next = applyRefund(order, refunds, plan, meta(t.refundIssued));
          onChange?.({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
          setDialog(null);
        }}
      />
      <AlertDialog open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelTitle(order.number)}</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const plan = planCancel(order, refunds);
                return plan.refundAmount > 0 ? <>{t.cancelRefunds} <StoreMoney amount={plan.refundAmount} currency={currency} />.</> : t.cancelNoRefund;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.keepOrder}</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => {
                const plan = planCancel(order, refunds);
                const next = applyCancel(order, refunds, meta(t.cancelled));
                onChange?.({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
              }}
            >
              {t.cancelOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ fulfil */

type T = ReturnType<typeof useStoreAdminStrings>["t"];

function FulfilDialog({
  open,
  onOpenChange,
  order,
  carriers,
  t,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CommerceOrder;
  carriers: readonly string[];
  t: T;
  onConfirm: (plan: FulfilmentPlan, tracking?: { carrier: string; number: string }) => void;
}) {
  const start = () => Object.fromEntries(order.lines.map((l) => [l.id, lineOutstanding(l)]));
  const [qty, setQty] = useState<Record<string, number>>(start);
  const [carrier, setCarrier] = useState<string>(carriers[0] ?? "");
  const [number, setNumber] = useState("");
  const picks: LinePick[] = order.lines.map((l) => ({ lineId: l.id, quantity: qty[l.id] ?? 0 }));
  const plan = planFulfilment(order, { picks, carrier: number.trim() || carrier ? carrier : undefined, trackingNumber: number });
  // A tracking number is optional, but a carrier without a number is not a shipment we can track.
  const trackingIssue = !!carrier && !number.trim() && plan.issues.some((i) => i.code === "tracking-number");
  const blocking = plan.issues.filter((i) => i.code !== "tracking-number");
  const ok = blocking.length === 0 && picks.some((p) => p.quantity > 0);
  const shipment = number.trim() ? { carrier, number: number.trim() } : undefined;
  const effective = ok ? planFulfilment(order, { picks, ...(shipment ? { carrier: shipment.carrier, trackingNumber: shipment.number } : {}) }) : plan;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setQty(start());
          setNumber("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) onConfirm(effective, shipment);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.fulfilTitle}</DialogTitle>
            <DialogDescription>{t.fulfilText}</DialogDescription>
          </DialogHeader>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {order.lines.map((line) => {
              const max = lineOutstanding(line);
              const over = plan.issues.some((i) => i.code === "line-over" && i.lineId === line.id);
              return (
                <li key={line.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 basis-40 truncate text-body-sm text-foreground">{line.name}</span>
                  <QtyField label={`${t.quantity}: ${line.name}`} value={qty[line.id] ?? 0} max={max} invalid={over} onChange={(n) => setQty((q) => ({ ...q, [line.id]: Math.min(n, max) }))} />
                </li>
              );
            })}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.carrier}
              <Select items={carriers.map((c) => ({ value: c, label: c }))} value={carrier || null} onValueChange={(v) => setCarrier(v ? String(v) : "")}>
                <SelectTrigger aria-label={t.carrier}>
                  <SelectValue placeholder={t.carrier} />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.trackingNumber}
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="BST880124" ltr />
            </label>
          </div>
          {trackingIssue ? <p className="text-caption text-muted-foreground">{t.trackingOptional}</p> : null}
          <p aria-live="polite" className="text-body-sm text-muted-foreground">
            {ok ? (effective.completes ? t.willCompleteOrder : t.willPartlyShip) : t.pickUnits}
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!ok}>
              <PackageCheck aria-hidden />
              {t.markShipped}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ refund */

function RefundDialog({
  open,
  onOpenChange,
  order,
  refunds,
  currency,
  t,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CommerceOrder;
  refunds: readonly RefundRecord[];
  currency: string;
  t: T;
  onConfirm: (plan: RefundPlan) => void;
}) {
  const [mode, setMode] = useState<"lines" | "amount">("lines");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [includeShipping, setIncludeShipping] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const factor = storeMinorFactor(currency);
  const remaining = refundRemaining(order, refunds);
  const shippingAvailable = order.totals.shipping > 0 && !shippingRefunded(refunds);
  const amountMinor = Math.round(Number(amountText) * factor);
  const picks: LinePick[] = order.lines.map((l) => ({ lineId: l.id, quantity: qty[l.id] ?? 0 }));
  const plan = useMemo(
    () =>
      mode === "lines"
        ? planRefund(order, refunds, { mode, picks, includeShipping, restock, note })
        : planRefund(order, refunds, { mode, amount: Number.isFinite(amountMinor) ? amountMinor : 0, note }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, refunds, mode, qty, includeShipping, restock, note, amountMinor],
  );
  const touched = mode === "lines" ? picks.some((p) => p.quantity > 0) || includeShipping : amountText !== "";
  const problem = plan.issues.find((i) => i.code !== "empty");

  const reason = (): string | null => {
    if (!touched || !problem) return null;
    switch (problem.code) {
      case "amount-over":
        return t.refundOver(storeMinorToMajor(problem.max, currency));
      case "amount-invalid":
        return t.refundInvalid;
      case "line-over":
        return t.refundLineOver(problem.max);
      case "shipping-done":
        return t.shippingDone;
      case "unpaid":
        return t.refundUnpaid;
      default:
        return null;
    }
  };
  const message = reason();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setQty({});
          setIncludeShipping(false);
          setAmountText("");
          setNote("");
          setMode("lines");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (plan.ok) onConfirm(plan);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.refundTitle}</DialogTitle>
            <DialogDescription>
              {t.refundLeft} <StoreMoney amount={remaining} currency={currency} />
            </DialogDescription>
          </DialogHeader>
          <ToggleGroup aria-label={t.refundBy} value={[mode]} onValueChange={(v) => v[0] && setMode(v[0] as "lines" | "amount")} className="grid w-full grid-cols-2">
            <Toggle value="lines">{t.byLines}</Toggle>
            <Toggle value="amount">{t.byAmount}</Toggle>
          </ToggleGroup>

          {mode === "lines" ? (
            <>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {order.lines.map((line) => {
                  const max = lineRefundable(line);
                  const over = plan.issues.some((i) => i.code === "line-over" && i.lineId === line.id);
                  const value = plan.perLine.find((p) => p.lineId === line.id)?.amount;
                  return (
                    <li key={line.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 flex-1 basis-40 flex-col">
                        <span className="truncate text-body-sm text-foreground">{line.name}</span>
                        {value ? <StoreMoney amount={value} currency={currency} className="text-caption text-muted-foreground" /> : null}
                      </span>
                      <QtyField label={`${t.quantity}: ${line.name}`} value={qty[line.id] ?? 0} max={max} invalid={over} onChange={(n) => setQty((q) => ({ ...q, [line.id]: Math.min(n, max) }))} />
                    </li>
                  );
                })}
              </ul>
              <label className={cn("flex items-center justify-between gap-3 text-body-sm", !shippingAvailable && "opacity-60")}>
                <span className="text-foreground">
                  {t.refundShipping} {order.totals.shipping > 0 ? <StoreMoney amount={order.totals.shipping} currency={currency} className="text-muted-foreground" /> : null}
                </span>
                <Switch checked={includeShipping} disabled={!shippingAvailable} onCheckedChange={setIncludeShipping} aria-label={t.refundShipping} />
              </label>
              <label className="flex items-center justify-between gap-3 text-body-sm">
                <span className="flex flex-col">
                  <span className="text-foreground">{t.restock}</span>
                  <span className="text-caption text-muted-foreground">{t.restockText}</span>
                </span>
                <Switch checked={restock} onCheckedChange={setRestock} aria-label={t.restock} />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.refundAmount}
              <Input type="number" inputMode="decimal" min={0} step={1 / factor} value={amountText} onChange={(e) => setAmountText(e.target.value)} aria-invalid={!!message || undefined} ltr placeholder="0.00" />
              <span className="text-caption text-muted-foreground">{t.byAmountText}</span>
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-label text-foreground">
            {t.reason}
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.reasonPlaceholder} />
          </label>
          {message ? <p role="alert" className="text-body-sm text-nq-danger-text">{message}</p> : null}
          <p aria-live="polite" className="flex items-baseline justify-between gap-2 border-t border-border pt-3 text-body-sm">
            <span className="text-muted-foreground">{t.refundTotal}</span>
            <StoreMoney amount={plan.ok || !message ? plan.amount : 0} currency={currency} className="text-h3 font-semibold text-foreground" />
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!plan.ok}>
              <Undo2 aria-hidden />
              {t.issueRefund}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
