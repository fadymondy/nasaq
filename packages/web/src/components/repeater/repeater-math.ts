/*
 * Pure list operations behind Repeater. Everything returns a new array and never mutates its input.
 * Repeater applies each operation to the values and to the parallel list of row keys.
 */

export const canAdd = (count: number, max?: number) => max === undefined || count < max;
export const canRemove = (count: number, min = 0) => count > min;

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const at = clamp(index, 0, list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  if (index < 0 || index >= list.length) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

/** Moves one item. The target index is clamped to the list. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = clamp(to, 0, list.length - 1);
  if (target === from) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** The index a reorder key moves a row to, or null when the key is not a reorder key. */
export function keyTarget(key: string, index: number, count: number): number | null {
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** Brings a key list to `length`: extra keys drop, missing ones are made. Existing keys keep their place. */
export function fitKeys(keys: readonly string[], length: number, makeKey: () => string): string[] {
  if (keys.length === length) return [...keys];
  if (keys.length > length) return keys.slice(0, length);
  const next = [...keys];
  while (next.length < length) next.push(makeKey());
  return next;
}
