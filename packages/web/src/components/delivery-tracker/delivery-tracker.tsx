"use client";

import { Ban, Bike, Check, CircleAlert, ClipboardList, MessageCircle, PackageCheck, Phone, UserCheck, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { DELIVERY_STEPS, deliveryDuration, deliveryProgress, type DeliveryOrderStatus, type DeliveryStep } from "../../lib/delivery";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { formatDate } from "../numeric";

const STRINGS = {
  en: {
    title: "Order tracking",
    order: "Order",
    placed: "Order placed",
    assigned: "Courier assigned",
    "picked-up": "Picked up",
    "on-the-way": "On the way",
    delivered: "Delivered",
    cancelled: "Order cancelled",
    failed: "Delivery failed",
    arrivingIn: "Arriving in",
    eta: "Estimated arrival",
    delivering: "Delivered",
    courier: "Your courier",
    call: "Call",
    message: "Message",
    reason: "Reason",
    steps: "Delivery progress",
    done: "done",
    current: "current step",
    stopped: "stopped here",
    pending: "not yet",
  },
  ar: {
    title: "تتبّع الطلب",
    order: "الطلب",
    placed: "تم استلام الطلب",
    assigned: "تم تعيين السائق",
    "picked-up": "تم استلام الطلب من المتجر",
    "on-the-way": "في الطريق إليك",
    delivered: "تم التوصيل",
    cancelled: "أُلغي الطلب",
    failed: "تعذّر التوصيل",
    arrivingIn: "يصل خلال",
    eta: "الوصول المتوقع",
    delivering: "تم التوصيل",
    courier: "سائقك",
    call: "اتصال",
    message: "رسالة",
    reason: "السبب",
    steps: "مراحل التوصيل",
    done: "تم",
    current: "المرحلة الحالية",
    stopped: "توقف هنا",
    pending: "لم يحدث بعد",
  },
};
export type DeliveryTrackerLabels = Partial<(typeof STRINGS)["en"]>;

const STEP_ICON: Record<DeliveryStep, LucideIcon> = {
  placed: ClipboardList,
  assigned: UserCheck,
  "picked-up": PackageCheck,
  "on-the-way": Bike,
  delivered: Check,
};

export interface DeliveryCourier {
  name: string;
  nameAr?: string;
  avatarSrc?: string;
  /** "Motorbike, plate 42-318-77". Free text, already localised. */
  vehicle?: string;
  phone?: string;
}

export type DeliveryTrackerTimes = Partial<Record<DeliveryStep, Date | string | number>>;

export interface DeliveryTrackerProps extends Omit<ComponentProps<"section">, "children"> {
  status: DeliveryOrderStatus;
  /** For a cancelled or failed order: the last step it reached before it stopped. Default "placed". */
  reachedBefore?: DeliveryStep;
  /** When each step happened. Steps without a time show none. */
  times?: DeliveryTrackerTimes;
  /** Order reference shown in the header ("1042"). */
  orderNumber?: string;
  /** Seconds until arrival, from the routing service. Shown while the order is on its way. */
  etaSeconds?: number;
  /** The arrival time, if you have a fixed promise instead of a live ETA. */
  etaAt?: Date | string | number;
  courier?: DeliveryCourier;
  /** Called with the courier's phone when Call is pressed. Without it, a tel: link is used when `courier.phone` is set. */
  onCall?: () => void;
  onMessage?: () => void;
  /** Why the order was cancelled or failed. Shown in the terminal notice. */
  reason?: string;
  reasonAr?: string;
  /** Slot for the live map: pass a `MapView` here. */
  map?: ReactNode;
  locale?: string;
  labels?: DeliveryTrackerLabels;
}

/**
 * Customer-facing delivery progress: placed, courier assigned, picked up, on the way, delivered. Shows the ETA and the
 * courier while the order is moving, and a clear stopped state with the reason when it is cancelled or fails. A map
 * can be placed under the steps. No colour-only states: each step has an icon, a word and a state word for screen readers.
 */
export function DeliveryTracker({
  status,
  reachedBefore,
  times,
  orderNumber,
  etaSeconds,
  etaAt,
  courier,
  onCall,
  onMessage,
  reason,
  reasonAr,
  map,
  locale: localeProp,
  labels,
  className,
  ...props
}: DeliveryTrackerProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const progress = deliveryProgress(status, reachedBefore);
  const terminal = progress.terminal;
  const moving = status === "on-the-way" || status === "picked-up";
  const delivered = status === "delivered";
  const showCourier = courier && (status === "assigned" || moving);
  const stateWord = { done: t.done, current: t.current, stopped: t.stopped, upcoming: t.pending };
  const time = (v: Date | string | number | undefined) => (v === undefined ? null : formatDate(v, locale, { hour: "numeric", minute: "2-digit" }));
  const headline = terminal ? t[terminal] : delivered ? t.delivered : t[status as DeliveryStep];
  const tone = terminal === "cancelled" ? "danger" : terminal === "failed" ? "danger" : delivered ? "success" : "brand";
  const courierName = courier ? (ar ? courier.nameAr || courier.name : courier.name) : "";
  const tel = courier?.phone ? `tel:${courier.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <section
      data-slot="delivery-tracker"
      data-status={status}
      aria-label={t.title}
      className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5", className)}
      {...props}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {orderNumber ? (
            <span className="text-caption text-muted-foreground">
              {t.order} <bdi dir="ltr" className="tabular-nums">{orderNumber}</bdi>
            </span>
          ) : null}
          <h2 className="text-h3 text-foreground">{headline}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={tone}>{headline}</Badge>
          {moving && etaSeconds !== undefined ? (
            <span data-slot="delivery-eta" className="text-body-sm text-foreground">
              {t.arrivingIn} <bdi className="tabular-nums font-medium">{deliveryDuration(etaSeconds, locale)}</bdi>
            </span>
          ) : moving && etaAt !== undefined ? (
            <span data-slot="delivery-eta" className="text-body-sm text-foreground">
              {t.eta} <bdi className="tabular-nums font-medium">{time(etaAt)}</bdi>
            </span>
          ) : null}
        </div>
      </header>

      {terminal ? (
        <div role="alert" data-slot="delivery-terminal" className="flex items-start gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
          {terminal === "cancelled" ? <Ban aria-hidden className="mt-0.5 size-4 shrink-0" /> : <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{t[terminal]}</span>
            {reason || reasonAr ? (
              <span>
                {t.reason}: <bdi dir="auto">{ar ? reasonAr || reason : reason || reasonAr}</bdi>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <ol role="list" aria-label={t.steps} data-slot="delivery-steps" className="flex flex-col">
        {progress.steps.map((step, i) => {
          const Icon = step.state === "stopped" ? Ban : STEP_ICON[step.key];
          const last = i === DELIVERY_STEPS.length - 1;
          const when = time(times?.[step.key]);
          const nextDone = progress.steps[i + 1]?.state === "done" || progress.steps[i + 1]?.state === "current";
          return (
            <li key={step.key} data-step={step.key} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4",
                    step.state === "done" && "border-primary bg-primary text-primary-foreground",
                    step.state === "current" && "border-primary bg-card text-primary ring-4 ring-primary/20",
                    step.state === "upcoming" && "border-nq-line-strong bg-card text-muted-foreground",
                    step.state === "stopped" && "border-nq-danger bg-nq-danger-soft text-nq-danger-text",
                  )}
                >
                  {step.state === "done" ? <Check aria-hidden /> : <Icon aria-hidden />}
                </span>
                {!last ? <span aria-hidden className={cn("my-1 min-h-6 w-0.5 flex-1 rounded-full", nextDone && step.state === "done" ? "bg-primary" : "bg-nq-line")} /> : null}
              </span>
              <div className={cn("flex min-w-0 flex-1 flex-col pb-4 pt-1", last && "pb-0")}>
                <span className={cn("text-label", step.state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {t[step.key]}
                  <span className="sr-only">
                    {" "}
                    ({stateWord[step.state]})
                  </span>
                </span>
                {when ? <bdi className="text-caption tabular-nums text-muted-foreground">{when}</bdi> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {showCourier ? (
        <div data-slot="delivery-courier" className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-secondary p-3">
          <Avatar name={courierName} src={courier.avatarSrc} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption text-muted-foreground">{t.courier}</span>
            <bdi dir="auto" className="truncate text-label text-foreground">
              {courierName}
            </bdi>
            {courier.vehicle ? (
              <bdi dir="auto" className="truncate text-body-sm text-muted-foreground">
                {courier.vehicle}
              </bdi>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {onMessage ? (
              <Button type="button" variant="secondary" size="sm" onClick={onMessage}>
                <MessageCircle aria-hidden />
                {t.message}
              </Button>
            ) : null}
            {onCall ? (
              <Button type="button" variant="secondary" size="sm" onClick={onCall}>
                <Phone aria-hidden />
                {t.call}
              </Button>
            ) : tel ? (
              <Button variant="secondary" size="sm" nativeButton={false} render={<a href={tel} />}>
                <Phone aria-hidden />
                {t.call}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {map ? <div data-slot="delivery-map">{map}</div> : null}
    </section>
  );
}
