"use client";

import { Ban, Check, CircleDollarSign, ExternalLink, PackageCheck, PackageOpen, ShoppingBag, StickyNote, Truck, Undo2, Wallet } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "../../lib/commerce";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button, buttonVariants } from "../button";
import { Textarea } from "../field";
import { DateTime } from "../numeric";
import { Timeline, TimelineItem } from "../timeline";
import {
  type StoreActivityKind,
  type TrackingStepKey,
  type TrackingStepState,
  activityKind,
  sortEventsNewestFirst,
  trackingModel,
  trackingUrl,
} from "./timeline-model";

export {
  TRACKING_STEPS,
  activityKind,
  sortEventsNewestFirst,
  trackingModel,
  trackingUrl,
  type StoreActivityKind,
  type TrackingInput,
  type TrackingModel,
  type TrackingStep,
  type TrackingStepKey,
  type TrackingStepState,
  type TrackingTerminal,
} from "./timeline-model";
export {
  FULFILMENT_LABEL,
  FULFILMENT_VARIANT,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  PAYMENT_LABEL,
  PAYMENT_VARIANT,
  type OrderChipVariant,
} from "./order-labels";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    tracking: "Order progress",
    placed: "Order placed",
    paid: "Payment confirmed",
    confirmed: "Order confirmed",
    shipped: "Shipped",
    "out-for-delivery": "Out for delivery",
    delivered: "Delivered",
    done: "Done",
    current: "In progress",
    upcoming: "Next",
    skipped: "Did not happen",
    partlyShipped: "Part of this order has shipped",
    cancelled: "Order cancelled",
    refunded: "Order refunded",
    returned: "Order returned",
    "partially-refunded": "Partly refunded",
    trackShipment: "Track shipment",
    carrier: "Carrier",
    trackingNumber: "Tracking number",
    activity: "Activity",
    noActivity: "Nothing has happened to this order yet.",
    addNote: "Add a note",
    notePlaceholder: "Only your team can see notes.",
    saveNote: "Add note",
    internal: "Internal",
    by: "by",
    cod: "Pay the courier when it arrives",
  },
  ar: {
    tracking: "تقدّم الطلب",
    placed: "تم إنشاء الطلب",
    paid: "تأكيد الدفع",
    confirmed: "تأكيد الطلب",
    shipped: "تم الشحن",
    "out-for-delivery": "في الطريق إليك",
    delivered: "تم التسليم",
    done: "تمّ",
    current: "جارٍ الآن",
    upcoming: "التالي",
    skipped: "لم يحدث",
    partlyShipped: "تم شحن جزء من هذا الطلب",
    cancelled: "تم إلغاء الطلب",
    refunded: "تم استرداد الطلب",
    returned: "تم إرجاع الطلب",
    "partially-refunded": "استرداد جزئي",
    trackShipment: "تتبّع الشحنة",
    carrier: "شركة الشحن",
    trackingNumber: "رقم التتبع",
    activity: "النشاط",
    noActivity: "لم يحدث شيء لهذا الطلب بعد.",
    addNote: "أضف ملاحظة",
    notePlaceholder: "الملاحظات يراها فريقك فقط.",
    saveNote: "إضافة ملاحظة",
    internal: "داخلية",
    by: "بواسطة",
    cod: "ادفع للمندوب عند الوصول",
  },
} as const;

type Strings = { [K in keyof (typeof STRINGS)["en"]]: string };
export type StoreOrderTimelineLabels = Partial<Strings>;

export function useStoreTimelineStrings(labels?: StoreOrderTimelineLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

/* ------------------------------------------------------------------ tracking */

const STEP_ICON: Record<TrackingStepKey, typeof Check> = {
  placed: ShoppingBag,
  paid: CircleDollarSign,
  shipped: PackageOpen,
  "out-for-delivery": Truck,
  delivered: PackageCheck,
};

const BAR: Record<TrackingStepState, string> = {
  done: "border-primary",
  current: "border-primary/50",
  upcoming: "border-border",
  skipped: "border-dashed border-border",
};

export interface StoreOrderTimelineProps {
  /** "tracking" is the customer's five-step progress. "activity" is the admin's event log with notes. */
  variant?: "tracking" | "activity";
  status: CommerceOrderStatus;
  payment?: CommercePaymentStatus;
  placedAt?: string;
  events?: readonly CommerceOrderEvent[];
  tracking?: { carrier: string; number: string; url?: string };
  /** Carrier link template with `{number}`, used when the tracking has no `url` of its own. */
  trackingTemplate?: string;
  /** Activity variant: shows the note composer and calls this with the note text. */
  onAddNote?: (note: string) => void;
  labels?: StoreOrderTimelineLabels;
  className?: string;
}

/**
 * The order status timeline that the customer account and the store admin share.
 * `tracking` draws placed, paid, shipped, out for delivery and delivered, with the time each happened and a carrier link.
 * `activity` lists every event newest first and takes internal notes.
 */
export function StoreOrderTimeline({ variant = "tracking", ...props }: StoreOrderTimelineProps) {
  return variant === "activity" ? <ActivityLog {...props} /> : <TrackingSteps {...props} />;
}

function TrackingSteps({ status, payment, placedAt, events, tracking, trackingTemplate, labels, className }: StoreOrderTimelineProps) {
  const { t } = useStoreTimelineStrings(labels);
  const model = trackingModel({ status, payment, placedAt, events, hasTracking: !!tracking });
  const url = trackingUrl(tracking, trackingTemplate);
  const cod = payment === "cod";
  return (
    <section data-slot="store-order-timeline" data-variant="tracking" aria-label={t.tracking} className={cn("flex flex-col gap-4", className)}>
      {model.terminal ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
          {model.terminal.kind === "cancelled" ? <Ban aria-hidden className="size-4 text-muted-foreground" /> : <Undo2 aria-hidden className="size-4 text-muted-foreground" />}
          <span className="font-medium">{t[model.terminal.kind]}</span>
          {model.terminal.at ? <DateTime value={model.terminal.at} format={{ dateStyle: "medium" }} className="text-muted-foreground" /> : null}
        </div>
      ) : null}
      {model.partial ? <Badge variant="info" className="w-fit">{t.partlyShipped}</Badge> : null}
      <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-5" aria-label={t.tracking} data-percent={model.percent}>
        {model.steps.map((step) => {
          const Icon = step.key === "paid" && cod ? Wallet : STEP_ICON[step.key];
          const name = step.key === "paid" && cod ? t.confirmed : t[step.key];
          return (
            <li
              key={step.key}
              data-state={step.state}
              aria-current={step.state === "current" ? "step" : undefined}
              className={cn("flex min-w-0 flex-col gap-1 border-s-4 ps-3 sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-3", BAR[step.state])}
            >
              <span className={cn("flex items-center gap-1.5 text-body-sm font-medium", step.state === "upcoming" || step.state === "skipped" ? "text-muted-foreground" : "text-foreground")}>
                {step.state === "done" ? <Check aria-hidden className="size-4 text-primary" /> : <Icon aria-hidden className="size-4" />}
                <span className="min-w-0">{name}</span>
              </span>
              <span className="text-caption text-muted-foreground">
                {step.at ? <DateTime value={step.at} format={{ dateStyle: "medium", timeStyle: "short" }} /> : t[step.state]}
              </span>
            </li>
          );
        })}
      </ol>
      {cod && model.reached < 4 && !model.terminal ? <p className="text-body-sm text-muted-foreground">{t.cod}</p> : null}
      {tracking ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
          <span className="text-muted-foreground">
            {t.carrier}: <span className="text-foreground">{tracking.carrier}</span>
          </span>
          <span className="text-muted-foreground">
            {t.trackingNumber}: <bdi dir="ltr" className="font-mono text-foreground">{tracking.number}</bdi>
          </span>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              {t.trackShipment}
              <ExternalLink aria-hidden className="rtl:-scale-x-100" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const KIND_ICON: Record<StoreActivityKind, typeof Check> = {
  placed: ShoppingBag,
  payment: CircleDollarSign,
  shipment: Truck,
  delivery: PackageCheck,
  refund: Undo2,
  cancel: Ban,
  note: StickyNote,
  other: Check,
};

function ActivityLog({ events, onAddNote, labels, className }: StoreOrderTimelineProps) {
  const { t } = useStoreTimelineStrings(labels);
  const [note, setNote] = useState("");
  const sorted = sortEventsNewestFirst(events ?? []);
  const submit = () => {
    const text = note.trim();
    if (!text) return;
    onAddNote?.(text);
    setNote("");
  };
  let composer: ReactNode = null;
  if (onAddNote) {
    composer = (
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Textarea aria-label={t.addNote} placeholder={t.notePlaceholder} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()} className="self-end">
          {t.saveNote}
        </Button>
      </form>
    );
  }
  return (
    <section data-slot="store-order-timeline" data-variant="activity" aria-label={t.activity} className={cn("flex flex-col gap-4", className)}>
      {composer}
      {sorted.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t.noActivity}</p>
      ) : (
        <Timeline>
          {sorted.map((event, i) => {
            const Icon = KIND_ICON[activityKind(event.kind)];
            return (
              <TimelineItem
                key={`${event.at}-${event.kind}-${i}`}
                icon={<Icon aria-hidden />}
                title={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {event.label}
                    {event.kind === "note" ? <Badge variant="neutral">{t.internal}</Badge> : null}
                  </span>
                }
                description={event.note ?? (event.by ? `${t.by} ${event.by}` : undefined)}
                time={event.at}
              />
            );
          })}
        </Timeline>
      )}
    </section>
  );
}
