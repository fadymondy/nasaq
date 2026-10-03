/**
 * Pure booking logic: slot generation, the status workflow, totals, the cancel and reschedule policy, tickets and
 * calendar files. No React, no DOM. Local-time dates. Self-contained on purpose: `node --test` loads it directly.
 */

/* ------------------------------------------------------------------ time helpers */

export interface BookingTimeRange {
  /** "HH:mm", 24 hour. */
  start: string;
  end: string;
}

/** "09:30" to minutes since midnight. Returns NaN for anything that is not H:mm. */
export function parseHm(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 24 || min > 59 || (h === 24 && min > 0) ? Number.NaN : h * 60 + min;
}

/** Minutes since midnight to "HH:mm". */
export function toHm(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const atMinutes = (day: Date, minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes, 0, 0);

/** Local `YYYY-MM-DD`, never through UTC (it can shift the day). */
export function bookingDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ slots */

export type BookingSlotState = "available" | "full" | "held" | "past";

export interface BookingSlot {
  start: Date;
  end: Date;
  state: BookingSlotState;
  /** Places still free (capacity minus booked minus held). Never below 0. */
  remaining: number;
}

export interface BusyInterval {
  start: Date;
  end: Date;
  /** A hold (someone is checking out) rather than a confirmed booking. It expires, so the slot shows "held", not "full". */
  held?: boolean;
}

export interface GenerateSlotsOptions {
  day: Date;
  /** Opening ranges of the day. Empty means closed. */
  hours: BookingTimeRange[];
  /** Breaks inside the opening ranges. A slot that overlaps one is not offered. */
  breaks?: BookingTimeRange[];
  /** Length of the service. */
  durationMinutes: number;
  /** Gap between slot starts. Default: the duration. */
  stepMinutes?: number;
  busy?: BusyInterval[];
  /** How many bookings one slot takes. Default 1. */
  capacity?: number;
  now?: Date;
  /** The earliest a customer may book, in minutes from now. Default 0. */
  leadMinutes?: number;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

/**
 * The bookable times of one day. A slot must fit inside an opening range and clear every break. Its state is
 * "past" (inside the lead time), "full" (booked to capacity), "held" (only holds stand in the way) or "available".
 */
export function generateSlots({ day, hours, breaks = [], durationMinutes, stepMinutes, busy = [], capacity = 1, now, leadMinutes = 0 }: GenerateSlotsOptions): BookingSlot[] {
  if (!(durationMinutes > 0)) return [];
  const step = Math.max(1, stepMinutes ?? durationMinutes);
  const cutoff = now ? now.getTime() + leadMinutes * 60000 : Number.NEGATIVE_INFINITY;
  const brk = breaks.map((b) => [parseHm(b.start), parseHm(b.end)] as const).filter(([s, e]) => e > s);
  const out = new Map<number, BookingSlot>();
  for (const range of hours) {
    const from = parseHm(range.start);
    const to = parseHm(range.end);
    if (!(to > from)) continue;
    for (let t = from; t + durationMinutes <= to; t += step) {
      if (brk.some(([s, e]) => overlaps(t, t + durationMinutes, s, e))) continue;
      const start = atMinutes(day, t);
      const end = atMinutes(day, t + durationMinutes);
      let booked = 0;
      let held = 0;
      for (const b of busy) {
        if (!overlaps(start.getTime(), end.getTime(), b.start.getTime(), b.end.getTime())) continue;
        if (b.held) held++;
        else booked++;
      }
      const remaining = Math.max(0, capacity - booked - held);
      const state: BookingSlotState = start.getTime() < cutoff ? "past" : booked >= capacity ? "full" : remaining === 0 ? "held" : "available";
      out.set(start.getTime(), { start, end, state, remaining });
    }
  }
  return [...out.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function countSlots(slots: readonly { state: BookingSlotState }[]): Record<BookingSlotState, number> {
  const counts: Record<BookingSlotState, number> = { available: 0, full: 0, held: 0, past: 0 };
  for (const s of slots) counts[s.state]++;
  return counts;
}

/** The first day (from `from`, looking `days` ahead) that has an available slot, or null. */
export function firstAvailableDay(slots: readonly { start: Date; state: BookingSlotState }[], from: Date, days = 60): Date | null {
  const first = startOfDay(from);
  const open = new Set(slots.filter((s) => s.state === "available").map((s) => bookingDayKey(s.start)));
  for (let i = 0; i < days; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    if (open.has(bookingDayKey(d))) return d;
  }
  return null;
}

/** Day parts for grouping a long list of times: morning before 12:00, afternoon before 17:00, evening after. */
export function dayPart(date: Date): "morning" | "afternoon" | "evening" {
  const h = date.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/* ------------------------------------------------------------------ status workflow */

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
export const isTerminal = (status: BookingStatus) => status === "done" || status === "cancelled";
/** Position on the main path (0 to 4), or -1 for no-show and cancelled. */
export const pipelineIndex = (status: BookingStatus) => (BOOKING_STATUSES as readonly string[]).indexOf(status);
/** The happy-path next step, or null at the end (or on cancelled). A no-show reopens to confirmed. */
export function primaryNext(status: BookingStatus): BookingStatus | null {
  const i = pipelineIndex(status);
  return i >= 0 && i < BOOKING_STATUSES.length - 1 ? BOOKING_STATUSES[i + 1]! : status === "no_show" ? "confirmed" : null;
}

export interface BookingTransition {
  status: BookingStatus;
  at: Date;
  by?: string;
  note?: string;
}

/** Appends a transition to a history. Returns the history unchanged, `ok: false` and a reason when the move is not allowed. */
export function advance(history: readonly BookingTransition[], to: BookingStatus, at: Date, by?: string, note?: string): { history: BookingTransition[]; ok: boolean; reason?: string } {
  const current = history[history.length - 1]?.status;
  if (current !== undefined && !canTransition(current, to)) return { history: [...history], ok: false, reason: `${current} to ${to} is not allowed` };
  return { history: [...history, { status: to, at, by, note }], ok: true };
}

export const currentStatus = (history: readonly BookingTransition[]): BookingStatus | null => history[history.length - 1]?.status ?? null;

/** Counts per status, every status present (0 when none). */
export function countBookingsByStatus(items: readonly { status: BookingStatus }[]): Record<BookingStatus, number> {
  const counts: Record<BookingStatus, number> = { requested: 0, confirmed: 0, checked_in: 0, in_visit: 0, done: 0, no_show: 0, cancelled: 0 };
  for (const i of items) counts[i.status]++;
  return counts;
}

/* ------------------------------------------------------------------ totals and policy */

export interface BookingLine {
  id: string;
  price: number;
  quantity?: number;
}

export interface BookingTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Amounts in currency units, rounded to 2 decimals at each step so the parts always add up to the total. */
export function bookingTotals(lines: readonly BookingLine[], { taxRate = 0, discount = 0 }: { taxRate?: number; discount?: number } = {}): BookingTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + round2(l.price * (l.quantity ?? 1)), 0));
  const off = Math.min(subtotal, Math.max(0, round2(discount)));
  const tax = round2((subtotal - off) * taxRate);
  return { subtotal, discount: off, tax, total: round2(subtotal - off + tax) };
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

/** Arabic-Indic and Persian digits to Latin, separators dropped, a leading + kept. */
export function normalizePhone(input: string): string {
  const latin = input.replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const plus = latin.trim().startsWith("+") ? "+" : "";
  return plus + latin.replace(/\D/g, "");
}

export const isPhoneValid = (input: string) => {
  const digits = normalizePhone(input).replace(/^\+/, "");
  return digits.length >= 8 && digits.length <= 15;
};
export const isEmailValid = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());

export interface BookingDetailsInput {
  name: string;
  phone: string;
  email?: string;
  /** Booking for someone else. */
  forOther?: boolean;
  otherName?: string;
}

export type BookingDetailsErrors = Partial<Record<"name" | "phone" | "email" | "otherName", "required" | "invalid">>;

export function validateDetails(input: BookingDetailsInput): BookingDetailsErrors {
  const errors: BookingDetailsErrors = {};
  if (!input.name.trim()) errors.name = "required";
  if (!input.phone.trim()) errors.phone = "required";
  else if (!isPhoneValid(input.phone)) errors.phone = "invalid";
  if (input.email?.trim() && !isEmailValid(input.email)) errors.email = "invalid";
  if (input.forOther && !input.otherName?.trim()) errors.otherName = "required";
  return errors;
}

/* ------------------------------------------------------------------ ticket and calendar */

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** A short, readable booking code from any seed ("BK-7F3Q9K"): no 0, 1, I, L or O. Deterministic. */
export function bookingCode(seed: string, prefix = "BK"): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
  }
  return `${prefix}-${out}`;
}

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
