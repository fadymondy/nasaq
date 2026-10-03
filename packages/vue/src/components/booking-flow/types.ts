/** Plain data shapes shared by the booking components. No React, no behaviour. */
import type { BookingStatus, BookingTransition } from "./booking-math";

export interface BookingLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface BookingService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  /** A group heading in the list, such as "Dental" or "Skin". */
  category?: string;
}

export interface BookingProvider {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  /** Average score out of 5. */
  rating?: number;
  reviews?: number;
  /** Which services this provider performs. Omit for all. */
  serviceIds?: readonly string[];
  /** Which locations this provider works at. Omit for all. */
  locationIds?: readonly string[];
}

export type BookingPayment = "online" | "visit";

/** A booking as the manage page and the staff pipeline see it. */
export interface BookingRecord {
  id: string;
  code: string;
  status: BookingStatus;
  start: Date;
  end: Date;
  service: string;
  provider: string;
  location?: string;
  address?: string;
  patient: string;
  phone?: string;
  price: number;
  currency?: string;
  payment: BookingPayment;
  paid?: boolean;
  notes?: string;
  history?: readonly BookingTransition[];
}
