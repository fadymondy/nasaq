// Pure helpers for the setup wizard: which required steps are still open, and how far along it is.

export interface SetupStepLike {
  id: string;
  optional?: boolean;
}

/** Required steps the server has not marked done. With no `completed` list nothing is reported missing: the gate is `canFinish` alone. */
export function missingSteps<T extends SetupStepLike>(steps: readonly T[], completed?: readonly string[]): T[] {
  if (!completed) return [];
  return steps.filter((s) => !s.optional && !completed.includes(s.id));
}

/** Whole-number percentage of steps behind the current one, for the compact progress bar. */
export function setupProgress(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(current, 0), total) / total) * 100);
}

export function clampStep(index: number, total: number): number {
  return Math.min(Math.max(index, 0), Math.max(total - 1, 0));
}

/** Seconds since `startedAt`, floored and never negative. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
