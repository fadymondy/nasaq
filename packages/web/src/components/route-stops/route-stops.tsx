"use client";

import { Ban, Check, HandCoins, MapPin, Navigation, SkipForward, Store } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { DELIVERY_DEFAULT_CURRENCY, deliveryMoney, routeSummary, type DeliveryMoney, type StopKind, type StopStatus } from "../../lib/delivery";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { formatDate } from "../numeric";

const STRINGS = {
  en: {
    stops: "Trip stops",
    pickup: "Pick up",
    dropoff: "Drop off",
    done: "Done",
    pending: "Pending",
    failed: "Failed",
    skipped: "Skipped",
    next: "Next stop",
    progress: (done: number, total: number) => `${done} of ${total} stops done`,
    cashPending: "Cash to collect",
    cashCollected: "Collected",
    cash: "Cash",
    order: "Order",
    arrive: "Arrive",
  },
  ar: {
    stops: "محطات الرحلة",
    pickup: "استلام",
    dropoff: "تسليم",
    done: "تمّت",
    pending: "قيد الانتظار",
    failed: "فشلت",
    skipped: "تم تخطيها",
    next: "المحطة التالية",
    progress: (done: number, total: number) => `تمّت ${done} من ${total} محطات`,
    cashPending: "نقد مطلوب تحصيله",
    cashCollected: "تم تحصيله",
    cash: "نقد",
    order: "الطلب",
    arrive: "الوصول",
  },
};
export type RouteStopsLabels = Partial<(typeof STRINGS)["en"]>;

export interface RouteStop {
  id: string;
  kind: StopKind;
  /** Vendor for a pickup, customer for a drop-off. */
  name: string;
  nameAr?: string;
  address?: string;
  addressAr?: string;
  /** Default "pending". The first pending stop is the current one. */
  status?: StopStatus;
  /** Order reference ("1042"). */
  orderRef?: string;
  /** Cash to collect at this stop, in minor units (order total plus delivery fee for a cash-on-delivery drop-off). */
  cashMinor?: DeliveryMoney;
  /** Expected arrival. */
  eta?: Date | string | number;
  note?: string;
  noteAr?: string;
}

export interface RouteStopsProps extends Omit<ComponentProps<"section">, "children" | "onSelect"> {
  stops: readonly RouteStop[];
  currency?: string;
  /** Called when a stop row is pressed. Makes each row a button. */
  onSelectStop?: (stop: RouteStop) => void;
  /** Actions under a stop, for example Navigate and Mark delivered. Shown for the current stop only unless `actionsForAll` is set. */
  renderActions?: (stop: RouteStop, state: { current: boolean }) => ReactNode;
  actionsForAll?: boolean;
  /** Hide the progress and cash summary above the list. */
  hideSummary?: boolean;
  locale?: string;
  labels?: RouteStopsLabels;
}

const pick = (en: string | undefined, ar: string | undefined, isAr: boolean) => (isAr ? ar || en : en || ar) ?? "";

/**
 * A multi-stop trip as an ordered list: pickups and drop-offs, each done, current or pending, with the cash to
 * collect at every drop-off and a total of what is still owed. The first pending stop is marked as the next one.
 */
export function RouteStops({
  stops,
  currency = DELIVERY_DEFAULT_CURRENCY,
  onSelectStop,
  renderActions,
  actionsForAll = false,
  hideSummary = false,
  locale: localeProp,
  labels,
  className,
  ...props
}: RouteStopsProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const summary = routeSummary(stops);
  const statusWord: Record<StopStatus, string> = { done: t.done, pending: t.pending, failed: t.failed, skipped: t.skipped };

  return (
    <section data-slot="route-stops" aria-label={t.stops} className={cn("flex flex-col gap-3", className)} {...props}>
      {!hideSummary ? (
        <header data-slot="route-summary" className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
          <span className="text-foreground">{t.progress(summary.done, summary.total)}</span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            {summary.cashPendingMinor > 0 ? (
              <span className="inline-flex items-center gap-1">
                <HandCoins aria-hidden className="size-4" />
                {t.cashPending}
                <bdi data-slot="route-cash-pending" className="font-medium tabular-nums text-foreground">
                  {deliveryMoney(summary.cashPendingMinor, currency, locale)}
                </bdi>
              </span>
            ) : null}
            {summary.cashCollectedMinor > 0 ? (
              <span className="inline-flex items-center gap-1">
                {t.cashCollected}
                <bdi className="tabular-nums text-foreground">{deliveryMoney(summary.cashCollectedMinor, currency, locale)}</bdi>
              </span>
            ) : null}
          </span>
        </header>
      ) : null}

      <ol role="list" className="flex flex-col">
        {stops.map((stop, i) => {
          const status = stop.status ?? "pending";
          const current = stop.id === summary.currentId;
          const KindIcon = stop.kind === "pickup" ? Store : MapPin;
          const StateIcon = status === "done" ? Check : status === "failed" ? Ban : status === "skipped" ? SkipForward : current ? Navigation : KindIcon;
          const last = i === stops.length - 1;
          const address = pick(stop.address, stop.addressAr, ar);
          const note = pick(stop.note, stop.noteAr, ar);
          const actions = renderActions && (current || actionsForAll) ? renderActions(stop, { current }) : null;
          const row = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-caption text-muted-foreground">{stop.kind === "pickup" ? t.pickup : t.dropoff}</span>
                  {stop.orderRef ? (
                    <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">
                      {stop.orderRef}
                    </bdi>
                  ) : null}
                  {current ? <Badge variant="brand">{t.next}</Badge> : status !== "pending" ? <Badge variant={status === "done" ? "success" : status === "failed" ? "danger" : "neutral"}>{statusWord[status]}</Badge> : null}
                </span>
                <bdi dir="auto" className={cn("truncate text-label", status === "done" || status === "skipped" ? "text-muted-foreground" : "text-foreground")}>
                  {pick(stop.name, stop.nameAr, ar)}
                </bdi>
                {address ? (
                  <bdi dir="auto" className="text-body-sm text-muted-foreground">
                    {address}
                  </bdi>
                ) : null}
                {note ? (
                  <bdi dir="auto" className="text-caption text-muted-foreground">
                    {note}
                  </bdi>
                ) : null}
                {stop.eta !== undefined && status === "pending" ? (
                  <span className="text-caption text-muted-foreground">
                    {t.arrive} <bdi className="tabular-nums">{formatDate(stop.eta, locale, { hour: "numeric", minute: "2-digit" })}</bdi>
                  </span>
                ) : null}
              </span>
              {stop.cashMinor ? (
                <span data-slot="stop-cash" className="flex shrink-0 flex-col items-end">
                  <span className="text-caption text-muted-foreground">{t.cash}</span>
                  <bdi className={cn("text-label tabular-nums", status === "done" ? "text-muted-foreground" : "text-foreground")}>{deliveryMoney(stop.cashMinor, currency, locale)}</bdi>
                </span>
              ) : null}
            </>
          );
          return (
            <li key={stop.id} data-stop={stop.id} data-kind={stop.kind} data-status={status} data-current={current || undefined} aria-current={current ? "step" : undefined} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4",
                    status === "done" && "border-primary bg-primary text-primary-foreground",
                    current && "border-primary bg-card text-primary ring-4 ring-primary/20",
                    !current && status === "pending" && "border-nq-line-strong bg-card text-muted-foreground",
                    status === "failed" && "border-nq-danger bg-nq-danger-soft text-nq-danger-text",
                    status === "skipped" && "border-nq-line-strong bg-secondary text-muted-foreground",
                  )}
                >
                  <StateIcon aria-hidden />
                </span>
                {!last ? <span aria-hidden className={cn("my-1 min-h-4 w-0.5 flex-1 rounded-full", status === "done" ? "bg-primary" : "bg-nq-line")} /> : null}
              </span>
              <div className={cn("flex min-w-0 flex-1 flex-col gap-2 pt-0.5", !last && "pb-4")}>
                {onSelectStop ? (
                  <button
                    type="button"
                    onClick={() => onSelectStop(stop)}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-start gap-3">{row}</div>
                )}
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
