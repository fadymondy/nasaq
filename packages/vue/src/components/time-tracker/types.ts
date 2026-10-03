export interface TimeTask {
  id: string;
  name: string;
}

export interface TimeProject {
  id: string;
  name: string;
  tasks?: readonly TimeTask[];
}

export interface TimeEntry {
  id: string;
  /** Local date key, "YYYY-MM-DD". */
  date: string;
  /** Whole seconds. */
  seconds: number;
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface TimerSelection {
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface RunningTimer extends TimerSelection {
  /** When the timer started (ms since epoch, or a Date). */
  startedAt: number | Date;
}

export interface StoppedTimer extends TimerSelection {
  startedAt: number;
  seconds: number;
}

export interface TimeEntryInput {
  date: string;
  seconds: number;
  projectId: string;
  taskId?: string;
  note?: string;
}

export type TimeResult = void | { error?: string };
export type TimesheetView = "day" | "week";

export function lookupTime(projects: readonly TimeProject[], projectId: string, taskId?: string) {
  const project = projects.find((p) => p.id === projectId);
  const task = taskId ? project?.tasks?.find((x) => x.id === taskId) : undefined;
  return { project: project?.name ?? projectId, task: task?.name };
}
