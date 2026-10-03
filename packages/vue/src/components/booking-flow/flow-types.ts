import type { HTMLAttributes } from "vue";
import type { BookingSlot } from "./booking-math";
import type { BookingFlowLabels } from "./strings";
import type { BookingLocation, BookingPayment, BookingProvider, BookingService } from "./types";

export interface BookingDetailsValue {
  name: string;
  phone: string;
  email: string;
  forOther: boolean;
  otherName: string;
}

/** What the patient chose, sent to `onSubmit`. `providerId` is "any" when they took the first available doctor. */
export interface BookingSubmission {
  locationId: string | null;
  serviceId: string;
  providerId: string | "any";
  start: Date;
  details: BookingDetailsValue;
  notes: string;
  files: File[];
  payment: BookingPayment;
  total: number;
}

export interface BookingSlotQuery {
  locationId: string | null;
  serviceId: string;
  providerId: string | "any";
}

export interface BookingFlowProps {
  locations?: readonly BookingLocation[];
  services: readonly BookingService[];
  providers: readonly BookingProvider[];
  /** Times for the chosen branch, service and doctor. Called when the time step opens and when the choice changes. */
  getSlots: (query: BookingSlotQuery) => Promise<readonly BookingSlot[]>;
  /**
   * Create the booking. Resolve with the created record's code, or `{ error }` to stay on the review step.
   * Throwing shows the generic error.
   */
  onSubmit: (submission: BookingSubmission) => Promise<void | { code?: string; error?: string }>;
  /** A signed-in patient: their details are filled and the details step shows a short "booking as" line. */
  signedIn?: { name: string; phone: string; email?: string };
  /** Offer online payment. Default true. */
  allowOnlinePayment?: boolean;
  /** ISO currency code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Tax as a fraction, 0.14 for 14%. Default 0. */
  taxRate?: number;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  labels?: Partial<BookingFlowLabels>;
  class?: HTMLAttributes["class"];
}
