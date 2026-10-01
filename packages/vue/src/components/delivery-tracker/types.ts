import type { DeliveryStep } from "./progress";

export interface DeliveryCourier {
  name: string;
  nameAr?: string;
  avatarSrc?: string;
  /** "Motorbike, plate 42-318-77". Free text, already localised. */
  vehicle?: string;
  phone?: string;
}

export type DeliveryTrackerTimes = Partial<Record<DeliveryStep, Date | string | number>>;
