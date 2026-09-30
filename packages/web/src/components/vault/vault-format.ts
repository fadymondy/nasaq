/** Pure helpers for the vault: grouping, expiry and the mask. No React. */

export const VAULT_MASK = "••••••••••••";

export interface GroupedItem {
  group: string;
  name: string;
}

/** Group items by `group` (blank goes last as ""), groups and names sorted, stable and locale-aware. */
export function groupSecrets<T extends GroupedItem>(items: readonly T[], locale = "en"): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.group.trim();
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...map.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : collator.compare(a, b)))
    .map(([group, list]) => ({ group, items: [...list].sort((x, y) => collator.compare(x.name, y.name)) }));
}

export type ExpiryState = "none" | "ok" | "soon" | "expired";

const DAY = 86_400_000;

/** `soon` means it expires within `soonDays` (default 14). */
export function expiryState(expiresAt: Date | number | string | undefined | null, now: Date | number | string = Date.now(), soonDays = 14): ExpiryState {
  if (expiresAt === undefined || expiresAt === null || expiresAt === "") return "none";
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return "none";
  const t = new Date(now).getTime();
  if (at <= t) return "expired";
  return at - t <= soonDays * DAY ? "soon" : "ok";
}

/** Whole days from `now` to `expiresAt` (negative when past), rounded toward the future. */
export function daysUntil(expiresAt: Date | number | string, now: Date | number | string = Date.now()): number {
  return Math.ceil((new Date(expiresAt).getTime() - new Date(now).getTime()) / DAY);
}

/** Text that matches the secret's own fields (never its value). */
export function matchesSecret(secret: { name: string; group: string; description?: string | undefined }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [secret.name, secret.group, secret.description ?? ""].some((v) => v.toLowerCase().includes(q));
}
