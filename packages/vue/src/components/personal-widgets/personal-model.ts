/* Pure logic for the public profile: time zones, working hours, tenure and skill grouping. No imports, so node --test runs it directly. */

export type ProfileAvailability = "open" | "limited" | "closed";

/** True when `zone` is an IANA time zone this runtime knows ("Asia/Riyadh"). */
export function isKnownTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Hour (0-23), minute and weekday (0 = Sunday) of `now` in `zone`. */
export function partsIn(now: Date | number, zone: string): { hour: number; minute: number; weekday: number } {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday as string);
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), weekday };
}

export interface ProfileWorkingHours {
  /** First working hour, 0-23. Default 9. */
  start?: number;
  /** Hour work ends, 1-24. Default 17. */
  end?: number;
  /** Working weekdays, 0 = Sunday. Default Sunday to Thursday. */
  days?: number[];
}

/** Whether it is working time in `zone` right now. */
export function isWorkingNow(now: Date | number, zone: string, { start = 9, end = 17, days = [0, 1, 2, 3, 4] }: ProfileWorkingHours = {}): boolean {
  const { hour, minute, weekday } = partsIn(now, zone);
  const h = hour + minute / 60;
  return days.includes(weekday) && h >= start && h < end;
}

/** Hours between the viewer's zone and the owner's at `now` (halves for :30 zones). Positive when the owner is ahead. */
export function offsetHours(now: Date | number, ownerZone: string, viewerZone: string): number {
  const at = (z: string) => {
    const { hour, minute, weekday } = partsIn(now, z);
    return weekday * 1440 + hour * 60 + minute;
  };
  let diff = at(ownerZone) - at(viewerZone);
  if (diff > 3.5 * 1440) diff -= 7 * 1440;
  if (diff < -3.5 * 1440) diff += 7 * 1440;
  return Math.round((diff / 60) * 2) / 2;
}

export interface Tenure {
  years: number;
  months: number;
}

/** Whole years and months from `start` to `end` (default now). Never negative. */
export function tenureBetween(start: string | number | Date, end: string | number | Date = Date.now()): Tenure {
  const a = new Date(start);
  const b = new Date(end);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

export interface Role {
  start: string | number | Date;
  /** Missing means current. */
  end?: string | number | Date | null;
}

/** Total time worked across roles, counting overlapping periods once. */
export function totalExperience(roles: Role[], now: Date | number = Date.now()): Tenure {
  const spans = roles
    .map((r) => [new Date(r.start).getTime(), new Date(r.end ?? now).getTime()] as const)
    .filter(([s, e]) => e > s)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of spans) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  let months = 0;
  for (const [s, e] of merged) {
    const t = tenureBetween(s, e);
    months += t.years * 12 + t.months;
  }
  return { years: Math.floor(months / 12), months: months % 12 };
}

export interface SkillLike {
  name: string;
  group?: string;
  /** 1-5. */
  level?: number;
}

/** Skills grouped by `group` in first-seen order, strongest first inside each group. Ungrouped skills go last under "". */
export function groupSkills<T extends SkillLike>(skills: T[]): { group: string; skills: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const s of skills) {
    const g = s.group ?? "";
    if (!map.has(g)) {
      map.set(g, []);
      order.push(g);
    }
    map.get(g)?.push(s);
  }
  order.sort((a, b) => (a === "" ? 1 : 0) - (b === "" ? 1 : 0));
  return order.map((group) => ({ group, skills: [...(map.get(group) as T[])].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)) }));
}

/** Distinct values of a field across items in first-seen order, for filter tabs. */
export function distinct<T>(items: T[], pick: (item: T) => string | undefined): string[] {
  const out: string[] = [];
  for (const i of items) {
    const v = pick(i);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}
