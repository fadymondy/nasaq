// Pure check-in matching for nqCheckInKiosk, copied from the React queue-math (parseTicketValue, phoneDigits, samePhone,
// findBookingForCheckIn). No DOM, no Alpine.

export interface KioskBooking {
  id: string;
  code: string;
  phone: string;
  name: string;
  startsAt: number;
}

export type KioskMatch = { kind: "found"; booking: KioskBooking } | { kind: "multiple"; bookings: KioskBooking[] } | { kind: "none" } | { kind: "too-early"; booking: KioskBooking };

const MINUTE = 60000;

/** Reads what a ticket's QR holds: `booking:BK-7F3Q9K` or `queue:A-012`. Anything else is null. */
export function parseTicketValue(value: string): { kind: "booking" | "queue"; code: string } | null {
  const m = /^\s*(booking|queue):\s*([A-Za-z0-9-]{3,32})\s*$/i.exec(value);
  return m ? { kind: m[1]!.toLowerCase() as "booking" | "queue", code: m[2]!.toUpperCase() } : null;
}

const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));

/** Digits only, Arabic-Indic digits converted. */
export const phoneDigits = (input: string) => latinDigits(input).replace(/\D/g, "");

/** Two numbers are the same phone when their last 9 digits match. */
export function samePhone(a: string, b: string): boolean {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  const n = 9;
  return x.length >= n && y.length >= n && x.slice(-n) === y.slice(-n);
}

/** Finds the booking a person is checking in for, from a scanned code or a phone number. */
export function findBookingForCheckIn(
  bookings: readonly KioskBooking[],
  input: string,
  { now, earlyMinutes = 60, windowMinutes = 240 }: { now: number; earlyMinutes?: number; windowMinutes?: number },
): KioskMatch {
  const ticket = parseTicketValue(input);
  const upcoming = bookings.filter((b) => Math.abs(b.startsAt - now) <= windowMinutes * MINUTE);
  const pool = ticket ? upcoming.filter((b) => b.code.toUpperCase() === ticket.code) : upcoming.filter((b) => samePhone(b.phone, input));
  if (pool.length === 0) return { kind: "none" };
  if (pool.length > 1) return { kind: "multiple", bookings: pool.sort((a, b) => a.startsAt - b.startsAt) };
  const booking = pool[0]!;
  return booking.startsAt - now > earlyMinutes * MINUTE ? { kind: "too-early", booking } : { kind: "found", booking };
}
