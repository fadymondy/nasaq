// nqLocalClock: the owner's local time, whether it is working time there, and the offset from the visitor's clock. The other personal
// widgets (availability badge, social links, now, stats, skills, weather) are plain server-rendered markup and need no module.
//
//   <div data-slot="local-clock" x-data="nqLocalClock({ timeZone: 'Asia/Riyadh', workingHours: { start: 9, end: 17 }, locale: 'en' })"> … </div>
//
// Bind: x-text="time" on the <time>, x-bind:datetime="iso", x-text="statusText", x-text="offsetText" and x-bind:class on the dot.
// Options: timeZone (IANA), viewerTimeZone (default the browser's), workingHours { start, end, days }, locale, now (ms; freezes the
// clock, otherwise it ticks every 15 seconds), labels { working, offHours, sameTime, ahead, behind } with "{n}" in ahead / behind.

import type { Magics, Register } from "./types";

interface Hours {
  start?: number;
  end?: number;
  days?: number[];
}
interface Options {
  timeZone: string;
  viewerTimeZone?: string;
  workingHours?: Hours;
  locale?: string;
  now?: number;
  labels?: Partial<Record<"working" | "offHours" | "sameTime" | "ahead" | "behind", string>>;
}

const known = (zone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

function partsIn(now: number, zone: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday as string) };
}

function offsetHours(now: number, owner: string, viewer: string) {
  const at = (z: string) => {
    const { hour, minute, weekday } = partsIn(now, z);
    return weekday * 1440 + hour * 60 + minute;
  };
  let diff = at(owner) - at(viewer);
  if (diff > 3.5 * 1440) diff -= 7 * 1440;
  if (diff < -3.5 * 1440) diff += 7 * 1440;
  return Math.round((diff / 60) * 2) / 2;
}

interface State extends Magics {
  now: number;
  zone: string;
  viewer: string;
  hours: Hours;
  locale: string;
  frozen: boolean;
  labels: Record<string, string>;
  timer: ReturnType<typeof setInterval> | undefined;
  readonly working: boolean;
  readonly diff: number;
}

export const personalWidgets: Register = (Alpine) => {
  Alpine.data("nqLocalClock", (options: Options) => ({
    now: options.now ?? Date.now(),
    zone: known(options.timeZone) ? options.timeZone : "UTC",
    viewer: options.viewerTimeZone ?? "UTC",
    hours: options.workingHours ?? {},
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    frozen: options.now !== undefined,
    labels: {
      working: "Working hours",
      offHours: "Outside working hours",
      sameTime: "Same time as you",
      ahead: "{n}h ahead of you",
      behind: "{n}h behind you",
      ...options.labels,
    } as Record<string, string>,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    init(this: State) {
      if (options.viewerTimeZone === undefined) this.viewer = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!this.frozen) this.timer = setInterval(() => (this.now = Date.now()), 15_000);
    },
    destroy(this: State) {
      if (this.timer) clearInterval(this.timer);
    },
    get time(): string {
      const s = this as unknown as State;
      return new Intl.DateTimeFormat(`${s.locale}-u-nu-latn`, { timeZone: s.zone, hour: "numeric", minute: "2-digit" }).format(s.now);
    },
    get iso(): string {
      return new Date((this as unknown as State).now).toISOString();
    },
    get working(): boolean {
      const s = this as unknown as State;
      const { start = 9, end = 17, days = [0, 1, 2, 3, 4] } = s.hours;
      const { hour, minute, weekday } = partsIn(s.now, s.zone);
      const h = hour + minute / 60;
      return days.includes(weekday) && h >= start && h < end;
    },
    get statusText(): string {
      const s = this as unknown as State;
      return s.working ? s.labels.working! : s.labels.offHours!;
    },
    get diff(): number {
      const s = this as unknown as State;
      return known(s.viewer) ? offsetHours(s.now, s.zone, s.viewer) : 0;
    },
    get offsetText(): string {
      const s = this as unknown as State;
      if (s.diff === 0) return s.labels.sameTime!;
      const n = new Intl.NumberFormat(`${s.locale}-u-nu-latn`).format(Math.abs(s.diff));
      return (s.diff > 0 ? s.labels.ahead! : s.labels.behind!).replace("{n}", n);
    },
  }));
};
