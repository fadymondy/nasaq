import type { BookingStatus, BookingTransition } from "./booking-math";

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
