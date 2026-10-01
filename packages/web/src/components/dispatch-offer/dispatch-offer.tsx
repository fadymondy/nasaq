"use client";

import { Check, HandCoins, MapPin, Package, Store, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { DELIVERY_DEFAULT_CURRENCY, deliveryDistance, deliveryDuration, deliveryMoney, offerFraction, offerSecondsLeft, offerTone } from "../../lib/delivery";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { TimerRing, timerToneText } from "../countdown";

const STRINGS = {
  en: {
    title: "New delivery offer",
    pickup: "Pick up",
    dropoff: "Drop off",
    fee: "You earn",
    cash: "Cash to collect",
    distance: "Trip",
    eta: "To pickup",
    accept: "Accept",
    decline: "Decline",
    expired: "Offer expired",
    seconds: "s",
    secondsLeft: (n: number) => (n === 1 ? "1 second left to answer" : `${n} seconds left to answer`),
    stops: (n: number) => (n === 1 ? "1 order" : `${n} orders`),
  },
  ar: {
    title: "عرض توصيل جديد",
    pickup: "الاستلام",
    dropoff: "التسليم",
    fee: "ربحك",
    cash: "المبلغ المطلوب تحصيله",
    distance: "الرحلة",
    eta: "إلى الاستلام",
    accept: "قبول",
    decline: "رفض",
    expired: "انتهى العرض",
    seconds: "ث",
    secondsLeft: (n: number) => (n === 1 ? "بقيت ثانية واحدة للرد" : n === 2 ? "بقيت ثانيتان للرد" : n <= 10 ? `بقيت ${n} ثوانٍ للرد` : `بقيت ${n} ثانية للرد`),
    stops: (n: number) => (n === 1 ? "طلب واحد" : n === 2 ? "طلبان" : n <= 10 ? `${n} طلبات` : `${n} طلبًا`),
  },
};
export type DispatchOfferLabels = Partial<(typeof STRINGS)["en"]>;

export interface OfferPlace {
  name: string;
  nameAr?: string;
  address?: string;
  addressAr?: string;
}

export interface DispatchOfferProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  pickup: OfferPlace;
  dropoff: OfferPlace;
  /** What the courier earns for the trip, in minor units. */
  feeMinor: number;
  /** Cash the courier must collect from the customer, in minor units. Hidden when 0 or missing. */
  cashToCollectMinor?: number;
  currency?: string;
  /** Trip length in metres and time to the pickup in seconds, from the routing service. */
  distanceMeters?: number;
  etaSeconds?: number;
  /** Orders in this offer when it is a multi-order trip. */
  orderCount?: number;
  /** When the offer lapses, in ms since epoch. The ring drains to it. */
  expiresAt: number;
  /** Length of the offer window in seconds, for the ring. Default 30. */
  windowSeconds?: number;
  /** Clock for stories and tests. Default `Date.now`. */
  now?: () => number;
  onAccept?: () => void;
  onDecline?: () => void;
  /** Called once when the countdown reaches zero. */
  onExpire?: () => void;
  /** Extra content under the route, such as a note from the vendor. */
  children?: ReactNode;
  locale?: string;
  labels?: DispatchOfferLabels;
}

const pick = (en: string | undefined, ar: string | undefined, isAr: boolean) => (isAr ? ar || en : en || ar) ?? "";

/**
 * An incoming job offer for a courier: a countdown ring, the pickup and drop-off, the fee and any cash to collect,
 * and Accept and Decline. The ring is also a number in text, and screen readers hear the time left only at the
 * start and in the last ten seconds, so the page is not read every second. When time runs out Accept is disabled.
 */
export function DispatchOffer({
  pickup,
  dropoff,
  feeMinor,
  cashToCollectMinor,
  currency = DELIVERY_DEFAULT_CURRENCY,
  distanceMeters,
  etaSeconds,
  orderCount,
  expiresAt,
  windowSeconds = 30,
  now = Date.now,
  onAccept,
  onDecline,
  onExpire,
  children,
  locale: localeProp,
  labels,
  className,
  ...props
}: DispatchOfferProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [tick, setTick] = useState(() => now());
  const expiredFired = useRef(false);
  const nowRef = useRef(now);
  nowRef.current = now;
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    expiredFired.current = false;
    setTick(nowRef.current());
    const id = setInterval(() => {
      const current = nowRef.current();
      setTick(current);
      if (current >= expiresAt) {
        clearInterval(id);
        if (!expiredFired.current) {
          expiredFired.current = true;
          expireRef.current?.();
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  const left = offerSecondsLeft(expiresAt, tick);
  const expired = left === 0;
  const fraction = offerFraction(expiresAt, tick, windowSeconds);
  const tone = expired ? "neutral" : offerTone(left, windowSeconds);
  // Announce at the start and at 10..1; stay silent in between.
  const announce = !expired && (left <= 10 || left >= windowSeconds - 1) ? t.secondsLeft(left) : "";

  const place = (kind: "pickup" | "dropoff", p: OfferPlace) => {
    const Icon = kind === "pickup" ? Store : MapPin;
    const address = pick(p.address, p.addressAr, ar);
    return (
      <li data-stop={kind} className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground [&_svg]:size-4">
          <Icon aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption text-muted-foreground">{kind === "pickup" ? t.pickup : t.dropoff}</span>
          <bdi dir="auto" className="truncate text-label text-foreground">
            {pick(p.name, p.nameAr, ar)}
          </bdi>
          {address ? (
            <bdi dir="auto" className="text-body-sm text-muted-foreground">
              {address}
            </bdi>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <section
      data-slot="dispatch-offer"
      data-expired={expired || undefined}
      aria-label={t.title}
      className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-md sm:p-5", expired && "opacity-80", className)}
      {...props}
    >
      <header className="flex items-center gap-4">
        <TimerRing fraction={fraction} tone={tone === "danger" ? "warning" : tone} size={64} thickness={6} aria-hidden>
          <span className={cn("text-label tabular-nums", timerToneText[tone === "danger" ? "warning" : tone])}>
            <bdi>{left}</bdi>
            <span className="text-caption">{t.seconds}</span>
          </span>
        </TimerRing>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-h3 text-foreground">{expired ? t.expired : t.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 text-body-sm text-muted-foreground">
            {orderCount && orderCount > 1 ? (
              <span className="inline-flex items-center gap-1">
                <Package aria-hidden className="size-3.5" />
                {t.stops(orderCount)}
              </span>
            ) : null}
            {distanceMeters !== undefined ? (
              <span>
                {t.distance} <bdi className="tabular-nums">{deliveryDistance(distanceMeters, locale)}</bdi>
              </span>
            ) : null}
            {etaSeconds !== undefined ? (
              <span>
                {t.eta} <bdi className="tabular-nums">{deliveryDuration(etaSeconds, locale)}</bdi>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-caption text-muted-foreground">{t.fee}</span>
          <bdi data-slot="offer-fee" className="text-h3 tabular-nums text-foreground">
            {deliveryMoney(feeMinor, currency, locale)}
          </bdi>
        </div>
      </header>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      <ol role="list" className="flex flex-col gap-3">
        {place("pickup", pickup)}
        {place("dropoff", dropoff)}
      </ol>

      {cashToCollectMinor ? (
        <p data-slot="offer-cash" className="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
          <HandCoins aria-hidden className="size-4 shrink-0" />
          <span>{t.cash}</span>
          <bdi className="ms-auto font-medium tabular-nums">{deliveryMoney(cashToCollectMinor, currency, locale)}</bdi>
        </p>
      ) : null}

      {children}

      <footer className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onDecline}>
          <X aria-hidden />
          {t.decline}
        </Button>
        <Button type="button" variant="primary" size="lg" onClick={onAccept} disabled={expired}>
          <Check aria-hidden />
          {t.accept}
        </Button>
      </footer>
    </section>
  );
}
