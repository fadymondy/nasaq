import type { VisitPrescription } from "./visit-math";

export type { VisitPrescription };

export interface VisitPatient {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  avatar?: string;
  allergies?: string[];
  conditions?: string[];
}

export interface VisitHistoryItem {
  id: string;
  date: Date;
  title: string;
  summary?: string;
}

export interface VisitResult {
  notes: string;
  prescriptions: VisitPrescription[];
  /** The follow-up date the doctor chose, or null. The host books it. */
  followUp: Date | null;
}
