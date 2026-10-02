// Pure helpers of the status page manager, ported from status-page-manager-format.ts.

export interface StatusServiceDraft {
  id: string;
  name: string;
  visible: boolean;
}

/** Lowercase letters, digits and single dashes, not starting or ending with a dash. */
export const isValidStatusSlug = (s: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

/** Move the item at `index` by `delta` places and return a new array. Out of range moves return the array unchanged (copied). */
export function moveStatusItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const next = [...list];
  const to = index + delta;
  if (index < 0 || index >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item as T);
  return next;
}
