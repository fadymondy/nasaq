/**
 * Pure logic for the visit in progress: prescription validation, the visit timer and follow-up dates. No React, no
 * DOM. Self-contained on purpose: `node --test` loads it directly.
 */

export interface VisitPrescription {
  id: string;
  drug: string;
  dose: string;
  /** How often: "twice daily". */
  frequency: string;
  /** How many days to take it. */
  days: number;
  note?: string;
}

export type PrescriptionErrors = Partial<Record<"drug" | "dose" | "frequency" | "days", "required" | "invalid">>;

export function validatePrescription(p: Pick<VisitPrescription, "drug" | "dose" | "frequency" | "days">): PrescriptionErrors {
  const errors: PrescriptionErrors = {};
  if (!p.drug.trim()) errors.drug = "required";
  if (!p.dose.trim()) errors.dose = "required";
  if (!p.frequency.trim()) errors.frequency = "required";
  if (!Number.isFinite(p.days)) errors.days = "required";
  else if (!Number.isInteger(p.days) || p.days < 1 || p.days > 365) errors.days = "invalid";
  return errors;
}

export const isPrescriptionValid = (p: VisitPrescription) => Object.keys(validatePrescription(p)).length === 0;

/** Drop rows the doctor added but never filled in, so an empty row does not block finishing the visit. */
export const withoutBlankPrescriptions = (list: readonly VisitPrescription[]) => list.filter((p) => p.drug.trim() || p.dose.trim() || p.frequency.trim());

/** A one-line summary: "Amoxicillin 500 mg, twice daily, 7 days". */
export const prescriptionLine = (p: VisitPrescription, dayWord = "days") => `${p.drug.trim()} ${p.dose.trim()}, ${p.frequency.trim()}, ${p.days} ${dayWord}`;

/** Whole seconds a visit has run. Never negative. */
export const visitElapsedSeconds = (startedAt: number, now: number) => Math.max(0, Math.floor((now - startedAt) / 1000));

/** 754 to "12:34", 3725 to "1:02:05". */
export function formatVisitElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}`;
}

/**
 * The date `afterDays` from `from`, moved forward to the next working weekday (0 = Sunday, like `Date#getDay`).
 * With no working days given every day counts. Time of day is dropped.
 */
export function followUpDate(from: Date, afterDays: number, workingWeekdays?: readonly number[]): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + Math.max(0, Math.round(afterDays)));
  if (!workingWeekdays || workingWeekdays.length === 0) return d;
  for (let i = 0; i < 7 && !workingWeekdays.includes(d.getDay()); i++) d.setDate(d.getDate() + 1);
  return d;
}

export interface VisitDraft {
  notes: string;
  prescriptions: readonly VisitPrescription[];
}

/** A visit can be finished when there is a note or a prescription, and every filled-in prescription is valid. */
export function canFinishVisit(draft: VisitDraft): { ok: boolean; reason?: "empty" | "invalid-prescription" } {
  const filled = withoutBlankPrescriptions(draft.prescriptions);
  if (filled.some((p) => !isPrescriptionValid(p))) return { ok: false, reason: "invalid-prescription" };
  if (!draft.notes.trim() && filled.length === 0) return { ok: false, reason: "empty" };
  return { ok: true };
}
