// Pure logic of nqCurrentVisit, ported from the React visit-math: prescription validation, the visit timer and follow-up dates.
// No DOM, no Alpine. Dates are ISO strings ("YYYY-MM-DD") so the server's "today" is the only clock that matters.

export interface VisitRx {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  /** Typed in a text box, so a string; "" is "not filled in". */
  days: string | number;
}

export type RxErrors = Partial<Record<"drug" | "dose" | "frequency" | "days", "required" | "invalid">>;

const daysNumber = (days: string | number) => (String(days ?? "").trim() === "" ? Number.NaN : Number(String(days).replace(/[^\d.]/g, "")));

export function validateRx(p: VisitRx): RxErrors {
  const errors: RxErrors = {};
  if (!p.drug.trim()) errors.drug = "required";
  if (!p.dose.trim()) errors.dose = "required";
  if (!p.frequency.trim()) errors.frequency = "required";
  const n = daysNumber(p.days);
  if (!Number.isFinite(n)) errors.days = "required";
  else if (!Number.isInteger(n) || n < 1 || n > 365) errors.days = "invalid";
  return errors;
}

export const isBlankRx = (p: VisitRx) => !p.drug.trim() && !p.dose.trim() && !p.frequency.trim();

/** Drop rows the doctor added but never filled in. */
export const withoutBlankRx = (list: readonly VisitRx[]) => list.filter((p) => !isBlankRx(p));

/** A visit can be finished when there is a note or a prescription, and every filled-in prescription is valid. */
export function canFinish(notes: string, list: readonly VisitRx[]): { ok: boolean; reason?: "empty" | "invalid-prescription" } {
  const filled = withoutBlankRx(list);
  if (filled.some((p) => Object.keys(validateRx(p)).length > 0)) return { ok: false, reason: "invalid-prescription" };
  if (!notes.trim() && filled.length === 0) return { ok: false, reason: "empty" };
  return { ok: true };
}

/** 754 to "12:34", 3725 to "1:02:05". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}`;
}

/** The ISO date `afterDays` from the ISO date `from`, moved forward to the next working weekday (0 = Sunday). */
export function followUpIso(from: string, afterDays: number, workingWeekdays?: readonly number[]): string {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + Math.max(0, Math.round(afterDays))));
  if (workingWeekdays && workingWeekdays.length > 0) {
    for (let i = 0; i < 7 && !workingWeekdays.includes(date.getUTCDay()); i++) date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}
