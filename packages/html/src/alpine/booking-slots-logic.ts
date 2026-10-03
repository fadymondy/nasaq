/** Pure helpers for BookingSlots (the slot part of booking-flow's booking-math, copied). Times are local "YYYY-MM-DDTHH:mm" strings or Dates. */

export type SlotState = "available" | "full" | "held" | "past";

export interface SlotInput {
  start: string | number | Date;
  end?: string | number | Date;
  state: SlotState;
}

export interface Slot {
  start: Date;
  startKey: string;
  day: string;
  state: SlotState;
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function toSlot(input: SlotInput): Slot {
  const start = input.start instanceof Date ? input.start : new Date(input.start);
  return { start, startKey: String(start.getTime()), day: dayKey(start), state: input.state };
}

export function countSlots(slots: readonly { state: SlotState }[]): Record<SlotState, number> {
  const counts: Record<SlotState, number> = { available: 0, full: 0, held: 0, past: 0 };
  for (const s of slots) counts[s.state]++;
  return counts;
}

/** The first day (from `from`, looking `days` ahead) that has an available slot, as "YYYY-MM-DD", or null. */
export function firstAvailableDay(slots: readonly Slot[], from: Date, days = 60): string | null {
  const open = new Set(slots.filter((s) => s.state === "available").map((s) => s.day));
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i));
    if (open.has(key)) return key;
  }
  return null;
}

/** Morning before 12:00, afternoon before 17:00, evening after. */
export function dayPart(date: Date): "morning" | "afternoon" | "evening" {
  const h = date.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/** "2026-09-15" to a local Date at midnight. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
