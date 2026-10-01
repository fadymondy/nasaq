/** Pure helpers for profile cards: presence, the person's local time and how far it is from yours. */

export type Presence = "online" | "away" | "busy" | "offline";

export const PRESENCE_ORDER: readonly Presence[] = ["online", "away", "busy", "offline"];

/** Sort key: people who are around come first. */
export const presenceRank = (presence: Presence | undefined): number => PRESENCE_ORDER.indexOf(presence ?? "offline");

/** True for a time zone the runtime knows. */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Minutes east of UTC for `timeZone` at `at`. */
export function zoneOffsetMinutes(timeZone: string, at: Date | number): number {
  const date = new Date(at);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Their clock minus yours, in minutes (positive: they are ahead). */
export function offsetFrom(theirZone: string, yourZone: string, at: Date | number): number {
  return zoneOffsetMinutes(theirZone, at) - zoneOffsetMinutes(yourZone, at);
}

/** The time of day in `timeZone`, for example `3:41 PM`. Latin digits, so it reads the same in every locale. */
export function localTimeLabel(timeZone: string, at: Date | number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone, numberingSystem: "latn" }).format(at);
}

/** Whether it is night (before 7:00 or from 22:00) where they are, to hint that a message can wait. */
export function isNightIn(timeZone: string, at: Date | number): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(at));
  return hour < 7 || hour >= 22;
}

/** `{ hours, minutes }` of an offset, always positive; `direction` says which way. */
export function describeOffset(minutes: number): { direction: "same" | "ahead" | "behind"; hours: number; minutes: number } {
  if (minutes === 0) return { direction: "same", hours: 0, minutes: 0 };
  const abs = Math.abs(minutes);
  return { direction: minutes > 0 ? "ahead" : "behind", hours: Math.floor(abs / 60), minutes: abs % 60 };
}
