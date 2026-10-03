/**
 * The next value of a bar that creeps forward while it waits. Pure. It moves fast at first and slows as it nears
 * 94, so it never looks finished before the work is. `value` and the result are percentages.
 */
export function nextTrickle(value: number): number {
  if (value >= 94) return value;
  const step = value < 20 ? 10 : value < 50 ? 4 : value < 80 ? 2 : 0.5;
  return Math.min(94, value + step);
}
