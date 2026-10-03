// Gamification: the interactive parts of the badge grid, streak calendar, leaderboard, reward card and unlock toast.
// The markup is rendered by <x-nq::gamification.*>; the state lives here.
//
//   nqBadgeGrid(filter, selectedId, counts)   filter tabs (x-model="filter"), select(id) dispatches nq-select { id }.
//   nqStreakCalendar(config)                   pages the month, rebuilding the cells; dispatches nq-month-change { month: "YYYY-MM" }.
//   nqLeaderboard(period)                      follows the period tabs (x-model="period"); dispatches nq-period-change { id }.
//   nqRewardCard(failedText)                   claim() dispatches a bubbling nq-claim { wait(promise) }; busy and error follow the promise.
//   nqUnlockToast(duration, open)              open, show(), close(); a timer paused on hover or focus; WAAPI pop and burst unless reduced motion.

import type { Magics, Register } from "./types";

type Counts = Record<string, number>;

interface GridState extends Magics {
  filter: string;
  selected: string | null;
  counts: Counts;
  readonly empty: boolean;
  match(status: string): boolean;
  select(id: string): void;
}

interface CalendarConfig {
  days: string[];
  today: string;
  year: number;
  month: number;
  start: number;
  locale: string;
  today_label: string;
  active_label: string;
}

interface CalendarState extends Magics {
  year: number;
  month: number;
  cfg: CalendarConfig;
  go(by: number): void;
  render(): void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

const CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-card p-px text-nq-success-text"><path d="M20 6 9 17l-5-5"/></svg>';

/** The weeks of a month (month is 1 to 12), each 7 long; null pads before the 1st and after the last day. */
function monthGrid(year: number, month: number, active: Set<string>, today: string, weekStart: number) {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() - weekStart + 7) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: ({ day: number; active: boolean; today: boolean; future: boolean } | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const key = keyOf(year, month, day);
    cells.push({ day, active: active.has(key), today: key === today, future: key > today });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

interface RewardState extends Magics {
  busy: boolean;
  error: string | null;
  claim(): Promise<void>;
}

interface ToastState extends Magics {
  open: boolean;
  duration: number;
  paused: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  anims: (Animation | undefined)[];
  show(): void;
  close(): void;
  view(id: string): void;
  pause(): void;
  resume(): void;
  arm(): void;
  play(): void;
  stop(): void;
}

export const gamification: Register = (Alpine) => {
  Alpine.data("nqBadgeGrid", (filter = "all", selectedId: string | null = null, counts: Counts = {}) => ({
    filter,
    selected: selectedId,
    counts,
    get empty() {
      return (this.counts[this.filter] ?? 0) === 0;
    },
    match(this: GridState, status: string) {
      return this.filter === "all" || this.filter === status;
    },
    select(this: GridState, id: string) {
      this.selected = id;
      this.$dispatch("nq-select", { id });
    },
  }));

  Alpine.data("nqStreakCalendar", (cfg: CalendarConfig) => ({
    cfg,
    year: cfg.year,
    month: cfg.month,
    go(this: CalendarState, by: number) {
      const d = new Date(Date.UTC(this.year, this.month - 1 + by, 1));
      this.year = d.getUTCFullYear();
      this.month = d.getUTCMonth() + 1;
      this.render();
      this.$dispatch("nq-month-change", { month: `${this.year}-${pad(this.month)}` });
    },
    render(this: CalendarState) {
      const { locale, today, start, days } = this.cfg;
      const active = new Set(days);
      const title = this.$refs.title;
      const body = this.$refs.body;
      const nf = new Intl.NumberFormat(locale, { numberingSystem: "latn" });
      if (title) title.textContent = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC", numberingSystem: "latn" } as Intl.DateTimeFormatOptions).format(new Date(Date.UTC(this.year, this.month - 1, 1)));
      if (!body) return;
      body.textContent = "";
      for (const week of monthGrid(this.year, this.month, active, today, start)) {
        const tr = document.createElement("tr");
        for (const c of week) {
          const td = document.createElement("td");
          td.className = "p-0";
          if (c) {
            const span = document.createElement("span");
            if (c.active) span.setAttribute("data-active", "");
            if (c.today) span.setAttribute("data-today", "");
            if (c.today) span.title = this.cfg.today_label;
            else if (c.active) span.title = this.cfg.active_label;
            const tone = c.active ? "bg-nq-warning text-nq-bg" : c.future ? "text-muted-foreground/60" : "text-foreground";
            span.className = `relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-caption tabular-nums ${tone}${c.today ? " outline-2 -outline-offset-2 outline-nq-focus" : ""}`;
            span.append(nf.format(c.day));
            if (c.active) {
              const sr = document.createElement("span");
              sr.className = "sr-only";
              sr.textContent = this.cfg.active_label;
              span.append(sr);
              span.insertAdjacentHTML("beforeend", CHECK);
            }
            td.append(span);
          }
          tr.append(td);
        }
        body.append(tr);
      }
    },
  }));

  Alpine.data("nqLeaderboard", (period: string | null = null) => ({
    period,
    init(this: Magics & { period: string | null }) {
      this.$watch<string | null>("period", (id) => {
        if (id !== null && id !== undefined) this.$dispatch("nq-period-change", { id });
      });
    },
  }));

  Alpine.data("nqRewardCard", (failed = "Could not claim. Try again.") => ({
    busy: false,
    error: null as string | null,
    async claim(this: RewardState) {
      if (this.busy) return;
      this.busy = true;
      this.error = null;
      const detail: { wait?: Promise<unknown> | (() => Promise<unknown>) } = {};
      this.$dispatch("nq-claim", detail);
      try {
        const pending = typeof detail.wait === "function" ? detail.wait() : detail.wait;
        const result = (await pending) as { error?: string } | void;
        if (result && typeof result === "object" && result.error) this.error = result.error;
      } catch {
        this.error = failed;
      } finally {
        this.busy = false;
      }
    },
  }));

  Alpine.data("nqUnlockToast", (duration = 6000, open = false) => ({
    open,
    duration,
    paused: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    anims: [] as (Animation | undefined)[],
    init(this: ToastState) {
      if (this.open) {
        this.arm();
        this.$nextTick(() => this.play());
      }
    },
    show(this: ToastState) {
      this.open = true;
      this.paused = false;
      this.arm();
      this.$nextTick(() => this.play());
    },
    close(this: ToastState) {
      if (!this.open) return;
      this.open = false;
      clearTimeout(this.timer);
      this.stop();
      this.$dispatch("nq-close");
    },
    view(this: ToastState, id: string) {
      this.$dispatch("nq-view", { id });
    },
    pause(this: ToastState) {
      this.paused = true;
      clearTimeout(this.timer);
    },
    resume(this: ToastState) {
      this.paused = false;
      this.arm();
    },
    arm(this: ToastState) {
      clearTimeout(this.timer);
      if (!this.open || this.paused || this.duration <= 0) return;
      this.timer = setTimeout(() => this.close(), this.duration);
    },
    stop(this: ToastState) {
      for (const a of this.anims) {
        a?.finished?.catch(() => {});
        a?.cancel();
      }
      this.anims = [];
    },
    play(this: ToastState) {
      this.stop();
      const burst = this.$refs.burst;
      if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        burst?.remove();
        return;
      }
      const dots = Array.from(burst?.children ?? []) as HTMLElement[];
      this.anims = [
        this.$refs.card?.animate?.([{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both" }),
        this.$refs.medal?.animate?.([{ transform: "scale(0.5)" }, { transform: "scale(1.18)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out", delay: 120, fill: "both" }),
        ...dots.map((dot, i) => {
          const angle = (i / dots.length) * Math.PI * 2;
          const distance = 34 + (i % 2) * 10;
          return dot.animate?.(
            [
              { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
              { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1)`, opacity: 0 },
            ],
            { duration: 800, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both", delay: 60 },
          );
        }),
      ];
    },
  }));
};
