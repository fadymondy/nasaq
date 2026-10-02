/**
 * The slice of booking-flow's booking-math that BookingManage needs (the cancel / reschedule policy, the ticket value and the calendar
 * file), copied here because booking-flow is ported later. Local-time dates. Not exported from the package index.
 */


/* ------------------------------------------------------------------ slots */

export type BookingSlotState = "available" | "full" | "held" | "past";

export interface BookingSlot {
  start: Date;
  end: Date;
  state: BookingSlotState;
  /** Places still free (capacity minus booked minus held). Never below 0. */
  remaining: number;
}

export const BOOKING_STATUSES = ["requested", "confirmed", "checked_in", "in_visit", "done"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number] | "no_show" | "cancelled";

export interface BookingTransition {
  status: BookingStatus;
  at: Date;
  by?: string;
  note?: string;
}

export interface BookingPolicy {
  /** Free cancellation up to this many hours before the start. */
  cancelHours: number;
  /** Rescheduling allowed up to this many hours before the start. Default: the same as `cancelHours`. */
  rescheduleHours?: number;
  /** Percentage of the price charged for a late cancellation, 0 to 100. */
  lateFeePercent?: number;
}

export interface BookingPolicyResult {
  hoursLeft: number;
  /** The visit has not started, so it can still be cancelled (a late one may carry a fee). */
  canCancel: boolean;
  /** Cancelling now costs nothing. */
  freeCancel: boolean;
  canReschedule: boolean;
  feePercent: number;
}

export function evaluatePolicy(startsAt: Date, now: Date, policy: BookingPolicy, status: BookingStatus = "confirmed"): BookingPolicyResult {
  const hoursLeft = (startsAt.getTime() - now.getTime()) / 3600000;
  const open = (status === "requested" || status === "confirmed") && hoursLeft > 0;
  const free = open && hoursLeft >= policy.cancelHours;
  return {
    hoursLeft,
    canCancel: open,
    freeCancel: free,
    canReschedule: open && hoursLeft >= (policy.rescheduleHours ?? policy.cancelHours),
    feePercent: open && !free ? Math.min(100, Math.max(0, policy.lateFeePercent ?? 0)) : 0,
  };
}

/* ------------------------------------------------------------------ guest details */


/** What the ticket's QR holds. The check-in kiosk reads it back with `parseTicketValue` (waiting-screen). */
export const bookingTicketValue = (code: string) => `booking:${code}`;

export interface BookingCalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}

const utc = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** An iCalendar (.ics) file for one event. CRLF line ends, UTC times, escaped text. */
export function buildIcs(event: BookingCalendarEvent, stamp: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nasaq//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(stamp)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${icsText(event.title)}`,
    ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${icsText(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** An "add to Google Calendar" link for the same event. */
export function googleCalendarUrl(event: BookingCalendarEvent): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${utc(event.start)}/${utc(event.end)}` });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
