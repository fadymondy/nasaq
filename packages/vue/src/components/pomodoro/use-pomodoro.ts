import { computed, getCurrentInstance, onBeforeUnmount, onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { displaySeconds, nextTickDelay, remainingAt, scaledClock } from "../countdown/countdown-math";
import {
  DEFAULT_POMODORO,
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
  type PomodoroState,
} from "./pomodoro-model";

export interface UsePomodoroOptions {
  /** Durations and rules. Anything left out uses the classic 25 / 5 / 15 with a long break after 4. */
  config?: Partial<PomodoroConfig>;
  /** Focus sessions already finished today, for the counter. */
  initialCompleted?: number;
  /** Restore a saved state (from `onStateChange`). Only valid at `speed` 1: it holds real timestamps. */
  initialState?: PomodoroState;
  /** Runs `speed` times faster than real time. For demos and tests only. */
  speed?: number;
  /** A phase finished, was skipped, stopped or postponed. Save the session here. */
  onEvent?: (event: PomodoroEvent) => void;
  /** Every state change, so it can be persisted and restored after a reload. */
  onStateChange?: (state: PomodoroState) => void;
}

/**
 * Runs the pomodoro cycle: focus, short break, focus, ... and a long break after every set. Drift-free: it
 * re-syncs from the wall clock on every tick and when the tab becomes visible, and chained phases start at
 * the previous phase's end, so nothing accumulates.
 */
export function usePomodoro(options: MaybeRefOrGetter<UsePomodoroOptions> = {}) {
  const opts = () => toValue(options);
  const config = computed<PomodoroConfig>(() => ({ ...DEFAULT_POMODORO, ...opts().config }));
  const speed = opts().speed && opts().speed! > 0 ? opts().speed! : 1;
  const clock = scaledClock(speed);
  const state = shallowRef<PomodoroState>(opts().initialState ?? initialPomodoro(config.value, opts().initialCompleted ?? 0));
  const now = shallowRef(clock());
  let timer: ReturnType<typeof setTimeout> | undefined;

  function apply(next: PomodoroState, events: readonly PomodoroEvent[], at: number) {
    const changed = next !== state.value;
    state.value = next;
    now.value = at;
    if (changed) opts().onStateChange?.(next);
    for (const event of events) opts().onEvent?.(event);
  }
  function wake() {
    clearTimeout(timer);
    const at = clock();
    const result = tickPomodoro(state.value, config.value, at);
    apply(result.state, result.events, at);
    const t = state.value.timer;
    if (t.status === "running") timer = setTimeout(wake, Math.max(nextTickDelay(t, at) / speed, 16));
  }
  function run(fn: (s: PomodoroState, at: number) => PomodoroState | { state: PomodoroState; events: PomodoroEvent[] }) {
    const at = clock();
    const result = fn(state.value, at);
    if ("events" in result) apply(result.state, result.events, at);
    else apply(result, [], at);
    wake();
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") wake();
  };
  if (getCurrentInstance()) {
    onMounted(() => {
      wake();
      document.addEventListener("visibilitychange", onVisible);
    });
    onBeforeUnmount(() => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    });
  }
  // A new duration applies to a phase that has not started.
  watch(config, (c) => {
    const s = state.value;
    const ms = phaseDuration(c, s.phase);
    if (s.timer.status === "idle" && s.timer.durationMs !== ms) apply({ ...s, timer: { ...s.timer, durationMs: ms, remainingMs: ms } }, [], clock());
  });

  const remainingMs = computed(() => remainingAt(state.value.timer, now.value));
  return {
    state,
    config,
    phase: computed(() => state.value.phase),
    status: computed(() => state.value.timer.status),
    /** Focus sessions finished in this set. */
    cycle: computed(() => state.value.cycle),
    /** Sessions in a set before the long break. */
    cycles: computed(() => config.value.cyclesBeforeLongBreak),
    /** Sessions finished today. */
    completed: computed(() => state.value.completed),
    remainingMs,
    /** Whole seconds to display. */
    seconds: computed(() => displaySeconds(remainingMs.value)),
    /** Share of the phase left, 1 at the start and 0 at the end. */
    fraction: computed(() => (state.value.timer.durationMs > 0 ? Math.min(1, remainingMs.value / state.value.timer.durationMs) : 0)),
    /** True while a break is under way: the moment to show the lock screen. */
    onBreak: computed(() => isBreak(state.value.phase) && (state.value.timer.status === "running" || state.value.timer.status === "paused")),
    start: () => run((s, at) => startPomodoro(s, at)),
    pause: () => run((s, at) => pausePomodoro(s, at)),
    resume: () => run((s, at) => resumePomodoro(s, at)),
    /** Start, pause or resume, whichever fits the state. */
    toggle: () => run((s, at) => (s.timer.status === "idle" ? startPomodoro(s, at) : s.timer.status === "running" ? pausePomodoro(s, at) : resumePomodoro(s, at))),
    skip: () => run((s, at) => skipPomodoro(s, config.value, at)),
    stop: () => run((s, at) => stopPomodoro(s, config.value, at)),
    /** Turns the current break into `ms` more focus time. */
    postpone: (ms: number) => run((s, at) => postponeBreak(s, config.value, ms, at)),
  };
}

export type PomodoroController = ReturnType<typeof usePomodoro>;
