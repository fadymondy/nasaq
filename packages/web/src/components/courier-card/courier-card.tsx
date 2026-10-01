"use client";

import { Bike, Car, Footprints, HandCoins, Motorbike, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { DELIVERY_DEFAULT_CURRENCY, deliveryDistance, deliveryDuration, deliveryMoney } from "../../lib/delivery";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";

const STRINGS = {
  en: {
    available: "Available",
    busy: "Busy",
    offline: "Offline",
    bike: "Bicycle",
    motorbike: "Motorbike",
    car: "Car",
    van: "Van",
    walk: "On foot",
    away: "away",
    eta: "ETA",
    float: "Cash float",
    orders: (n: number) => (n === 1 ? "1 active order" : `${n} active orders`),
    selected: "selected",
    couriers: "Couriers",
  },
  ar: {
    available: "متاح",
    busy: "مشغول",
    offline: "غير متصل",
    bike: "دراجة",
    motorbike: "دراجة نارية",
    car: "سيارة",
    van: "فان",
    walk: "سيرًا على الأقدام",
    away: "بعيدًا",
    eta: "الوصول",
    float: "عهدة نقدية",
    orders: (n: number) => (n === 0 ? "لا طلبات نشطة" : n === 1 ? "طلب نشط واحد" : n === 2 ? "طلبان نشطان" : n <= 10 ? `${n} طلبات نشطة` : `${n} طلبًا نشطًا`),
    selected: "محدد",
    couriers: "السائقون",
  },
};
export type CourierCardLabels = Partial<(typeof STRINGS)["en"]>;

export type CourierStatus = "available" | "busy" | "offline";
export type CourierVehicle = "bike" | "motorbike" | "car" | "van" | "walk";

const VEHICLE_ICON: Record<CourierVehicle, LucideIcon> = { bike: Bike, motorbike: Motorbike, car: Car, van: Truck, walk: Footprints };

/** Each status has its own dot shape and a word, so presence never depends on colour. */
const DOT: Record<CourierStatus, string> = {
  available: "bg-nq-success",
  busy: "bg-nq-warning",
  offline: "border-2 border-nq-line-strong bg-transparent",
};
const STATUS_TEXT: Record<CourierStatus, string> = {
  available: "text-nq-success-text",
  busy: "text-nq-warning-text",
  offline: "text-muted-foreground",
};

export interface CourierCardProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  name: string;
  nameAr?: string;
  avatarSrc?: string;
  status: CourierStatus;
  vehicle?: CourierVehicle;
  /** Plate number or model, shown after the vehicle word. */
  vehicleDetail?: string;
  /** Straight-line or road distance from the pickup, in metres. */
  distanceMeters?: number;
  /** Estimated time to the pickup, in seconds. */
  etaSeconds?: number;
  /** Cash the courier is carrying or has been given as float, in minor units. */
  cashFloatMinor?: number;
  /** Orders the courier is carrying now. */
  activeOrders?: number;
  /** ISO 4217 code. Default "ILS". */
  currency?: string;
  /** Makes the card a button (select a courier on the map or to assign). */
  onSelect?: () => void;
  selected?: boolean;
  /** Trailing actions, for example an Assign button. Kept outside the select button. */
  actions?: ReactNode;
  /** Hide the vehicle, distance and float lines for a one-line row. */
  compact?: boolean;
  locale?: string;
  labels?: CourierCardLabels;
}

/**
 * One courier in a presence list: avatar with a status dot, name, vehicle, distance and ETA to the pickup, and the
 * cash float they carry. Use it to pick a driver for an order or to watch the fleet.
 */
export function CourierCard({
  name,
  nameAr,
  avatarSrc,
  status,
  vehicle,
  vehicleDetail,
  distanceMeters,
  etaSeconds,
  cashFloatMinor,
  activeOrders,
  currency = DELIVERY_DEFAULT_CURRENCY,
  onSelect,
  selected = false,
  actions,
  compact = false,
  locale: localeProp,
  labels,
  className,
  ...props
}: CourierCardProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const shownName = ar ? nameAr || name : name || nameAr || "";
  const VehicleIcon = vehicle ? VEHICLE_ICON[vehicle] : null;
  const vehicleWord = vehicle ? t[vehicle] : null;

  const body = (
    <>
      <span className="relative shrink-0">
        <Avatar name={shownName} src={avatarSrc} size="lg" />
        <span data-slot="courier-dot" aria-hidden className={cn("absolute -bottom-0.5 -end-0.5 size-3 rounded-full ring-2 ring-card", DOT[status])} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span className="flex min-w-0 items-center gap-2">
          <bdi dir="auto" className="truncate text-label text-foreground">
            {shownName}
          </bdi>
          <span data-slot="courier-status" className={cn("shrink-0 text-caption", STATUS_TEXT[status])}>
            {t[status]}
          </span>
        </span>
        {!compact ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-muted-foreground">
            {VehicleIcon ? (
              <span className="inline-flex items-center gap-1">
                <VehicleIcon aria-hidden className="size-3.5" />
                <span>{vehicleWord}</span>
                {vehicleDetail ? <bdi dir="auto">{vehicleDetail}</bdi> : null}
              </span>
            ) : null}
            {distanceMeters !== undefined ? (
              <span>
                <bdi className="tabular-nums">{deliveryDistance(distanceMeters, locale)}</bdi> {t.away}
              </span>
            ) : null}
            {etaSeconds !== undefined ? (
              <span>
                {t.eta} <bdi className="tabular-nums">{deliveryDuration(etaSeconds, locale)}</bdi>
              </span>
            ) : null}
          </span>
        ) : null}
        {!compact && (cashFloatMinor !== undefined || activeOrders !== undefined) ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted-foreground">
            {cashFloatMinor !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <HandCoins aria-hidden className="size-3.5" />
                <span>{t.float}</span>
                <bdi className="tabular-nums text-foreground">{deliveryMoney(cashFloatMinor, currency, locale)}</bdi>
              </span>
            ) : null}
            {activeOrders !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <PackageCheck aria-hidden className="size-3.5" />
                {t.orders(activeOrders)}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <div
      data-slot="courier-card"
      data-status={status}
      data-selected={selected || undefined}
      className={cn(
        "flex items-center gap-2 rounded-card border border-border bg-card p-3 transition-colors duration-150 ease-nq",
        selected && "border-primary ring-2 ring-primary/30",
        status === "offline" && "opacity-80",
        className,
      )}
      {...props}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={[shownName, t[status], selected ? t.selected : ""].filter(Boolean).join(", ")}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export interface CourierListProps extends Omit<ComponentProps<"ul">, "children"> {
  couriers: readonly (CourierCardProps & { id: string })[];
  /** Id of the selected courier. */
  selectedId?: string | null;
  onSelectCourier?: (id: string) => void;
  locale?: string;
  labels?: CourierCardLabels;
}

/** A vertical list of `CourierCard`s with one selected. Pass the couriers already sorted (nearest first, offline last). */
export function CourierList({ couriers, selectedId, onSelectCourier, locale: localeProp, labels, className, "aria-label": ariaLabel, ...props }: CourierListProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  return (
    <ul role="list" data-slot="courier-list" aria-label={ariaLabel ?? t.couriers} className={cn("flex flex-col gap-2", className)} {...props}>
      {couriers.map(({ id, ...card }) => (
        <li key={id}>
          <CourierCard {...card} locale={locale} labels={labels} selected={selectedId === id} onSelect={onSelectCourier ? () => onSelectCourier(id) : card.onSelect} />
        </li>
      ))}
    </ul>
  );
}
