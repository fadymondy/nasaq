import type { DeliveryMoney, StopKind, StopStatus } from "../courier-card/delivery";

export const STRINGS = {
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
