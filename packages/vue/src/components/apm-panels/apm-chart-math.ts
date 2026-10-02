// Internal: the axis maths of the hand-drawn APM charts. Not exported from the index.

/** A "nice" top for the y axis: the smallest 1, 2, 2.5, 5 or 10 step (times a power of ten) that fits `max` in `intervals` steps. */
export function niceStep(max: number, intervals = 4): number {
  if (!(max > 0) || !Number.isFinite(max)) return 1 / intervals;
  const raw = max / intervals;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const f = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return f * mag;
}

/** The y ticks from 0 to the nice top, top first (the order they are drawn down the axis). */
export function niceTicks(max: number, intervals = 4): number[] {
  const step = niceStep(max, intervals);
  return Array.from({ length: intervals + 1 }, (_, i) => (intervals - i) * step);
}

/** Indices of the x labels to show: first, middle and last of the points, without repeats. */
export function labelIndices(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, 1];
  return [0, Math.floor((count - 1) / 2), count - 1];
}
