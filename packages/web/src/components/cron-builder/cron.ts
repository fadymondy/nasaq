/*
 * Cron, without a dependency: parse a five-field expression, list its next runs in any IANA timezone, describe it in
 * English or Arabic, and translate between an expression and the "every day at 09:00" form a person fills in.
 * Pure functions only: nothing here touches React or the DOM.
 */

export interface ParsedCron {
  minutes: number[];
  hours: number[];
  /** Days of the month, 1 to 31. */
  days: number[];
  /** Months, 1 to 12. */
  months: number[];
  /** Days of the week, 0 (Sunday) to 6. Seven is folded into zero. */
  weekdays: number[];
  /** The day-of-month field is a bare `*` (or `?`). With both day fields restricted, either one matching is enough. */
  anyDay: boolean;
  anyWeekday: boolean;
}

export type CronErrorCode = "empty" | "fields" | "syntax" | "range" | "step";

export interface CronError {
  code: CronErrorCode;
  /** 0 minute, 1 hour, 2 day of month, 3 month, 4 day of week. `-1` when the whole expression is at fault. */
  field: number;
  /** The offending text. */
  token?: string;
}

export type CronResult = { ok: true; value: ParsedCron } | { ok: false; error: CronError };

export const CRON_MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const RANGES: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Splits an expression into its five fields, expanding `@daily` style macros. `null` when there are not five. */
export function cronFields(expr: string): string[] | null {
  const text = expr.trim().toLowerCase();
  const expanded = CRON_MACROS[text] ?? text;
  const fields = expanded.split(/\s+/).filter(Boolean);
  return fields.length === 5 ? fields : null;
}

function value(token: string, field: number): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  const names = field === 3 ? MONTH_NAMES : field === 4 ? DAY_NAMES : null;
  const at = names?.indexOf(token.slice(0, 3)) ?? -1;
  if (names && token.length === 3 && at >= 0) return field === 3 ? at + 1 : at;
  return null;
}

function parseField(text: string, field: number): { values: number[] } | { error: CronError } {
  const [lo, hi] = RANGES[field] as [number, number];
  const out = new Set<number>();
  for (const part of text.split(",")) {
    if (part === "") return { error: { code: "syntax", field, token: text } };
    const [range, step, extra] = part.split("/");
    if (extra !== undefined || range === undefined || range === "") return { error: { code: "syntax", field, token: part } };
    let stepN = 1;
    if (step !== undefined) {
      if (!/^\d+$/.test(step)) return { error: { code: "syntax", field, token: part } };
      stepN = Number(step);
      if (stepN < 1 || stepN > hi - lo + 1) return { error: { code: "step", field, token: part } };
    }
    let from: number;
    let to: number;
    if (range === "*" || range === "?") {
      from = lo;
      to = hi;
    } else if (range.includes("-")) {
      const [a, b, more] = range.split("-");
      const x = a === undefined ? null : value(a, field);
      const y = b === undefined ? null : value(b, field);
      if (more !== undefined || x === null || y === null) return { error: { code: "syntax", field, token: part } };
      from = x;
      to = y;
    } else {
      const x = value(range, field);
      if (x === null) return { error: { code: "syntax", field, token: part } };
      from = x;
      // "5/15" means from 5 to the end, stepping 15. A bare "5" is just 5.
      to = step === undefined ? x : hi;
    }
    if (from < lo || to > hi || from > to) return { error: { code: "range", field, token: part } };
    for (let n = from; n <= to; n += stepN) out.add(field === 4 && n === 7 ? 0 : n);
  }
  return { values: [...out].sort((a, b) => a - b) };
}

/** Parses a five-field cron expression (minute hour day-of-month month day-of-week) or an `@daily` style macro. */
export function parseCron(expr: string): CronResult {
  if (expr.trim() === "") return { ok: false, error: { code: "empty", field: -1 } };
  const fields = cronFields(expr);
  if (!fields) return { ok: false, error: { code: "fields", field: -1 } };
  const lists: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const res = parseField(fields[i] as string, i);
    if ("error" in res) return { ok: false, error: res.error };
    lists.push(res.values);
  }
  const [minutes, hours, days, months, weekdays] = lists as [number[], number[], number[], number[], number[]];
  const star = (t: string) => t.startsWith("*") || t === "?";
  return { ok: true, value: { minutes, hours, days, months, weekdays, anyDay: star(fields[2] as string), anyWeekday: star(fields[4] as string) } };
}

export function isValidCron(expr: string): boolean {
  return parseCron(expr).ok;
}

/* ------------------------------------------------------------------ time zones */

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Whether `timeZone` is an IANA zone this runtime knows. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock reading in `timeZone` at `instant`. */
export function wallClock(instant: number, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(instant))) if (p.type !== "literal") parts[p.type] = Number(p.value);
  return { year: parts.year as number, month: parts.month as number, day: parts.day as number, hour: (parts.hour as number) % 24, minute: parts.minute as number };
}

/** Milliseconds `timeZone` is ahead of UTC at `instant`. */
function offsetAt(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const seconds = Math.floor(instant / 1000) % 60;
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, seconds < 0 ? seconds + 60 : seconds);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant a wall-clock time happens in `timeZone`; `null` when it does not exist there (a daylight saving gap). */
export function zonedInstant(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): number | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let t = guess - offsetAt(guess, timeZone);
  const second = guess - offsetAt(t, timeZone);
  if (second !== t) t = second;
  const w = wallClock(t, timeZone);
  return w.year === year && w.month === month && w.day === day && w.hour === hour && w.minute === minute ? t : null;
}

/* ------------------------------------------------------------------ next runs */

function dayMatches(c: ParsedCron, year: number, month: number, day: number): boolean {
  if (!c.months.includes(month)) return false;
  const dom = c.days.includes(day);
  const dow = c.weekdays.includes(new Date(Date.UTC(year, month - 1, day)).getUTCDay());
  if (c.anyDay && c.anyWeekday) return true;
  if (c.anyDay) return dow;
  if (c.anyWeekday) return dom;
  return dom || dow;
}

export interface NextRunsOptions {
  /** Where to start counting; runs are strictly after it. Default: now. */
  from?: Date | number;
  count?: number;
  /** IANA name the schedule is read in. Default "UTC". */
  timeZone?: string;
}

/** The next `count` times the expression fires after `from`, as Dates. Empty when it is invalid or never fires. */
export function nextRuns(expr: string, { from = Date.now(), count = 5, timeZone = "UTC" }: NextRunsOptions = {}): Date[] {
  const parsed = parseCron(expr);
  if (!parsed.ok || !isValidTimeZone(timeZone)) return [];
  const c = parsed.value;
  const start = new Date(from).getTime();
  const begin = Math.floor(start / 60_000) * 60_000 + 60_000; // the next whole minute
  const w = wallClock(begin, timeZone);
  const out: Date[] = [];
  // 8 years of days covers "February 29th".
  for (let i = 0; i < 366 * 8 && out.length < count; i++) {
    const d = new Date(Date.UTC(w.year, w.month - 1, w.day + i));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const dd = d.getUTCDate();
    if (!dayMatches(c, y, m, dd)) continue;
    for (const h of c.hours) {
      for (const mi of c.minutes) {
        const t = zonedInstant(y, m, dd, h, mi, timeZone);
        if (t !== null && t >= begin) {
          out.push(new Date(t));
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ simple form */

export type CronFrequency = "minutes" | "hours" | "daily" | "weekly" | "monthly";

export interface CronSimple {
  frequency: CronFrequency;
  /** For `minutes` and `hours`: run every N. */
  every: number;
  /** For `hours`: the minute past the hour. */
  minute: number;
  /** For `daily`, `weekly`, `monthly`: `HH:mm`. */
  time: string;
  /** For `weekly`: 0 (Sunday) to 6. */
  days: number[];
  /** For `monthly`: 1 to 31. */
  dayOfMonth: number;
}

export const DEFAULT_SIMPLE: CronSimple = { frequency: "daily", every: 15, minute: 0, time: "09:00", days: [1], dayOfMonth: 1 };

const pad = (n: number) => String(n).padStart(2, "0");

export function parseTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const hour = m ? Math.min(23, Number(m[1])) : 9;
  const minute = m ? Math.min(59, Number(m[2])) : 0;
  return { hour, minute };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));

/** The expression for a simple schedule. */
export function simpleToCron(s: CronSimple): string {
  const { hour, minute } = parseTime(s.time);
  switch (s.frequency) {
    case "minutes": {
      const n = clamp(s.every, 1, 59);
      return n === 1 ? "* * * * *" : `*/${n} * * * *`;
    }
    case "hours": {
      const n = clamp(s.every, 1, 23);
      return `${clamp(s.minute, 0, 59)} ${n === 1 ? "*" : `*/${n}`} * * *`;
    }
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const days = [...new Set(s.days.map((d) => d % 7))].sort((a, b) => a - b);
      return `${minute} ${hour} * * ${(days.length ? days : [1]).join(",")}`;
    }
    case "monthly":
      return `${minute} ${hour} ${clamp(s.dayOfMonth, 1, 31)} * *`;
  }
}

/** The simple form of an expression, or `null` when it needs the full cron editor. */
export function cronToSimple(expr: string): CronSimple | null {
  const f = cronFields(expr);
  if (!f) return null;
  const [mi, h, dom, mon, dow] = f as [string, string, string, string, string];
  const num = /^\d+$/;
  const step = /^\*\/(\d+)$/;
  const base = { ...DEFAULT_SIMPLE };
  if (mon !== "*") return null;
  if (dom === "*" && dow === "*") {
    if (mi === "*" && h === "*") return { ...base, frequency: "minutes", every: 1 };
    const ms = step.exec(mi);
    if (ms && h === "*" && Number(ms[1]) >= 2 && Number(ms[1]) <= 59) return { ...base, frequency: "minutes", every: Number(ms[1]) };
    if (num.test(mi) && Number(mi) < 60) {
      if (h === "*") return { ...base, frequency: "hours", every: 1, minute: Number(mi) };
      const hs = step.exec(h);
      if (hs && Number(hs[1]) >= 2 && Number(hs[1]) <= 23) return { ...base, frequency: "hours", every: Number(hs[1]), minute: Number(mi) };
      if (num.test(h) && Number(h) < 24) return { ...base, frequency: "daily", time: `${pad(Number(h))}:${pad(Number(mi))}` };
    }
    return null;
  }
  if (!(num.test(mi) && Number(mi) < 60 && num.test(h) && Number(h) < 24)) return null;
  const time = `${pad(Number(h))}:${pad(Number(mi))}`;
  if (dom === "*" && /^[0-7](,[0-7])*$/.test(dow)) return { ...base, frequency: "weekly", time, days: [...new Set(dow.split(",").map((d) => Number(d) % 7))].sort((a, b) => a - b) };
  if (dow === "*" && num.test(dom) && Number(dom) >= 1 && Number(dom) <= 31) return { ...base, frequency: "monthly", time, dayOfMonth: Number(dom) };
  return null;
}

/* ------------------------------------------------------------------ describing */

export type CronLocale = "en" | "ar";

const NAMES = {
  en: {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
  ar: {
    days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  },
};

function listWords(items: string[], ar: boolean): string {
  if (items.length <= 1) return items[0] ?? "";
  const last = items[items.length - 1] as string;
  const head = items.slice(0, -1).join(ar ? "، " : ", ");
  return ar ? `${head} و${last}` : `${head} and ${last}`;
}

/** Plural noun after a number in Arabic: 1 "دقيقة", 2 "دقيقتان" (as "كل دقيقتين"), 3 to 10 "دقائق", the rest "دقيقة". */
function arUnit(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

/** The numbers a field lists, when it is only numbers, ranges (expanded) and commas; `null` for steps and stars. */
function plainNumbers(text: string, field: number): number[] | null {
  if (/[*/?]/.test(text)) return null;
  const res = parseField(text, field);
  return "values" in res ? res.values : null;
}

/**
 * A sentence for the expression, or `null` when it is invalid or too unusual to put in words
 * (the caller then shows "Custom schedule" and the next runs). Digits stay Latin, like the rest of Nasaq.
 */
export function describeCron(expr: string, locale: CronLocale = "en"): string | null {
  const parsed = parseCron(expr);
  const f = cronFields(expr);
  if (!parsed.ok || !f) return null;
  const ar = locale === "ar";
  const n = NAMES[locale];
  const [mi, h, domRaw, mon, dowRaw] = f as [string, string, string, string, string];
  const dom = domRaw === "?" ? "*" : domRaw;
  const dow = dowRaw === "?" ? "*" : dowRaw;
  const step = /^\*\/(\d+)$/;
  const time = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

  // The time part.
  let when: string | null = null;
  let recurring = false; // "Every 5 minutes" already covers every day, so "every day" is not added
  const minutes = plainNumbers(mi, 0);
  const hours = plainNumbers(h, 1);
  const ms = step.exec(mi);
  const hs = step.exec(h);
  if (mi === "*" && h === "*") {
    when = ar ? "كل دقيقة" : "Every minute";
    recurring = true;
  } else if (ms && h === "*") {
    const k = Number(ms[1]);
    when = ar ? `كل ${arUnit(k, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}` : `Every ${k} minutes`;
    recurring = true;
  } else if (minutes && minutes.length === 1 && h === "*") {
    const m0 = minutes[0] as number;
    when = m0 === 0 ? (ar ? "كل ساعة بالضبط" : "Every hour, on the hour") : ar ? `كل ساعة عند الدقيقة ${m0}` : `Every hour at minute ${m0}`;
    recurring = true;
  } else if (minutes && minutes.length === 1 && hs) {
    const k = Number(hs[1]);
    const m0 = minutes[0] as number;
    when = ar ? `كل ${arUnit(k, "ساعة", "ساعتين", "ساعات", "ساعة")}${m0 ? ` عند الدقيقة ${m0}` : ""}` : `Every ${k} hours${m0 ? ` at minute ${m0}` : ""}`;
    recurring = true;
  } else if (ms && hours && hours.length > 1 && hours.every((x, i) => i === 0 || x === (hours[i - 1] as number) + 1)) {
    const k = Number(ms[1]);
    const a = hours[0] as number;
    const b = hours[hours.length - 1] as number;
    when = ar ? `كل ${arUnit(k, "دقيقة", "دقيقتين", "دقائق", "دقيقة")} من ${time(a, 0)} إلى ${time(b, 59)}` : `Every ${k} minutes, from ${time(a, 0)} to ${time(b, 59)}`;
    recurring = true;
  } else if (minutes && hours && minutes.length * hours.length <= 4) {
    const stamps = hours.flatMap((x) => minutes.map((y) => time(x, y)));
    when = ar ? `عند ${listWords(stamps, true)}` : `At ${listWords(stamps, false)}`;
  }
  if (when === null) return null;

  // The date part.
  const parts: string[] = [];
  const dowList = plainNumbers(dow, 4);
  if (dow !== "*") {
    if (!dowList) return null;
    const key = dowList.join(",");
    if (key === "1,2,3,4,5") parts.push(ar ? "من الاثنين إلى الجمعة" : "on weekdays");
    else if (key === "0,6") parts.push(ar ? "في عطلة نهاية الأسبوع" : "on weekends");
    else parts.push(ar ? `في ${listWords(dowList.map((d) => n.days[d] as string), true)}` : `on ${listWords(dowList.map((d) => n.days[d] as string), false)}`);
  }
  const domList = plainNumbers(dom, 2);
  if (dom !== "*") {
    if (!domList) return null;
    const ds = domList.join(ar ? " و" : ", ");
    parts.push(ar ? `في ${domList.length === 1 ? "اليوم" : "الأيام"} ${ds} من الشهر` : `on day ${listWords(domList.map(String), false)} of the month`);
  }
  const monList = plainNumbers(mon, 3);
  if (mon !== "*") {
    if (!monList) return null;
    parts.push(ar ? `في ${listWords(monList.map((m) => n.months[m - 1] as string), true)}` : `in ${listWords(monList.map((m) => n.months[m - 1] as string), false)}`);
  }
  const date = parts.length ? parts.join(ar ? "، " : ", ") : recurring ? "" : ar ? "كل يوم" : "every day";
  return date ? `${when}${ar ? "، " : ", "}${date}` : when;
}

/* ------------------------------------------------------------------ presets */

export interface CronPreset {
  id: string;
  /** Text shown on the chip. Omit to use the description of `value`. */
  label?: string;
  value: string;
}

export const DEFAULT_CRON_PRESETS: CronPreset[] = [
  { id: "every-5-min", value: "*/5 * * * *" },
  { id: "hourly", value: "0 * * * *" },
  { id: "daily-9", value: "0 9 * * *" },
  { id: "weekdays-9", value: "0 9 * * 1-5" },
  { id: "weekly-mon", value: "0 9 * * 1" },
  { id: "monthly-1st", value: "0 9 1 * *" },
];
