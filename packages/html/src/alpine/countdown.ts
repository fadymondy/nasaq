// nqCountdown and nqIdleTime: a drift-free timer and the "you were away" prompt. The markup is the React Countdown parts'
// (see the Blade countdown.* components), the state lives here.
//
//   <div data-slot="countdown" x-data="nqCountdown(1500000, { autoStart: false, speed: 1, total: 4, done: 1 })" class="contents">
//     <div data-slot="timer-ring" x-bind="ringRoot(224)"><svg>…<circle data-slot="timer-ring-arc" x-bind="arc(224, 12)"></circle></svg>
//       <time data-slot="timer-readout" role="timer" x-text="clock()" :datetime="iso()"></time></div>
//     <div data-slot="cycle-dots" role="img" :aria-label="cyclesLabel()"><span :data-state="dotState(0)" :class="dotClass(0)"></span>…</div>
//     <button x-on:click="start()">Start</button> <button x-on:click="pause()">Pause</button> <button x-on:click="resume()">Resume</button>
//   </div>
//
// The timer stores the moment it ends (endAt), never a counter, so a late or throttled tick cannot make it slow or fast:
// remaining time is always endAt - now. It re-syncs when the tab becomes visible again. Status is "idle" | "running" |
// "paused" | "done"; start(ms?), pause(), resume(), reset(ms?) drive it, setDone(n) moves the cycle dots, and "countdown-complete"
// is dispatched from the root once at zero. `speed` runs the clock faster for demos.
//
//   <div x-data="nqIdleTime(300000)"> … <x-nq::alert-dialog x-model="away"> … </x-nq::alert-dialog></div>
//
// nqIdleTime notices the person coming back after `thresholdMs` without input (a laptop that slept): `away` turns true on the
// first input, with `idle` ({ idleMs, since }). keep() / discard() / discardAndStop() answer it and dispatch "idle-keep",
// "idle-discard" and "idle-discard-stop" (detail: idle) from the root. Options: disabled (do not watch, set it while nothing runs).

import {
  displaySeconds,
  elapsedFraction,
  formatTimer,
  idleCountdown,
  idleMinutes,
  nextTickDelay,
  pauseCountdown,
  remainingAt,
  resumeCountdown,
  scaledClock,
  startCountdown,
  tickCountdown,
  type CountdownState,
} from "./countdown-logic";
import type { Magics, Register } from "./types";

interface Nq {
  t(en: string, ar: string): string;
  locale: string;
}

interface TimerState extends Magics {
  $nq: Nq;
  status: CountdownState["status"];
  durationMs: number;
  endAt: number | null;
  remainingMs: number;
  now: number;
  total: number;
  done: number;
  root: HTMLElement | null;
  clockFn: () => number;
  speed: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  onVisible: () => void;
  snapshot(): CountdownState;
  apply(next: CountdownState): void;
  wake(): void;
  remaining(): number;
  seconds(): number;
  elapsed(): number;
  dotState(i: number): "done" | "current" | "todo";
}

interface IdleState extends Magics {
  $nq: Nq;
  away: boolean;
  idle: { idleMs: number; since: number } | null;
  disabled: boolean;
  thresholdMs: number;
  last: number;
  prompted: boolean;
  root: HTMLElement | null;
  listener: () => void;
  minutes(): number;
  time(): string;
  answer(event: string): void;
}

const DOT = "size-2.5 rounded-full border transition-colors duration-200 ease-nq motion-reduce:transition-none";
const DOT_STATE = {
  done: "border-primary bg-primary",
  current: "border-primary bg-transparent ring-2 ring-primary/30",
  todo: "border-nq-line-strong bg-transparent",
} as const;
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

export const countdown: Register = (Alpine) => {
  Alpine.data("nqCountdown", (durationMs = 0, options: { autoStart?: boolean; speed?: number; total?: number; done?: number } = {}) => {
    const speed = options.speed && options.speed > 0 ? options.speed : 1;
    const clockFn = scaledClock(speed);
    const first = options.autoStart ? startCountdown(durationMs, clockFn()) : idleCountdown(durationMs);
    return {
      status: first.status,
      durationMs: first.durationMs,
      endAt: first.endAt,
      remainingMs: first.remainingMs,
      now: clockFn(),
      total: options.total ?? 0,
      done: options.done ?? 0,
      speed,
      root: null as HTMLElement | null,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      clockFn,
      onVisible: () => {},
      init(this: TimerState) {
        this.root = this.$el;
        this.onVisible = () => {
          if (document.visibilityState === "visible") this.wake();
        };
        document.addEventListener("visibilitychange", this.onVisible);
        this.wake();
      },
      destroy(this: TimerState) {
        clearTimeout(this.timer);
        document.removeEventListener("visibilitychange", this.onVisible);
      },
      snapshot(this: TimerState): CountdownState {
        return { status: this.status, durationMs: this.durationMs, endAt: this.endAt, remainingMs: this.remainingMs };
      },
      apply(this: TimerState, next: CountdownState) {
        this.status = next.status;
        this.durationMs = next.durationMs;
        this.endAt = next.endAt;
        this.remainingMs = next.remainingMs;
        this.now = this.clockFn();
        this.wake();
      },
      /** Re-syncs with the clock, finishes the countdown when it is over and schedules the next whole-second tick. */
      wake(this: TimerState) {
        clearTimeout(this.timer);
        const at = this.clockFn();
        const before = this.snapshot();
        const after = tickCountdown(before, at);
        this.status = after.status;
        this.endAt = after.endAt;
        this.remainingMs = after.remainingMs;
        this.now = at;
        if (before.status !== "done" && after.status === "done") this.root?.dispatchEvent(new CustomEvent("countdown-complete", { bubbles: true }));
        if (after.status === "running") this.timer = setTimeout(() => this.wake(), Math.max(nextTickDelay(after, at) / this.speed, 16));
      },
      remaining(this: TimerState) {
        return remainingAt(this.snapshot(), this.now);
      },
      /** Whole seconds to display, rounded up. */
      seconds(this: TimerState) {
        return displaySeconds(this.remaining());
      },
      /** The mm:ss text. */
      clock(this: TimerState) {
        return formatTimer(this.seconds());
      },
      iso(this: TimerState) {
        const s = this.seconds();
        return `PT${Math.floor(s / 60)}M${s % 60}S`;
      },
      /** 0 at the start, 1 when finished. */
      elapsed(this: TimerState) {
        return elapsedFraction(this.snapshot(), this.now);
      },
      start(this: TimerState, ms?: number) {
        this.apply(startCountdown(ms ?? this.durationMs, this.clockFn()));
      },
      pause(this: TimerState) {
        this.apply(pauseCountdown(this.snapshot(), this.clockFn()));
      },
      resume(this: TimerState) {
        this.apply(resumeCountdown(this.snapshot(), this.clockFn()));
      },
      reset(this: TimerState, ms?: number) {
        this.apply(idleCountdown(ms ?? this.durationMs));
      },
      setDone(this: TimerState, n: number) {
        this.done = Math.min(this.total, Math.max(0, Math.floor(n)));
      },
      /** Bind on the ring's outer box. */
      ringRoot(this: TimerState, size = 224) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const state = this;
        return {
          ":data-paused"() {
            return state.status === "paused" ? "" : undefined;
          },
          ":style"() {
            return { width: `${size}px`, height: `${size}px`, maxWidth: "100%" };
          },
        };
      },
      /** Bind on the arc circle: it drains with the time left, and dashes while paused. */
      arc(this: TimerState, size = 224, thickness = 12) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const state = this;
        const radius = (size - thickness) / 2;
        const circumference = 2 * Math.PI * radius;
        const value = () => Math.min(1, Math.max(0, 1 - state.elapsed()));
        const dashed = () => state.status === "paused" && value() > 0;
        return {
          ":stroke-dasharray"() {
            const piece = Math.max(1, (circumference * value()) / 24);
            return dashed() ? `${piece} ${piece}` : String(circumference);
          },
          ":stroke-dashoffset"() {
            return dashed() ? 0 : circumference * (1 - value());
          },
          ":class"() {
            return { "opacity-0": value() <= 0 };
          },
        };
      },
      dotState(this: TimerState, i: number) {
        const finished = Math.min(this.total, this.done);
        return i < finished ? "done" : this.status === "running" && i === finished ? "current" : "todo";
      },
      dotClass(this: TimerState, i: number) {
        return `${DOT} ${DOT_STATE[this.dotState(i)]}`;
      },
      cyclesLabel(this: TimerState) {
        const done = Math.min(this.total, this.done);
        return this.$nq.t(`${done} of ${this.total} focus sessions done in this set`, `${done} من ${this.total} جلسات تركيز أُنجزت في هذه الدورة`);
      },
    };
  });

  Alpine.data("nqIdleTime", (thresholdMs = 5 * 60_000, options: { disabled?: boolean } = {}) => ({
    away: false,
    idle: null as { idleMs: number; since: number } | null,
    disabled: Boolean(options.disabled),
    thresholdMs,
    last: 0,
    prompted: false,
    root: null as HTMLElement | null,
    listener: (() => {}) as () => void,
    init(this: IdleState) {
      this.root = this.$el;
      this.last = Date.now();
      this.listener = () => {
        if (this.disabled) return;
        const at = Date.now();
        const gap = at - this.last;
        if (!this.prompted && idleMinutes(gap, this.thresholdMs) !== null) {
          this.prompted = true;
          this.idle = { idleMs: gap, since: this.last };
          this.away = true;
        }
        if (!this.prompted) this.last = at;
      };
      for (const type of ACTIVITY) window.addEventListener(type, this.listener, { passive: true, capture: true });
    },
    destroy(this: IdleState) {
      for (const type of ACTIVITY) window.removeEventListener(type, this.listener, { capture: true });
    },
    /** Whole minutes away, at least 1. */
    minutes(this: IdleState) {
      return this.idle ? Math.max(1, Math.floor(this.idle.idleMs / 60000)) : 0;
    },
    /** The time they went idle, as a short clock time. */
    time(this: IdleState) {
      if (!this.idle) return "";
      return new Intl.DateTimeFormat(this.$nq.locale, { hour: "numeric", minute: "2-digit" }).format(this.idle.since);
    },
    description(this: IdleState) {
      const minutes = this.minutes();
      const time = `⁦${this.time()}⁩`;
      return this.$nq.t(
        `The timer kept running while you were idle for ${minutes} min, since ${time}. What should happen to that time?`,
        `استمر المؤقّت أثناء غيابك ${minutes} دقيقة منذ ${time}. ماذا نفعل بهذا الوقت؟`,
      );
    },
    discardLabel(this: IdleState) {
      const minutes = this.minutes();
      return this.$nq.t(`Discard ${minutes} min`, `احذف ${minutes} دقيقة`);
    },
    answer(this: IdleState, event: string) {
      const detail = this.idle;
      this.away = false;
      this.prompted = false;
      this.last = Date.now();
      this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail }));
    },
    keep(this: IdleState) {
      this.answer("idle-keep");
    },
    discard(this: IdleState) {
      this.answer("idle-discard");
    },
    discardAndStop(this: IdleState) {
      this.answer("idle-discard-stop");
    },
  }));
};
