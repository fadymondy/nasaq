/*
 * Funnel maths. A funnel is an ordered list of steps with how many people reached each one. Conversion is a share of
 * people, 0 to 1. Pure, shared by the UI and the tests.
 */

export interface FunnelStepInput {
  id: string;
  label: string;
  /** People (or sessions) that reached this step. */
  count: number;
}

export interface FunnelRow<T extends FunnelStepInput = FunnelStepInput> {
  step: T;
  /** Share of the previous step that reached this one. 1 for the first step. */
  fromPrevious: number;
  /** Share of the first step that reached this one. */
  fromFirst: number;
  /** People lost between the previous step and this one. 0 for the first step. */
  dropped: number;
  /** Share of the previous step lost here: 1 minus `fromPrevious`. */
  dropRate: number;
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
}

/** Per-step conversion and drop-off. A step bigger than the one before it counts as no drop (it never goes negative). */
export function funnelRows<T extends FunnelStepInput>(steps: readonly T[]): FunnelRow<T>[] {
  const first = steps[0]?.count ?? 0;
  return steps.map((step, i) => {
    const prev = i === 0 ? step.count : steps[i - 1]!.count;
    const fromPrevious = i === 0 ? (first > 0 ? 1 : 0) : share(step.count, prev);
    return {
      step,
      fromPrevious,
      fromFirst: i === 0 ? fromPrevious : share(step.count, first),
      dropped: i === 0 ? 0 : Math.max(0, prev - step.count),
      dropRate: i === 0 ? 0 : first > 0 && prev > 0 ? 1 - fromPrevious : 0,
    };
  });
}

/** Last step over first step. 0 for an empty funnel or one with no entrants. */
export function overallConversion(steps: readonly FunnelStepInput[]): number {
  if (steps.length < 2) return steps.length === 1 && steps[0]!.count > 0 ? 1 : 0;
  return share(steps[steps.length - 1]!.count, steps[0]!.count);
}

/** Index of the step where the biggest share of people is lost, or -1 when nobody drops (or fewer than two steps). */
export function biggestDropIndex(steps: readonly FunnelStepInput[]): number {
  let best = -1;
  let bestRate = 0;
  funnelRows(steps).forEach((r, i) => {
    if (i > 0 && r.dropRate > bestRate) {
      best = i;
      bestRate = r.dropRate;
    }
  });
  return best;
}

/** Bar length as a share of the widest bar (the first step), never thinner than `min` so a tiny step stays visible. 0 to 1. */
export function barWidth(count: number, first: number, min = 0.03): number {
  if (first <= 0 || count <= 0) return 0;
  return Math.min(1, Math.max(min, count / first));
}

export type WindowUnit = "hour" | "day" | "week";

export interface FunnelWindow {
  amount: number;
  unit: WindowUnit;
}

const UNIT_MS: Record<WindowUnit, number> = { hour: 3_600_000, day: 86_400_000, week: 604_800_000 };

/** The window in milliseconds, for the query. */
export function windowMs(w: FunnelWindow): number {
  return Math.max(1, Math.floor(w.amount)) * UNIT_MS[w.unit];
}

/** A compact key such as "7d", "24h" or "2w" for URLs and API params. */
export function windowKey(w: FunnelWindow): string {
  return `${Math.max(1, Math.floor(w.amount))}${w.unit === "hour" ? "h" : w.unit === "day" ? "d" : "w"}`;
}

/** Moves the step at `from` to index `to` (clamped). Returns a new array. */
export function moveStep<T>(steps: readonly T[], from: number, to: number): T[] {
  const out = [...steps];
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.min(Math.max(to, 0), out.length), 0, item!);
  return out;
}

/** Inserts a step at the end, or at `index`. Returns a new array. */
export function insertStep<T>(steps: readonly T[], step: T, index: number = steps.length): T[] {
  const out = [...steps];
  out.splice(Math.min(Math.max(index, 0), out.length), 0, step);
  return out;
}

export function removeStep<T>(steps: readonly T[], index: number): T[] {
  return steps.filter((_, i) => i !== index);
}
