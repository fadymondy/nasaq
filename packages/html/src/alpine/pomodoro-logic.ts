/*
 * The pomodoro state machine, pure and serialisable. Focus -> short break -> focus ... and after
 * `cyclesBeforeLongBreak` finished focus sessions a long break. Every phase is a drift-free countdown
 * (see countdown-math), and a phase that starts by itself starts at the previous phase's `endAt`, not at
 * "now", so a late tick never stretches the cycle.
 */
import { type CountdownState, idleCountdown, pauseCountdown, remainingAt, resumeCountdown, startCountdown, tickCountdown } from "./countdown-logic";

export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export interface PomodoroConfig {
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  /** Finished focus sessions before a long break. */
  cyclesBeforeLongBreak: number;
  /** A break starts by itself when focus ends. Default true (the lock screen is the point). */
  autoStartBreaks: boolean;
  /** Focus starts by itself when a break ends. Default false: you choose when to begin. */
  autoStartFocus: boolean;
}

export const DEFAULT_POMODORO: PomodoroConfig = {
  focusMs: 25 * 60_000,
  shortBreakMs: 5 * 60_000,
  longBreakMs: 15 * 60_000,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
};

export interface PomodoroState {
  phase: PomodoroPhase;
  timer: CountdownState;
  /** Focus sessions finished in the current set (0 to `cyclesBeforeLongBreak`). Resets after a long break. */
  cycle: number;
  /** Focus sessions finished today. Not reset by a long break. */
  completed: number;
  /** True for the extra focus time bought by postponing a break: it does not count as a new session. */
  overtime: boolean;
  /** When the current phase began, or null while it has not started. */
  startedAt: number | null;
}

export type PomodoroEventKind = "completed" | "skipped" | "stopped" | "postponed";

export interface PomodoroEvent {
  kind: PomodoroEventKind;
  phase: PomodoroPhase;
  /** When the phase began (epoch ms on the timer's clock). */
  startedAt: number | null;
  endedAt: number;
  /** The phase length that was planned. */
  plannedMs: number;
  /** Time actually spent in the phase. */
  spentMs: number;
}

export const isBreak = (phase: PomodoroPhase) => phase !== "focus";

export function phaseDuration(config: PomodoroConfig, phase: PomodoroPhase): number {
  return phase === "focus" ? config.focusMs : phase === "shortBreak" ? config.shortBreakMs : config.longBreakMs;
}

export function initialPomodoro(config: PomodoroConfig, completed = 0): PomodoroState {
  return { phase: "focus", timer: idleCountdown(config.focusMs), cycle: 0, completed, overtime: false, startedAt: null };
}

const enter = (state: PomodoroState, config: PomodoroConfig, phase: PomodoroPhase, at: number, auto: boolean, patch: Partial<PomodoroState> = {}): PomodoroState => ({
  ...state,
  ...patch,
  phase,
  timer: auto ? startCountdown(phaseDuration(config, phase), at) : idleCountdown(phaseDuration(config, phase)),
  startedAt: auto ? at : null,
});

const eventFor = (state: PomodoroState, config: PomodoroConfig, kind: PomodoroEventKind, at: number): PomodoroEvent => ({
  kind,
  phase: state.phase,
  startedAt: state.startedAt,
  endedAt: at,
  plannedMs: phaseDuration(config, state.phase),
  spentMs: state.startedAt === null ? 0 : Math.max(0, Math.min(at - state.startedAt, phaseDuration(config, state.phase) * 4)),
});

/** Which break follows a focus session, given how many are done in the set. */
export const breakAfter = (cycle: number, config: PomodoroConfig): PomodoroPhase => (cycle >= config.cyclesBeforeLongBreak ? "longBreak" : "shortBreak");

/** Ends the current phase (finished or skipped) and moves to the next. `at` is when it ended. */
function advance(state: PomodoroState, config: PomodoroConfig, kind: "completed" | "skipped", at: number): { state: PomodoroState; event: PomodoroEvent } {
  const event = eventFor(state, config, kind, at);
  if (state.phase === "focus") {
    const counts = kind === "completed" && !state.overtime;
    const cycle = counts ? state.cycle + 1 : state.cycle;
    const next = enter(state, config, breakAfter(cycle, config), at, config.autoStartBreaks, {
      cycle,
      completed: counts ? state.completed + 1 : state.completed,
      overtime: false,
    });
    return { state: next, event };
  }
  const next = enter(state, config, "focus", at, config.autoStartFocus && kind === "completed", { cycle: state.phase === "longBreak" ? 0 : state.cycle, overtime: false });
  return { state: next, event };
}

/** Focus or break not started yet: begins it now. */
export function startPomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.timer.status !== "idle") return state;
  return { ...state, timer: startCountdown(state.timer.durationMs, now), startedAt: now };
}

export const pausePomodoro = (state: PomodoroState, now: number): PomodoroState => ({ ...state, timer: pauseCountdown(state.timer, now) });
export const resumePomodoro = (state: PomodoroState, now: number): PomodoroState => ({ ...state, timer: resumeCountdown(state.timer, now) });

/** Ends the phase early. Skipped focus does not count as a finished session. */
export function skipPomodoro(state: PomodoroState, config: PomodoroConfig, now: number): { state: PomodoroState; events: PomodoroEvent[] } {
  const started = state.timer.status === "running" || state.timer.status === "paused";
  const { state: next, event } = advance(state, config, "skipped", now);
  return { state: next, events: started ? [event] : [] };
}

/** Back to a fresh focus phase. Today's finished sessions are kept; the set starts over. */
export function stopPomodoro(state: PomodoroState, config: PomodoroConfig, now: number): { state: PomodoroState; events: PomodoroEvent[] } {
  const started = state.timer.status === "running" || state.timer.status === "paused";
  return { state: initialPomodoro(config, state.completed), events: started ? [eventFor(state, config, "stopped", now)] : [] };
}

/** "Five more minutes": a break becomes extra focus time. The session count and set do not change. */
export function postponeBreak(state: PomodoroState, config: PomodoroConfig, ms: number, now: number): { state: PomodoroState; events: PomodoroEvent[] } {
  if (!isBreak(state.phase)) return { state, events: [] };
  const event = eventFor(state, config, "postponed", now);
  const timer = startCountdown(Math.max(1000, ms), now);
  return { state: { ...state, phase: "focus", overtime: true, timer, startedAt: now }, events: [event] };
}

/**
 * Applies every phase that has ended by `now`. A phase that starts by itself begins at the end of the one
 * before it, so being late by 700 ms leaves the next phase 700 ms shorter, not the whole cycle 700 ms longer.
 */
export function tickPomodoro(state: PomodoroState, config: PomodoroConfig, now: number): { state: PomodoroState; events: PomodoroEvent[] } {
  const events: PomodoroEvent[] = [];
  let current = state;
  for (let guard = 0; guard < 16; guard += 1) {
    const ticked = tickCountdown(current.timer, now);
    if (ticked === current.timer) break;
    const endedAt = current.timer.endAt as number;
    const step = advance({ ...current, timer: ticked }, config, "completed", endedAt);
    events.push(step.event);
    current = step.state;
  }
  return { state: current, events };
}

export function pomodoroRemaining(state: PomodoroState, now: number): number {
  return remainingAt(state.timer, now);
}

/** Today's finished focus sessions as a share of the daily target, 0 to 1. */
export const dailyProgress = (completed: number, target: number): number => (target > 0 ? Math.min(1, Math.max(0, completed / target)) : 0);
