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

export interface StatusIncident {
  id: string;
  title: string;
  status: string;
  impact: string;
  /** ISO date-time. */
  startedAt: string;
  resolvedAt?: string | null;
  services?: string[];
  updates?: { at: string; status: string; body: string }[];
}

/** Newest first, ties keep their order (the same as the incident list). */
export function sortIncidents<T extends { startedAt: string }>(list: readonly T[]): T[] {
  return list
    .map((item, index) => ({ item, index, at: new Date(item.startedAt).getTime() || 0 }))
    .sort((a, b) => b.at - a.at || a.index - b.index)
    .map((x) => x.item);
}

/** "2 h 5 min": days, hours and minutes of the span, at least one minute. */
export function incidentDuration(from: string, to: string, units: { d: string; h: string; m: string }): string {
  const total = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return h ? `${d} ${units.d} ${h} ${units.h}` : `${d} ${units.d}`;
  if (h > 0) return m ? `${h} ${units.h} ${m} ${units.m}` : `${h} ${units.h}`;
  return `${m} ${units.m}`;
}
