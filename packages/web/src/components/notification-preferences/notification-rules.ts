/** Pure rules of notification preferences: the matrix, quiet hours, the digest and destinations. No React. */

export type NotificationChannel = "email" | "push" | "whatsapp" | "desktop";
export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = ["email", "push", "whatsapp", "desktop"];

export interface NotificationKind {
  id: string;
  label: string;
  description?: string;
  /** Section heading the kind is listed under. */
  group?: string;
  /** Channels that cannot be turned off for this kind, for example security email. They show ticked and locked. */
  locked?: readonly NotificationChannel[];
}

export type NotificationMatrix = Record<string, Partial<Record<NotificationChannel, boolean>>>;

export interface QuietHours {
  enabled: boolean;
  /** "HH:mm", 24-hour. */
  from: string;
  to: string;
}

export type Batching = "instant" | "hourly" | "daily";

export interface DigestSchedule {
  enabled: boolean;
  frequency: "daily" | "weekly";
  /** "HH:mm". */
  time: string;
  /** 0 (Sunday) to 6. Used when weekly. */
  day: number;
}

export interface NotificationPrefs {
  matrix: NotificationMatrix;
  quietHours: QuietHours;
  /** The most notifications sent per day; `null` for no limit. */
  dailyCap: number | null;
  batching: Batching;
  digest: DigestSchedule;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  matrix: {},
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
  dailyCap: null,
  batching: "instant",
  digest: { enabled: false, frequency: "daily", time: "08:00", day: 1 },
};

export const isOn = (prefs: NotificationPrefs, kind: string, channel: NotificationChannel) => !!prefs.matrix[kind]?.[channel];

/** Whether the cell is fixed on. */
export const isLocked = (kind: NotificationKind, channel: NotificationChannel) => !!kind.locked?.includes(channel);

export function setCell(prefs: NotificationPrefs, kind: NotificationKind, channel: NotificationChannel, on: boolean): NotificationPrefs {
  if (isLocked(kind, channel)) return prefs;
  return { ...prefs, matrix: { ...prefs.matrix, [kind.id]: { ...prefs.matrix[kind.id], [channel]: on } } };
}

/** Turn a whole channel on or off for every kind that allows it. */
export function setChannel(prefs: NotificationPrefs, kinds: readonly NotificationKind[], channel: NotificationChannel, on: boolean): NotificationPrefs {
  return kinds.reduce((p, k) => setCell(p, k, channel, on), prefs);
}

/** "all", "none" or "some" for a channel across the kinds that can change. */
export function channelState(prefs: NotificationPrefs, kinds: readonly NotificationKind[], channel: NotificationChannel): "all" | "none" | "some" {
  const free = kinds.filter((k) => !isLocked(k, channel));
  const on = free.filter((k) => isOn(prefs, k.id, channel)).length;
  return free.length === 0 || on === 0 ? "none" : on === free.length ? "all" : "some";
}

/** Locked cells are always on, whatever the stored matrix says. */
export function effectiveOn(prefs: NotificationPrefs, kind: NotificationKind, channel: NotificationChannel) {
  return isLocked(kind, channel) || isOn(prefs, kind.id, channel);
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Length of the quiet window in minutes. A window that ends before it starts runs overnight. Equal times mean none. */
export function quietMinutes(q: Pick<QuietHours, "from" | "to">): number {
  const d = toMinutes(q.to) - toMinutes(q.from);
  return d === 0 ? 0 : d > 0 ? d : d + 1440;
}

/** Is `date` (local time) inside the quiet hours? Handles windows that cross midnight. */
export function isQuietNow(q: QuietHours, date: Date): boolean {
  if (!q.enabled) return false;
  const from = toMinutes(q.from);
  const to = toMinutes(q.to);
  if (from === to) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return from < to ? now >= from && now < to : now >= from || now < to;
}

/** The next time the digest goes out after `now` (local time), or `null` when it is off. */
export function nextDigest(d: DigestSchedule, now: Date): Date | null {
  if (!d.enabled) return null;
  const [h, m] = d.time.split(":").map(Number);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  if (d.frequency === "weekly") {
    let add = (d.day - at.getDay() + 7) % 7;
    if (add === 0 && at.getTime() <= now.getTime()) add = 7;
    at.setDate(at.getDate() + add);
  } else if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

/** A daily cap must be a whole number of at least 1, or empty for no limit. Returns an error key or null. */
export function capProblem(raw: string): "format" | null {
  const s = raw.trim();
  if (s === "") return null;
  return /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 1000 ? null : "format";
}

export type DestinationKind = "email" | "webhook";

export interface NotificationDestination {
  id: string;
  kind: DestinationKind;
  /** The email address or the https URL. */
  target: string;
  label?: string;
  /** An email destination is confirmed once its owner clicks the link we send. */
  verified?: boolean;
}

/** Validate a destination. Emails need one at sign; webhooks need an https URL with a host. */
export function destinationProblem(kind: DestinationKind, target: string): "empty" | "email" | "url" | "https" | null {
  const s = target.trim();
  if (!s) return "empty";
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? null : "email";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return "https";
    return u.hostname.includes(".") || u.hostname === "localhost" ? null : "url";
  } catch {
    return "url";
  }
}
