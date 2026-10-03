/**
 * Pure queue logic for a waiting room: ticket numbers, order, position, estimated wait, calling, skipping and
 * recalling, and the lobby board. No React, no DOM. Every function returns new data and never mutates its input.
 * Self-contained on purpose: `node --test` loads it directly.
 */

export type QueueStatus = "waiting" | "called" | "serving" | "done" | "skipped" | "no_show" | "left";
export type QueuePriority = "normal" | "appointment" | "urgent";

export interface QueueEntry {
  id: string;
  /** Display ticket, "A-012". */
  ticket: string;
  /** The running number the ticket was made from. */
  number: number;
  name?: string;
  status: QueueStatus;
  priority?: QueuePriority;
  /** When the person checked in. */
  checkedInAt: number;
  /** When they joined the current wait list. It moves to "now" when a skipped ticket is put back, which sends it to the back of its class. */
  queuedAt: number;
  calledAt?: number;
  startedAt?: number;
  endedAt?: number;
  /** Room or desk the person was called to. */
  room?: string;
  /** Doctor or agent the person waits for. Lets each doctor call from their own list. */
  providerId?: string;
  /** How many times the call was repeated. */
  recalls?: number;
  skips?: number;
}

const MINUTE = 60000;

/** "A-012" from a prefix and a number. */
export const formatTicket = (prefix: string, n: number, digits = 3) => `${prefix}-${String(n).padStart(digits, "0")}`;

/** The next running number for a day's tickets: the highest so far plus one. */
export const nextTicketNumber = (entries: readonly { number: number }[]) => entries.reduce((max, e) => Math.max(max, e.number), 0) + 1;

/** Tickets not yet served: still waiting for their turn. */
export const isWaiting = (e: QueueEntry) => e.status === "waiting";
/** Tickets a room is busy with: called and on their way, or in the room. */
export const isQueueActive = (e: QueueEntry) => e.status === "called" || e.status === "serving";

const PRIORITY_RANK: Record<QueuePriority, number> = { urgent: 0, appointment: 1, normal: 2 };

/** The waiting tickets in the order they will be called: urgent, then appointments, then walk-ins; first come first served inside each. */
export function waitingOrder(entries: readonly QueueEntry[], providerId?: string): QueueEntry[] {
  return entries
    .filter((e) => isWaiting(e) && (providerId === undefined || e.providerId === undefined || e.providerId === providerId))
    .sort((a, b) => PRIORITY_RANK[a.priority ?? "normal"] - PRIORITY_RANK[b.priority ?? "normal"] || a.queuedAt - b.queuedAt || a.number - b.number);
}

/** 1-based place in the call order, or 0 when the ticket is not waiting. */
export function positionInQueue(entries: readonly QueueEntry[], id: string): number {
  const target = entries.find((e) => e.id === id);
  if (!target || !isWaiting(target)) return 0;
  return waitingOrder(entries, target.providerId).findIndex((e) => e.id === id) + 1;
}

export interface WaitEstimateOptions {
  /** Average minutes one visit takes. */
  averageMinutes: number;
  /** Rooms (or desks) open now. Default 1. */
  rooms?: number;
}

/**
 * Minutes until this ticket is called. Free rooms take the first tickets straight away; after that the queue moves
 * in waves of one visit per open room. 0 when a room is free for it now (or the ticket is not waiting).
 */
export function estimateWaitMinutes(entries: readonly QueueEntry[], id: string, { averageMinutes, rooms = 1 }: WaitEstimateOptions): number {
  const position = positionInQueue(entries, id);
  if (position === 0) return 0;
  const open = Math.max(1, rooms);
  const busy = entries.filter(isQueueActive).length;
  const free = Math.max(0, open - busy);
  if (position <= free) return 0;
  return Math.ceil((position - free) / open) * Math.max(0, averageMinutes);
}

/** Mean minutes of the last `window` finished visits, or `fallback` with none. */
export function averageServiceMinutes(entries: readonly QueueEntry[], fallback: number, window = 10): number {
  const done = entries
    .filter((e) => e.status === "done" && e.startedAt !== undefined && e.endedAt !== undefined && e.endedAt >= e.startedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, window);
  if (done.length === 0) return fallback;
  return Math.round((done.reduce((sum, e) => sum + ((e.endedAt ?? 0) - (e.startedAt ?? 0)), 0) / done.length / MINUTE) * 10) / 10;
}

export interface QueueChange {
  entries: QueueEntry[];
  /** The ticket that was acted on. Undefined when nothing changed. */
  entry?: QueueEntry;
}

const patch = (entries: readonly QueueEntry[], id: string, apply: (e: QueueEntry) => QueueEntry): QueueChange => {
  const found = entries.find((e) => e.id === id);
  if (!found) return { entries: [...entries] };
  const next = apply(found);
  return { entries: entries.map((e) => (e.id === id ? next : e)), entry: next };
};

/** Call the next waiting ticket to a room. With none waiting, nothing changes. */
export function callNext(entries: readonly QueueEntry[], { room, at, providerId }: { room?: string; at: number; providerId?: string }): QueueChange {
  const first = waitingOrder(entries, providerId)[0];
  if (!first) return { entries: [...entries] };
  return patch(entries, first.id, (e) => ({ ...e, status: "called", room: room ?? e.room, calledAt: at }));
}

/** Call one specific waiting ticket (out of order, for example a person who walked up to the desk). */
export function callTicket(entries: readonly QueueEntry[], id: string, { room, at }: { room?: string; at: number }): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || !isWaiting(target)) return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "called", room: room ?? e.room, calledAt: at }));
}

/** The called person is in the room: the visit starts. */
export function startVisit(entries: readonly QueueEntry[], id: string, at: number): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || (target.status !== "called" && target.status !== "waiting")) return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "serving", startedAt: at, calledAt: e.calledAt ?? at }));
}

export function finishVisit(entries: readonly QueueEntry[], id: string, at: number): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || target.status !== "serving") return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "done", endedAt: at }));
}

/** The called person did not come. They are set aside, not lost: `recall` can put them back. */
export function skipTicket(entries: readonly QueueEntry[], id: string): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || (target.status !== "called" && target.status !== "waiting")) return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "skipped", skips: (e.skips ?? 0) + 1 }));
}

/**
 * A called ticket is announced again (`recalls` goes up, `calledAt` moves to now). A skipped ticket goes back to the
 * waiting list behind everyone in its class (its `queuedAt` becomes now).
 */
export function recallTicket(entries: readonly QueueEntry[], id: string, at: number): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target) return { entries: [...entries] };
  if (target.status === "called") return patch(entries, id, (e) => ({ ...e, calledAt: at, recalls: (e.recalls ?? 0) + 1 }));
  if (target.status === "skipped") return patch(entries, id, (e) => ({ ...e, status: "waiting", queuedAt: at, room: undefined, calledAt: undefined }));
  return { entries: [...entries] };
}

export function markNoShow(entries: readonly QueueEntry[], id: string): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || (target.status !== "called" && target.status !== "skipped")) return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "no_show" }));
}

/** The person left the queue themselves. */
export function leaveQueue(entries: readonly QueueEntry[], id: string): QueueChange {
  const target = entries.find((e) => e.id === id);
  if (!target || !isWaiting(target)) return { entries: [...entries] };
  return patch(entries, id, (e) => ({ ...e, status: "left" }));
}

/** A called ticket nobody answered for `graceMinutes` is due to be skipped. */
export const isCallOverdue = (e: QueueEntry, now: number, graceMinutes: number) => e.status === "called" && e.calledAt !== undefined && now - e.calledAt >= graceMinutes * MINUTE;

/** Add a person to the queue. The ticket number and display form are made here so they always agree. */
export function checkIn(
  entries: readonly QueueEntry[],
  { id, name, prefix = "A", priority = "normal", providerId, at }: { id: string; name?: string; prefix?: string; priority?: QueuePriority; providerId?: string; at: number },
): QueueChange {
  const number = nextTicketNumber(entries);
  const entry: QueueEntry = { id, ticket: formatTicket(prefix, number), number, name, status: "waiting", priority, providerId, checkedInAt: at, queuedAt: at };
  return { entries: [...entries, entry], entry };
}

/* ------------------------------------------------------------------ lobby board */

/** Called and in-room tickets, newest call first. */
export function nowServing(entries: readonly QueueEntry[]): QueueEntry[] {
  return entries.filter(isQueueActive).sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0));
}

/** The most recent calls, including those already in the room or finished, newest first. */
export function recentCalls(entries: readonly QueueEntry[], limit = 6): QueueEntry[] {
  return entries
    .filter((e) => e.calledAt !== undefined && e.status !== "waiting" && e.status !== "left")
    .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0))
    .slice(0, limit);
}

export interface RoomBoardRow {
  room: string;
  /** What the room is doing now. Undefined when it is free. */
  entry?: QueueEntry;
}

/** One row per room, in the given order, with its current ticket if any. */
export function roomBoard(entries: readonly QueueEntry[], rooms: readonly string[]): RoomBoardRow[] {
  const active = nowServing(entries);
  return rooms.map((room) => ({ room, entry: active.find((e) => e.room === room) }));
}

/** Tickets called since `since` (the board plays its chime and animation for these, once each). */
export const newCalls = (entries: readonly QueueEntry[], since: number) => entries.filter((e) => e.calledAt !== undefined && e.calledAt > since && isQueueActive(e));

/* ------------------------------------------------------------------ check in */

export type ParsedTicket = { kind: "booking" | "queue"; code: string };

/** Reads what a ticket's QR holds: `booking:BK-7F3Q9K` or `queue:A-012`. Anything else is null. */
export function parseTicketValue(value: string): ParsedTicket | null {
  const m = /^\s*(booking|queue):\s*([A-Za-z0-9-]{3,32})\s*$/i.exec(value);
  return m ? { kind: m[1]!.toLowerCase() as ParsedTicket["kind"], code: m[2]!.toUpperCase() } : null;
}

const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));

/** Digits only, Arabic-Indic digits converted. */
export const phoneDigits = (input: string) => latinDigits(input).replace(/\D/g, "");

/** Two numbers are the same phone when their last 9 digits match, so +20 100 123 4567 equals 0100 123 4567. */
export function samePhone(a: string, b: string): boolean {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  const n = 9;
  return x.length >= n && y.length >= n && x.slice(-n) === y.slice(-n);
}

export interface KioskBooking {
  id: string;
  code: string;
  phone: string;
  name: string;
  startsAt: number;
}

export type KioskMatch = { kind: "found"; booking: KioskBooking } | { kind: "multiple"; bookings: KioskBooking[] } | { kind: "none" } | { kind: "too-early"; booking: KioskBooking };

/**
 * Finds the booking a person is checking in for, from a scanned code or a phone number. Only bookings within
 * `windowMinutes` of `now` count, so yesterday's booking is never picked. A person who comes more than
 * `earlyMinutes` before the start gets "too-early".
 */
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
