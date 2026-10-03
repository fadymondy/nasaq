// Retention math for a trash bin. Pure: no runtime imports, so it can be tested with node --test.

export type TrashDateInput = Date | number | string;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ms = (value: TrashDateInput): number => (value instanceof Date ? value.getTime() : new Date(value).getTime());

export type TrashUrgency = "safe" | "soon" | "urgent" | "expired" | "kept";

export interface TrashRetention {
  /** When the item is deleted for good, or null when it is kept until someone empties the bin. */
  purgeAt: Date | null;
  /** Whole days left, rounded up: 0.2 days left reads "1 day". 0 once expired. Null when kept. */
  daysLeft: number | null;
  /** Whole hours left, rounded up. Used when under a day is left. Null when kept. */
  hoursLeft: number | null;
  expired: boolean;
  urgency: TrashUrgency;
  /** How much of the retention window has passed, 0 to 1. Null when kept. */
  elapsed: number | null;
}

export interface TrashRetentionOptions {
  /** Days an item stays. `0` or `null` keep items until the bin is emptied. */
  retentionDays: number | null;
  /** Overrides `retentionDays` for this item. */
  purgeAt?: TrashDateInput | null;
  now?: TrashDateInput;
  /** Days left at or under which the item is "urgent". Default 3. */
  urgentDays?: number;
  /** Days left at or under which the item is "soon". Default 7. */
  soonDays?: number;
}

/** When and how urgently an item is purged. `deletedAt` starts the clock. */
export function trashRetention(deletedAt: TrashDateInput, options: TrashRetentionOptions): TrashRetention {
  const { retentionDays, purgeAt, now = Date.now(), urgentDays = 3, soonDays = 7 } = options;
  const start = ms(deletedAt);
  let end: number | null = null;
  if (purgeAt !== undefined && purgeAt !== null) end = ms(purgeAt);
  else if (retentionDays && retentionDays > 0) end = start + retentionDays * DAY;
  if (end === null || Number.isNaN(end) || Number.isNaN(start)) {
    return { purgeAt: null, daysLeft: null, hoursLeft: null, expired: false, urgency: "kept", elapsed: null };
  }
  const left = end - ms(now);
  const expired = left <= 0;
  const daysLeft = expired ? 0 : Math.ceil(left / DAY);
  const hoursLeft = expired ? 0 : Math.ceil(left / HOUR);
  const total = end - start;
  const elapsed = total > 0 ? Math.min(1, Math.max(0, (ms(now) - start) / total)) : 1;
  const urgency: TrashUrgency = expired ? "expired" : left <= urgentDays * DAY ? "urgent" : left <= soonDays * DAY ? "soon" : "safe";
  return { purgeAt: new Date(end), daysLeft, hoursLeft, expired, urgency, elapsed };
}

/** Items whose time is up: a job would purge these now. */
export function trashExpiredIds<T extends { id: string; deletedAt: TrashDateInput; purgeAt?: TrashDateInput | null }>(
  items: readonly T[],
  options: Omit<TrashRetentionOptions, "purgeAt">,
): string[] {
  return items.filter((item) => trashRetention(item.deletedAt, { ...options, purgeAt: item.purgeAt }).expired).map((item) => item.id);
}

/** Oldest deletions first is not what people want: show what is about to disappear first. Stable for ties. */
export function trashSortByPurge<T extends { deletedAt: TrashDateInput; purgeAt?: TrashDateInput | null }>(
  items: readonly T[],
  options: Omit<TrashRetentionOptions, "purgeAt">,
): T[] {
  const key = (item: T) => trashRetention(item.deletedAt, { ...options, purgeAt: item.purgeAt }).purgeAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return items
    .map((item, index) => ({ item, index, at: key(item) }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((entry) => entry.item);
}
