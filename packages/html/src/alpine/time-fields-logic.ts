/**
 * Pure logic for the time fields: reading typed times ("930" becomes 09:30), stepping them, and time zones through Intl.
 * No React, no dependencies; time zone maths reuses the offset function of the time range picker.
 */
import { dayInZone, isTimeZone, zoneOffsetMs } from "./time-range-picker-logic";

/* ------------------------------------------------------------------ typed 24 hour times */

/** A time of day as "HH:mm" (24 hour), or "24:00" where an end of day is allowed. */
export type TimeValue = string;

const MINUTES_PER_DAY = 1440;

/** Latin digits for Arabic-Indic and Persian digits, so a keyboard in either language can type a time. */
function latinDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (ch) => String((ch.codePointAt(0) ?? 0) & 0xf));
}

export interface ParseTimeOptions {
  /** Accept 24:00 (and 2400) as the end of the day. Default false. */
  allowEndOfDay?: boolean;
}

/**
 * Reads what a person typed into a 24 hour field and returns "HH:mm", or null when it is not a time.
 *
 * "930" and "0930" and "9:30" and "9.30" and "9h30" are 09:30; "9" and "09" are 09:00; "2359" is 23:59. A trailing am / pm
 * (also ص / م) is honoured, so "9:30 pm" is 21:30. Minutes need two digits and hours run 0 to 23.
 */
export function parseTimeInput(input: string, options: ParseTimeOptions = {}): TimeValue | null {
  let text = latinDigits(input).trim().toLowerCase();
  if (!text) return null;

  let period: "am" | "pm" | null = null;
  const suffix = /\s*(a\.?m\.?|p\.?m\.?|a|p|ص|م)$/u.exec(text);
  if (suffix) {
    const s = suffix[1] ?? "";
    period = s.startsWith("p") || s === "م" ? "pm" : "am";
    text = text.slice(0, suffix.index).trim();
  }

  let hour: number;
  let minute: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,2})\s*[:.٫\s]\s*(\d{2})$/u.exec(text)) || (match = /^(\d{1,2})\s*h\s*(\d{2})$/u.exec(text))) {
    hour = Number(match[1]);
    minute = Number(match[2]);
  } else if ((match = /^(\d{1,2})\s*h?$/u.exec(text))) {
    hour = Number(match[1]);
    minute = 0;
  } else if ((match = /^(\d)(\d{2})$/u.exec(text)) || (match = /^(\d{2})(\d{2})$/u.exec(text))) {
    hour = Number(match[1]);
    minute = Number(match[2]);
  } else {
    return null;
  }

  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === "pm" ? 12 : 0);
  }
  if (hour === 24 && minute === 0 && options.allowEndOfDay && !period) return "24:00";
  if (hour > 23) return null;
  return formatTimeParts(hour, minute);
}

/** "09:30" from an hour and a minute. */
export function formatTimeParts(hour: number, minute: number): TimeValue {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Minutes since midnight of an "HH:mm" value, or null when it is not one. */
export function timeValueToMinutes(value: string | null | undefined): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (m > 59 || h > 24 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

/** "HH:mm" for minutes since midnight; values outside a day wrap around (1500 is 01:00, -30 is 23:30). */
export function minutesToTimeValue(minutes: number): TimeValue {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return formatTimeParts(Math.floor(wrapped / 60), wrapped % 60);
}

export interface StepTimeOptions {
  /** Earliest and latest allowed time. Stepping stops there instead of wrapping. */
  min?: TimeValue;
  max?: TimeValue;
  /** Wrap around midnight when there is no min or max. Default true. */
  wrap?: boolean;
}

/**
 * Moves a time by `delta` minutes and snaps it to the step, like an arrow key on a number field: 09:32 stepped up by 5
 * gives 09:35, stepped down gives 09:30. An empty value starts from `min`, or 09:00.
 */
export function stepTimeValue(value: string | null | undefined, delta: number, options: StepTimeOptions = {}): TimeValue {
  const min = timeValueToMinutes(options.min) ?? null;
  const max = timeValueToMinutes(options.max) ?? null;
  const current = timeValueToMinutes(value);
  const size = Math.abs(delta) || 1;
  let next: number;
  if (current === null) {
    next = min ?? 9 * 60;
  } else if (delta > 0) {
    next = (Math.floor(current / size) + 1) * size;
  } else {
    next = (Math.ceil(current / size) - 1) * size;
  }
  if (min === null && max === null && options.wrap !== false) return minutesToTimeValue(next);
  return minutesToTimeValue(Math.max(min ?? 0, Math.min(max ?? MINUTES_PER_DAY - 1, next)));
}

/** True when the time sits between `min` and `max` (both optional, inclusive). */
export function isTimeInRange(value: string, min?: string, max?: string): boolean {
  const v = timeValueToMinutes(value);
  if (v === null) return false;
  const lo = timeValueToMinutes(min);
  const hi = timeValueToMinutes(max);
  if (lo !== null && v < lo) return false;
  if (hi !== null && v > hi) return false;
  return true;
}

export interface TimeSpan {
  start: TimeValue;
  end: TimeValue;
}

/** Minutes from start to end. An end before the start is the next day when `overnight` is true, otherwise null (invalid). */
export function timeSpanMinutes(span: TimeSpan, overnight = false): number | null {
  const a = timeValueToMinutes(span.start);
  const b = timeValueToMinutes(span.end);
  if (a === null || b === null) return null;
  if (b >= a) return b - a;
  return overnight ? b + MINUTES_PER_DAY - a : null;
}

/** "8h 30m" (English) or "8 س 30 د" (Arabic) for a number of minutes. Digits are Latin in both. */
export function formatTimeSpan(minutes: number, locale = "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ar = locale.split("-")[0] === "ar";
  const hourUnit = ar ? "س" : "h";
  const minuteUnit = ar ? "د" : "m";
  const parts: string[] = [];
  if (h) parts.push(`${h}${ar ? " " : ""}${hourUnit}`);
  if (m || !h) parts.push(`${m}${ar ? " " : ""}${minuteUnit}`);
  return parts.join(" ");
}

/* ------------------------------------------------------------------ time zones */

/** Zones offered when the runtime cannot list them (very old engines). */
export const FALLBACK_TIME_ZONES: readonly string[] = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Baghdad",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Kuwait",
  "Asia/Riyadh",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
];

/** Every IANA zone the runtime knows, sorted, with "UTC" first. Falls back to a short list. */
export function listTimeZones(): string[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    zones = supported ? supported.call(Intl, "timeZone") : [];
  } catch {
    zones = [];
  }
  const base = zones.length ? zones : [...FALLBACK_TIME_ZONES];
  return ["UTC", ...base.filter((z) => z !== "UTC")];
}

/** The reader's own zone, or "UTC" when the runtime does not say. */
export function detectTimeZone(): string {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isTimeZone(zone) ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

/** Whether a name is a zone Intl knows. */
export const isIanaTimeZone = isTimeZone;

/** The zone's offset from UTC at `at`, in minutes (Riyadh is 180, Kolkata 330, New York in summer -240). */
export function timeZoneOffsetMinutes(at: Date, timeZone: string): number {
  return Math.round(zoneOffsetMs(at, timeZone) / 60_000);
}

/** "UTC+05:30" for 330 minutes, "UTC-04:00" for -240, "UTC+00:00" for 0. */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(Math.round(minutes));
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** "+3h", "-5h 30m" or "same time": how far ahead of `reference` a zone is. */
export function formatZoneDifference(minutes: number, locale = "en"): string {
  const ar = locale.split("-")[0] === "ar";
  if (minutes === 0) return ar ? "الوقت نفسه" : "same time";
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${formatTimeSpan(Math.abs(minutes), locale)}`;
}

export interface ZoneClockOptions {
  locale?: string;
  /** Include seconds. Default false. */
  seconds?: boolean;
  /** 12 or 24 hour clock. Default: what the locale uses. */
  hourCycle?: 12 | 24;
}

/** The wall clock time in a zone, with Latin digits: "09:30", "9:30 AM", "٩:٣٠" is never produced. */
export function formatZoneClock(at: Date, timeZone: string, options: ZoneClockOptions = {}): string {
  const locale = options.locale ?? "en";
  const base = `${locale}-u-nu-latn`;
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: options.hourCycle === 24 ? "2-digit" : "numeric",
    minute: "2-digit",
    ...(options.seconds ? { second: "2-digit" as const } : {}),
    ...(options.hourCycle ? { hour12: options.hourCycle === 12 } : {}),
  };
  try {
    return new Intl.DateTimeFormat(base, opts).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-u-nu-latn", opts).format(at);
  }
}

/** A short date in a zone ("Wed, 30 Sep"), for showing that another zone is on a different day. */
export function formatZoneDate(at: Date, timeZone: string, locale = "en"): string {
  try {
    return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { timeZone, weekday: "short", day: "numeric", month: "short" }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-u-nu-latn", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(at);
  }
}

/** -1, 0 or 1: whether the calendar day in `timeZone` is before, the same as or after the day in `reference`. */
export function zoneDayDifference(at: Date, timeZone: string, reference: string): -1 | 0 | 1 {
  const a = dayInZone(at, timeZone);
  const b = dayInZone(at, reference);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "Buenos Aires" for "America/Argentina/Buenos_Aires"; the whole name for zones without a city ("UTC"). */
export function timeZoneCity(timeZone: string): string {
  const last = timeZone.split("/").pop() ?? timeZone;
  return last.replace(/_/g, " ");
}

/** "Asia" for "Asia/Riyadh"; "" for zones without a region. */
export function timeZoneRegion(timeZone: string): string {
  const parts = timeZone.split("/");
  return parts.length > 1 ? (parts[0] ?? "").replace(/_/g, " ") : "";
}

/** The zone's long name in a language: "Arabian Standard Time", "توقيت السعودية". Empty when unavailable. */
export function timeZoneLongName(at: Date, timeZone: string, locale = "en"): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "long" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

const OFFSET_QUERY = /^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/;

/** Reads "UTC+3", "gmt-5:30", "+03:00" or "+0530" as minutes from UTC, or null when the text is not an offset. */
export function parseOffsetQuery(query: string): number | null {
  const match = OFFSET_QUERY.exec(query.trim().toLowerCase());
  if (!match) return null;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  if (Number(match[3] ?? 0) > 59 || Number(match[2]) > 14) return null;
  return match[1] === "-" ? -minutes : minutes;
}

const defaultFold = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/**
 * Whether a zone matches a search. Matches the IANA id, the city, the long name in the locale ("Arabian", "توقيت") and the
 * offset ("utc+3", "+05:30"). Pass `fold` to normalise Arabic (see `normalizeForSearch`).
 */
export function matchTimeZone(timeZone: string, query: string, at: Date, locale = "en", fold: (text: string) => string = defaultFold): boolean {
  const q = query.trim();
  if (!q) return true;
  const wanted = parseOffsetQuery(q);
  if (wanted !== null) return timeZoneOffsetMinutes(at, timeZone) === wanted;
  const hay = fold(`${timeZone.replace(/_/g, " ")} ${timeZoneLongName(at, timeZone, locale)} ${formatUtcOffset(timeZoneOffsetMinutes(at, timeZone))}`);
  return fold(q)
    .split(/\s+/)
    .every((word) => hay.includes(word));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * The instant at which the wall clock of `timeZone` reads `time` on `day` ("2026-09-30", "09:30"). Times skipped by a
 * daylight saving change resolve to the instant just after the gap.
 */
export function zonedWallTimeToInstant(day: string, time: string, timeZone: string): Date | null {
  const minutes = timeValueToMinutes(time);
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (minutes === null || !dayMatch) return null;
  const wall = Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])) + minutes * 60_000;
  // The offset just before and just after the wall time; whichever reproduces the wall time is the answer.
  const candidates = [-1, 1].map((sign) => wall - zoneOffsetMs(new Date(wall + sign * 86_400_000), timeZone)).sort((x, y) => x - y);
  const valid = candidates.filter((instant) => zoneOffsetMs(new Date(instant), timeZone) + instant === wall);
  // A repeated hour takes its first occurrence; a skipped hour moves forward, as Date does.
  return new Date(valid.length ? Math.min(...valid) : Math.max(...candidates));
}

/** The wall clock date and time a moment reads in a zone: `{ day: "2026-09-30", time: "12:30" }`. */
export function wallTimeInZone(at: Date, timeZone: string): { day: string; time: TimeValue } {
  const local = new Date(at.getTime() + zoneOffsetMs(at, timeZone));
  return { day: `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`, time: formatTimeParts(local.getUTCHours(), local.getUTCMinutes()) };
}

/** Converts a wall clock time from one zone to another: 09:30 in Riyadh on a day is 08:30 in Cairo (summer time) or 06:30 in UTC. */
export function convertWallTime(day: string, time: string, from: string, to: string): { day: string; time: TimeValue } | null {
  const instant = zonedWallTimeToInstant(day, time, from);
  return instant ? wallTimeInZone(instant, to) : null;
}
