/** Pure helpers for StatusLabelManager: stages, grouping, reordering and name validation. */

export const STATUS_STAGES = ["backlog", "todo", "active", "review", "done", "canceled"] as const;
export type StatusStage = (typeof STATUS_STAGES)[number];

export const STATUS_HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
export type StatusHue = (typeof STATUS_HUES)[number];

export interface WorkStatus {
  id: string;
  name: string;
  hue: StatusHue;
  stage: StatusStage;
  /** How many items use it. Shown so a delete is an informed one. */
  usage?: number;
}

export interface WorkLabel {
  id: string;
  name: string;
  hue: StatusHue;
  usage?: number;
}

export type NameError = "empty" | "tooLong" | "duplicate";

export const NAME_MAX = 32;

/** Checks a name against the others in its list (case-insensitive). `selfId` is ignored so a rename to itself passes. */
export function validateName(name: string, others: readonly { id: string; name: string }[], selfId?: string): NameError | null {
  const v = name.trim();
  if (v === "") return "empty";
  if ([...v].length > NAME_MAX) return "tooLong";
  const key = v.toLowerCase();
  if (others.some((o) => o.id !== selfId && o.name.trim().toLowerCase() === key)) return "duplicate";
  return null;
}

/** Statuses grouped by stage in stage order, keeping their relative order inside a stage. Empty stages are kept. */
export function groupByStage(statuses: readonly WorkStatus[]): { stage: StatusStage; items: WorkStatus[] }[] {
  return STATUS_STAGES.map((stage) => ({ stage, items: statuses.filter((s) => s.stage === stage) }));
}

/** New id order after moving `id` one step up (-1) or down (+1) within its stage. Returns the same order at an edge. */
export function moveWithinStage(statuses: readonly WorkStatus[], id: string, delta: -1 | 1): string[] {
  const ids = statuses.map((s) => s.id);
  const item = statuses.find((s) => s.id === id);
  if (!item) return ids;
  const siblings = statuses.filter((s) => s.stage === item.stage).map((s) => s.id);
  const from = siblings.indexOf(id);
  const to = from + delta;
  if (to < 0 || to >= siblings.length) return ids;
  const target = siblings[to] as string;
  const a = ids.indexOf(id);
  const b = ids.indexOf(target);
  ids[a] = target;
  ids[b] = id;
  return ids;
}

/** Sorts statuses into stage order (stable), so a saved flat list always reads left to right through the workflow. */
export function sortByStage(statuses: readonly WorkStatus[]): WorkStatus[] {
  return groupByStage(statuses).flatMap((g) => g.items);
}

/** True when a workflow has somewhere for work to finish: at least one `done` status. */
export const hasDoneStage = (statuses: readonly WorkStatus[]) => statuses.some((s) => s.stage === "done");
