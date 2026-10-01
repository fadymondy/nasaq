/** The booking status workflow (the status part of booking-flow's booking-math, copied). */

export const BOOKING_STATUSES = ["requested", "confirmed", "checked_in", "in_visit", "done"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number] | "no_show" | "cancelled";

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["in_visit", "no_show", "cancelled"],
  in_visit: ["done"],
  done: [],
  // A no-show can be reopened by staff when the customer turns up late.
  no_show: ["confirmed"],
  cancelled: [],
};

export const nextStatuses = (status: BookingStatus): readonly BookingStatus[] => TRANSITIONS[status];
export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to);
/** Position on the main path (0 to 4), or -1 for no-show and cancelled. */
export const pipelineIndex = (status: BookingStatus) => (BOOKING_STATUSES as readonly string[]).indexOf(status);
/** The happy-path next step, or null at the end (or on cancelled). A no-show reopens to confirmed. */
export function primaryNext(status: BookingStatus): BookingStatus | null {
  const i = pipelineIndex(status);
  return i >= 0 && i < BOOKING_STATUSES.length - 1 ? BOOKING_STATUSES[i + 1]! : status === "no_show" ? "confirmed" : null;
}

export interface BookingTransition {
  status: BookingStatus;
  at: string | number | Date;
  by?: string;
  note?: string;
}

export const STATUS_LABELS: Record<"en" | "ar", Record<BookingStatus, string>> = {
  en: { requested: "Requested", confirmed: "Confirmed", checked_in: "Checked in", in_visit: "In visit", done: "Done", no_show: "No-show", cancelled: "Cancelled" },
  ar: { requested: "مطلوب", confirmed: "مؤكد", checked_in: "تم تسجيل الوصول", in_visit: "في الزيارة", done: "منتهي", no_show: "لم يحضر", cancelled: "ملغى" },
};
