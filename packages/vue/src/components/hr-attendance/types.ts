import type { LeaveRequestLike, LeaveTypeLike, PayrollLineLike, PunchLike } from "./hr-math";

/** What an action handler may resolve with. `{ error }` shows the message. */
export type HrResult = void | undefined | { error?: string };

export type AttendancePunchKind = PunchLike["kind"];

export interface AttendancePunch {
  id: string;
  kind: AttendancePunchKind;
  at: Date | number;
  /** Where the person was, when known: "Riyadh office". */
  place?: string;
}

export interface LeaveType extends LeaveTypeLike {
  name: string;
}

export interface LeaveRequestInput {
  typeId: string;
  /** "YYYY-MM-DD". */
  start: string;
  end: string;
  halfStart: boolean;
  halfEnd: boolean;
  reason: string;
  /** Working days the request counts for. */
  days: number;
}

export interface LeaveRequestRow extends LeaveRequestLike {
  id: string;
  employee: string;
  reason?: string;
  /** The manager's note on a rejection. */
  note?: string;
}

export type PayrollRunStatus = "draft" | "approved" | "paid";

export interface PayrollLine extends PayrollLineLike {
  id: string;
  employee: string;
  workedDays?: number;
  workingDays?: number;
}

export interface PayrollRun {
  id: string;
  /** "2026-09". */
  period: string;
  status: PayrollRunStatus;
  lines: readonly PayrollLine[];
  /** Day money leaves, "2026-09-28". */
  payDate?: string;
}
