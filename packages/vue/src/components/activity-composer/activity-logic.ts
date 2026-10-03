/** Pure helpers for ActivityComposer and ActivityTimeline: ordering, overdue tasks and the composer's input. */
import { ListTodo, NotebookPen, Phone, Users, Zap } from "lucide-vue-next";


/** `event` is a system entry (status changed, assigned). It can be shown but not composed. */
export type LoggedActivityKind = "note" | "call" | "meeting" | "task" | "event";
export const COMPOSABLE_KINDS = ["note", "call", "meeting", "task"] as const;
export type ComposableKind = (typeof COMPOSABLE_KINDS)[number];

export interface ActivityActor {
  name: string;
  avatar?: string;
}

export interface ActivityRecord {
  id: string;
  kind: LoggedActivityKind;
  /** The note, the call summary, the meeting minutes, the task, or the event sentence. */
  body: string;
  /** When it happened. For a task, when it is due. */
  at: Date | string | number;
  actor?: ActivityActor;
  /** Calls and meetings. */
  durationMinutes?: number;
  /** Tasks only. */
  done?: boolean;
  /** When a task was completed. */
  doneAt?: Date | string | number | null;
}

export interface ActivityInput {
  kind: ComposableKind;
  body: string;
  at: Date;
  durationMinutes?: number;
}

const ms = (d: Date | string | number) => new Date(d).getTime();

/** A task that is not done. */
export const isOpenTask = (a: ActivityRecord) => a.kind === "task" && !a.done;

/** An open task whose due time has passed. */
export const isOverdue = (a: ActivityRecord, now: number = Date.now()) => isOpenTask(a) && ms(a.at) < now;

/**
 * Open tasks first (soonest due first, so overdue ones lead), then the rest of the history, newest first. Done tasks
 * count as history and sit at the time they were completed.
 */
export function splitActivities(records: readonly ActivityRecord[]): { open: ActivityRecord[]; history: ActivityRecord[] } {
  const open = records.filter(isOpenTask).sort((a, b) => ms(a.at) - ms(b.at));
  const at = (a: ActivityRecord) => ms(a.kind === "task" && a.done && a.doneAt ? a.doneAt : a.at);
  const history = records.filter((a) => !isOpenTask(a)).sort((a, b) => at(b) - at(a));
  return { open, history };
}

/** Counts per kind, for the filter chips. */
export function countByKind(records: readonly ActivityRecord[]): Record<LoggedActivityKind, number> {
  const counts: Record<LoggedActivityKind, number> = { note: 0, call: 0, meeting: 0, task: 0, event: 0 };
  for (const r of records) counts[r.kind]++;
  return counts;
}

export type ActivityError = "empty" | "badDate" | "badDuration";

/** Why an input can't be saved, or null. A call or meeting may leave the duration blank. */
export function validateActivity(input: { kind: ComposableKind; body: string; at: Date | null; durationMinutes?: number | null }): ActivityError | null {
  if (input.body.trim() === "") return "empty";
  if (!input.at || Number.isNaN(input.at.getTime())) return "badDate";
  if (input.durationMinutes != null && (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0 || input.durationMinutes > 24 * 60)) return "badDuration";
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date as the value of `<input type="datetime-local">` (local time, minutes). */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The Date of a datetime-local value, or null when empty or invalid. */
export function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The glyph of each kind (lucide-vue-next components). */
export const ACTIVITY_ICONS = { note: NotebookPen, call: Phone, meeting: Users, task: ListTodo, event: Zap } as const;
