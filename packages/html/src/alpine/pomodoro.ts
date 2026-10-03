// nqPomodoro: the pomodoro cycle (focus, short break, focus ... and a long break after each set). The Blade <x-nq::pomodoro> card and
// <x-nq::pomodoro.break-lock-screen> read this state.
//
//   <div data-slot="pomodoro-root" x-data="nqPomodoro({ config: { focusMs: 1500000 }, completed: 2, dailyTarget: 8, tasks: [...], taskId: 't1' })">
//     … x-text="clock()" … x-on:click="toggle()" skip() stop() postpone(5) … <x-nq::pomodoro.break-lock-screen /> …
//   </div>
//
// Drift-free like nqCountdown: it keeps the moment a phase ends, ticks on a self-correcting timeout and re-syncs when the tab becomes visible.
// Events from the root (bubbling): `pomodoro-event` (detail: { kind, phase, startedAt, endedAt, plannedMs, spentMs }), `pomodoro-change`
// (detail: the serialisable state, to persist it) and `pomodoro-task-change` (detail: the task or null).
// Config: config { focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, autoStartBreaks, autoStartFocus }, completed (sessions finished today),
// speed (demo clock), dailyTarget (8), focusMinutesToday, tasks [{ id, title, project? }], taskId, state (restore), postponeMinutes (5), confirmSkip (true).

import { displaySeconds, formatTimer, nextTickDelay, remainingAt, scaledClock } from "./countdown-logic";
import {
  DEFAULT_POMODORO,
  dailyProgress,
  initialPomodoro,
  isBreak,
  pausePomodoro,
  phaseDuration,
  postponeBreak,
  resumePomodoro,
  skipPomodoro,
  startPomodoro,
  stopPomodoro,
  tickPomodoro,
  type PomodoroConfig,
  type PomodoroEvent,
  type PomodoroPhase,
  type PomodoroState,
} from "./pomodoro-logic";
import type { Magics, Register } from "./types";

export interface PomodoroTask {
  id: string;
  title: string;
  project?: string;
}

export interface PomodoroOptions {
  config?: Partial<PomodoroConfig>;
  completed?: number;
  speed?: number;
  dailyTarget?: number;
  focusMinutesToday?: number;
  tasks?: PomodoroTask[];
  taskId?: string | null;
  state?: PomodoroState;
  postponeMinutes?: number;
  confirmSkip?: boolean;
}

interface Nq {
  t(en: string, ar: string): string;
  locale: string;
}

interface PomodoroData extends Magics {
  $nq: Nq;
  st: PomodoroState;
  cfg: PomodoroConfig;
  now: number;
  speed: number;
  dailyTarget: number;
  focusMinutesToday: number | null;
  tasks: PomodoroTask[];
  taskId: string | null;
  postponeMinutes: number;
  confirmSkip: boolean;
  confirming: boolean;
  offset: number;
  shown: { phase: "shortBreak" | "longBreak"; seconds: number; fraction: number };
  clockFn: () => number;
  timer: ReturnType<typeof setTimeout> | undefined;
  onVisible: () => void;
  wake(): void;
  apply(next: PomodoroState, events: readonly PomodoroEvent[], at: number): void;
  run(fn: (s: PomodoroState, at: number) => PomodoroState | { state: PomodoroState; events: PomodoroEvent[] }): void;
  t(key: string, vars?: Record<string, string | number>): string;
  num(n: number): string;
  phase(): PomodoroPhase;
  status(): string;
  idle(): boolean;
  paused(): boolean;
  seconds(): number;
  fraction(): number;
  onBreak(): boolean;
  sync(): void;
  skip(): void;
  keepResting(): void;
  askSkip(): void;
  remainingMs(): number;
  phaseName(): string;
  dotState(i: number): "done" | "current" | "todo";
  dotStateRest(i: number): "done" | "current" | "todo";
  idea(): { icon: string; title: readonly [string, string]; body: readonly [string, string] };
  taskTitle(): string;
}

type Pair = readonly [string, string];
const STR: Record<string, Pair> = {
  focus: ["Focus", "تركيز"],
  shortBreak: ["Short break", "استراحة قصيرة"],
  longBreak: ["Long break", "استراحة طويلة"],
  startFocus: ["Start focus", "ابدأ التركيز"],
  startBreak: ["Start break", "ابدأ الاستراحة"],
  pause: ["Pause", "إيقاف مؤقت"],
  resume: ["Resume", "متابعة"],
  paused: ["Paused", "متوقف مؤقتًا"],
  ready: ["Ready", "جاهز"],
  noTask: ["No task linked", "لا توجد مهمة مرتبطة"],
  sessionsToday: ["{done} of {target} sessions", "{done} من {target} جلسات"],
  focusToday: ["{minutes} min focused", "{minutes} دقيقة تركيز"],
  announceFocus: ["Focus started", "بدأ التركيز"],
  announceBreak: ["Break started", "بدأت الاستراحة"],
  breakTitleShort: ["Time for a short break", "حان وقت استراحة قصيرة"],
  breakTitleLong: ["Time for a long break", "حان وقت استراحة طويلة"],
  breakBody: ["Focus sessions finished today: {done}. Step away from the screen and let your mind rest.", "جلسات التركيز المنتهية اليوم: {done}. ابتعد عن الشاشة ودع ذهنك يرتاح."],
  breakNext: ["Next up: {task}", "التالي: {task}"],
  postpone: ["Postpone {minutes} min", "أجّل {minutes} دقائق"],
  confirmTitle: ["Skip this break?", "تخطي هذه الاستراحة؟"],
  confirmBody: ["Rest is what keeps the next session sharp. Skipping starts focus again right away.", "الراحة هي ما يُبقي الجلسة التالية حادّة. التخطي يبدأ التركيز فورًا."],
  cycles: ["{done} of {total} focus sessions done in this set", "{done} من {total} جلسات تركيز أُنجزت في هذه الدورة"],
  timer: ["Timer", "المؤقّت"],
};

const IDEAS: readonly { icon: "sparkles" | "droplets" | "eye" | "footprints"; title: Pair; body: Pair }[] = [
  { icon: "sparkles", title: ["Stand up and stretch", "قف وتمطَّ"], body: ["Roll your shoulders and reach overhead for thirty seconds.", "حرّك كتفيك وارفع ذراعيك فوق رأسك ثلاثين ثانية."] },
  { icon: "droplets", title: ["Drink a glass of water", "اشرب كوب ماء"], body: ["Hydrate now, before the next session begins.", "اشرب الآن قبل أن تبدأ الجلسة التالية."] },
  { icon: "eye", title: ["Rest your eyes", "أرِح عينيك"], body: ["Look at something far away for twenty seconds.", "انظر إلى شيء بعيد لمدة عشرين ثانية."] },
  { icon: "footprints", title: ["Take a short walk", "امشِ قليلًا"], body: ["Even a minute on your feet resets your back and neck.", "حتى دقيقة واحدة على قدميك تريح ظهرك ورقبتك."] },
];

const TONE_STROKE = { focus: "stroke-primary", shortBreak: "stroke-nq-success", longBreak: "stroke-nq-info" } as const;
const TONE_TEXT = { focus: "text-primary", shortBreak: "text-nq-success-text", longBreak: "text-nq-info-text" } as const;
const DOT = "size-2.5 rounded-full border transition-colors duration-200 ease-nq motion-reduce:transition-none";
const DOT_STATE = {
  done: "border-primary bg-primary",
  current: "border-primary bg-transparent ring-2 ring-primary/30",
  todo: "border-nq-line-strong bg-transparent",
} as const;

export const pomodoro: Register = (Alpine) => {
  Alpine.data("nqPomodoro", (options: PomodoroOptions = {}) => {
    const cfg: PomodoroConfig = { ...DEFAULT_POMODORO, ...options.config };
    const speed = options.speed && options.speed > 0 ? options.speed : 1;
    const clockFn = scaledClock(speed);
    // Handlers on the teleported break screen see their own element as $el, so events go through the root.
    let rootEl: HTMLElement = document.body;
    const st = options.state ?? initialPomodoro(cfg, options.completed ?? 0);
    return {
      st,
      cfg,
      now: clockFn(),
      speed,
      dailyTarget: options.dailyTarget ?? 8,
      focusMinutesToday: options.focusMinutesToday ?? null,
      tasks: options.tasks ?? [],
      taskId: options.taskId ?? null,
      postponeMinutes: options.postponeMinutes ?? 5,
      confirmSkip: options.confirmSkip !== false,
      confirming: false,
      offset: 0,
      shown: { phase: "shortBreak", seconds: 0, fraction: 1 },
      clockFn,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      onVisible: () => {},

      init(this: PomodoroData) {
        rootEl = this.$el as HTMLElement;
        this.onVisible = () => {
          if (document.visibilityState === "visible") this.wake();
        };
        document.addEventListener("visibilitychange", this.onVisible);
        this.wake();
      },
      destroy(this: PomodoroData) {
        clearTimeout(this.timer);
        document.removeEventListener("visibilitychange", this.onVisible);
      },

      apply(this: PomodoroData, next: PomodoroState, events: readonly PomodoroEvent[], at: number) {
        const changed = next !== this.st;
        this.st = next;
        this.now = at;
        this.sync();
        if (changed) rootEl.dispatchEvent(new CustomEvent("pomodoro-change", { bubbles: true, detail: JSON.parse(JSON.stringify(next)) }));
        for (const detail of events) rootEl.dispatchEvent(new CustomEvent("pomodoro-event", { bubbles: true, detail }));
      },
      /** Re-syncs with the clock, applies every phase that has ended and schedules the next whole-second tick. */
      wake(this: PomodoroData) {
        clearTimeout(this.timer);
        const at = this.clockFn();
        const { state, events } = tickPomodoro(this.st, this.cfg, at);
        this.apply(state, events, at);
        const t = this.st.timer;
        if (t.status === "running") this.timer = setTimeout(() => this.wake(), Math.max(nextTickDelay(t, at) / this.speed, 16));
      },
      run(this: PomodoroData, fn: (s: PomodoroState, at: number) => PomodoroState | { state: PomodoroState; events: PomodoroEvent[] }) {
        const at = this.clockFn();
        const result = fn(this.st, at);
        if ("events" in result) this.apply(result.state, result.events, at);
        else this.apply(result, [], at);
        this.wake();
      },
      /** The break screen keeps showing the break that just ended while it fades out. */
      sync(this: PomodoroData) {
        if (this.onBreak()) this.shown = { phase: this.st.phase === "longBreak" ? "longBreak" : "shortBreak", seconds: this.seconds(), fraction: this.fraction() };
        else if (this.confirming) {
          this.confirming = false;
          this.offset = 0;
        }
      },

      // Controls
      start(this: PomodoroData) {
        this.run((s, at) => startPomodoro(s, at));
      },
      pause(this: PomodoroData) {
        this.run((s, at) => pausePomodoro(s, at));
      },
      resume(this: PomodoroData) {
        this.run((s, at) => resumePomodoro(s, at));
      },
      toggle(this: PomodoroData) {
        this.run((s, at) => (s.timer.status === "idle" ? startPomodoro(s, at) : s.timer.status === "running" ? pausePomodoro(s, at) : resumePomodoro(s, at)));
      },
      skip(this: PomodoroData) {
        this.run((s, at) => skipPomodoro(s, this.cfg, at));
      },
      stop(this: PomodoroData) {
        this.run((s, at) => stopPomodoro(s, this.cfg, at));
      },
      /** Turns the current break into `minutes` more focus time. */
      postpone(this: PomodoroData, minutes?: number) {
        this.run((s, at) => postponeBreak(s, this.cfg, (minutes ?? this.postponeMinutes) * 60_000, at));
      },
      pickTask(this: PomodoroData, id: string) {
        this.taskId = id ? id : null;
        const task = this.tasks.find((x) => x.id === id) ?? null;
        rootEl.dispatchEvent(new CustomEvent("pomodoro-task-change", { bubbles: true, detail: task }));
      },

      // Break screen: Skip asks first, Escape asks (or backs out of the question), only "Skip anyway" skips.
      askSkip(this: PomodoroData) {
        if (this.confirmSkip) this.confirming = true;
        else this.skip();
      },
      keepResting(this: PomodoroData) {
        this.confirming = false;
        this.$nextTick(() => this.$root.querySelector<HTMLElement>("[data-skip-break]")?.focus());
      },
      escape(this: PomodoroData) {
        if (this.confirming) this.keepResting();
        else this.askSkip();
      },
      confirmedSkip(this: PomodoroData) {
        this.confirming = false;
        this.offset = 0;
        this.skip();
      },
      anotherIdea(this: PomodoroData) {
        this.offset += 1;
      },

      // Read
      t(this: PomodoroData, key: string, vars: Record<string, string | number> = {}) {
        const pair = STR[key] ?? [key, key];
        return this.$nq.t(pair[0], pair[1]).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
      },
      num(this: PomodoroData, n: number) {
        return new Intl.NumberFormat(this.$nq.locale).format(n);
      },
      phase(this: PomodoroData): PomodoroPhase {
        return this.st.phase;
      },
      status(this: PomodoroData) {
        return this.st.timer.status;
      },
      idle(this: PomodoroData) {
        return this.st.timer.status === "idle";
      },
      paused(this: PomodoroData) {
        return this.st.timer.status === "paused";
      },
      running(this: PomodoroData) {
        return this.st.timer.status === "running";
      },
      hasProgress(this: PomodoroData) {
        return this.st.timer.status !== "idle" || this.st.cycle > 0;
      },
      onBreak(this: PomodoroData) {
        return isBreak(this.st.phase) && (this.st.timer.status === "running" || this.st.timer.status === "paused");
      },
      remainingMs(this: PomodoroData) {
        return remainingAt(this.st.timer, this.now);
      },
      seconds(this: PomodoroData) {
        return displaySeconds(this.remainingMs());
      },
      /** Share of the phase left, 1 at the start and 0 at the end. */
      fraction(this: PomodoroData) {
        return this.st.timer.durationMs > 0 ? Math.min(1, this.remainingMs() / this.st.timer.durationMs) : 0;
      },
      clock(this: PomodoroData) {
        return formatTimer(this.seconds());
      },
      iso(this: PomodoroData) {
        const s = this.seconds();
        return `PT${Math.floor(s / 60)}M${s % 60}S`;
      },
      phaseName(this: PomodoroData) {
        return this.t(this.st.phase);
      },
      is(this: PomodoroData, phase: PomodoroPhase) {
        return this.st.phase === phase;
      },
      toneText(this: PomodoroData) {
        return TONE_TEXT[this.st.phase];
      },
      stateWord(this: PomodoroData) {
        const name = this.phaseName();
        return this.paused() ? `${name} · ${this.t("paused")}` : this.idle() ? `${name} · ${this.t("ready")}` : name;
      },
      startLabel(this: PomodoroData) {
        return this.paused() ? this.t("resume") : this.st.phase === "focus" ? this.t("startFocus") : this.t("startBreak");
      },
      announce(this: PomodoroData) {
        return this.idle() ? "" : this.st.phase === "focus" ? this.t("announceFocus") : this.t("announceBreak");
      },
      sessionsText(this: PomodoroData) {
        return this.t("sessionsToday", { done: this.num(this.st.completed), target: this.num(this.dailyTarget) });
      },
      focusText(this: PomodoroData) {
        const minutes = this.focusMinutesToday ?? Math.round((this.st.completed * this.cfg.focusMs) / 60000);
        return this.t("focusToday", { minutes: this.num(minutes) });
      },
      progressPct(this: PomodoroData) {
        return Math.round(dailyProgress(this.st.completed, this.dailyTarget) * 100);
      },

      // Cycle dots (the countdown parts' names, so <x-nq::countdown.cycle-dots live> works here too)
      dotState(this: PomodoroData, i: number) {
        const finished = Math.min(this.cfg.cyclesBeforeLongBreak, this.st.cycle);
        return i < finished ? "done" : this.st.phase === "focus" && this.st.timer.status !== "idle" && i === finished ? "current" : "todo";
      },
      dotClass(this: PomodoroData, i: number) {
        return `${DOT} ${DOT_STATE[this.dotState(i)]}`;
      },
      dotStateRest(this: PomodoroData, i: number) {
        return i < Math.min(this.cfg.cyclesBeforeLongBreak, this.st.cycle) ? "done" : "todo";
      },
      dotClassRest(this: PomodoroData, i: number) {
        return `${DOT} ${DOT_STATE[this.dotStateRest(i)]}`;
      },
      cyclesLabel(this: PomodoroData) {
        return this.t("cycles", { done: Math.min(this.cfg.cyclesBeforeLongBreak, this.st.cycle), total: this.cfg.cyclesBeforeLongBreak });
      },

      // Ring (the countdown parts' names). The lock screen passes lock = true to follow the break it keeps showing.
      ringRoot(this: PomodoroData, size = 224) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const state = this;
        return {
          ":data-paused"() {
            return state.paused() ? "" : undefined;
          },
          ":data-tone"() {
            return state.st.phase === "focus" ? "primary" : state.st.phase === "shortBreak" ? "success" : "info";
          },
          ":style"() {
            return { width: `${size}px`, height: `${size}px`, maxWidth: "100%" };
          },
        };
      },
      arc(this: PomodoroData, size = 224, thickness = 12, lock = false) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const state = this;
        const radius = (size - thickness) / 2;
        const circumference = 2 * Math.PI * radius;
        const value = () => Math.min(1, Math.max(0, lock ? state.shown.fraction : state.fraction()));
        const dashed = () => state.paused() && value() > 0;
        return {
          ":stroke-dasharray"() {
            const piece = Math.max(1, (circumference * value()) / 24);
            return dashed() ? `${piece} ${piece}` : String(circumference);
          },
          ":stroke-dashoffset"() {
            return dashed() ? 0 : circumference * (1 - value());
          },
          ":class"() {
            const phase = lock ? state.shown.phase : state.st.phase;
            return { [TONE_STROKE.focus]: phase === "focus", [TONE_STROKE.shortBreak]: phase === "shortBreak", [TONE_STROKE.longBreak]: phase === "longBreak", "opacity-0": value() <= 0 };
          },
        };
      },

      // Break screen
      breakPhase(this: PomodoroData) {
        return this.shown.phase;
      },
      breakName(this: PomodoroData) {
        return this.t(this.shown.phase);
      },
      breakTitle(this: PomodoroData) {
        return this.confirming ? this.t("confirmTitle") : this.shown.phase === "longBreak" ? this.t("breakTitleLong") : this.t("breakTitleShort");
      },
      breakBody(this: PomodoroData) {
        return this.confirming ? this.t("confirmBody") : this.t("breakBody", { done: this.num(this.st.completed) });
      },
      breakClock(this: PomodoroData) {
        return formatTimer(this.shown.seconds);
      },
      breakIso(this: PomodoroData) {
        const s = this.shown.seconds;
        return `PT${Math.floor(s / 60)}M${s % 60}S`;
      },
      breakToneText(this: PomodoroData) {
        return TONE_TEXT[this.shown.phase];
      },
      idea(this: PomodoroData) {
        return IDEAS[(this.st.cycle + this.offset) % IDEAS.length]!;
      },
      ideaIcon(this: PomodoroData, icon: string) {
        return this.idea().icon === icon;
      },
      ideaTitle(this: PomodoroData) {
        const i = this.idea();
        return this.$nq.t(i.title[0], i.title[1]);
      },
      ideaBody(this: PomodoroData) {
        const i = this.idea();
        return this.$nq.t(i.body[0], i.body[1]);
      },
      taskTitle(this: PomodoroData) {
        return this.tasks.find((x) => x.id === this.taskId)?.title ?? "";
      },
      nextText(this: PomodoroData) {
        const title = this.taskTitle();
        return title ? this.t("breakNext", { task: title }) : "";
      },
      postponeLabel(this: PomodoroData) {
        return this.t("postpone", { minutes: this.num(this.postponeMinutes) });
      },
      // Keeps the unused import honest and lets a host read the planned length of the current phase.
      plannedMs(this: PomodoroData) {
        return phaseDuration(this.cfg, this.st.phase);
      },
    };
  });
};
