import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from "vue";
import {
  type CountdownState,
  type CountdownStatus,
  displaySeconds,
  elapsedFraction,
  idleCountdown,
  nextTickDelay,
  pauseCountdown,
  remainingAt,
  resumeCountdown,
  scaledClock,
  startCountdown,
  tickCountdown,
} from "./countdown-math";

export interface UseCountdownTimerOptions {
  /** Length of the countdown in milliseconds. */
  durationMs: number;
  /** Start as soon as it mounts. Default false. */
  autoStart?: boolean;
  /** Runs `speed` times faster than real time. For demos and tests only, default 1. */
  speed?: number;
  /** Called once when the countdown reaches zero. */
  onComplete?: () => void;
}

/**
 * A drift-free countdown. It keeps the moment it ends, not a counter, and re-syncs on every tick and when
 * the tab becomes visible again, so throttled background tabs and sleeping laptops stay correct.
 */
export function useCountdownTimer(options: MaybeRefOrGetter<UseCountdownTimerOptions>) {
  const opts = () => toValue(options);
  const speed = opts().speed && opts().speed! > 0 ? opts().speed! : 1;
  const clock = scaledClock(speed);
  const state = ref<CountdownState>(opts().autoStart ? startCountdown(opts().durationMs, clock()) : idleCountdown(opts().durationMs));
  const now = ref(clock());
  let timer: ReturnType<typeof setTimeout> | undefined;

  function wake() {
    clearTimeout(timer);
    const at = clock();
    const before = state.value;
    const after = tickCountdown(before, at);
    state.value = after;
    now.value = at;
    if (before.status !== "done" && after.status === "done") opts().onComplete?.();
    if (after.status === "running") timer = setTimeout(wake, Math.max(nextTickDelay(after, at) / speed, 16));
  }
  function commit(next: CountdownState) {
    state.value = next;
    now.value = clock();
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

  const remainingMs = computed(() => remainingAt(state.value, now.value));
  return {
    status: computed<CountdownStatus>(() => state.value.status),
    remainingMs,
    /** Whole seconds to display, rounded up. */
    seconds: computed(() => displaySeconds(remainingMs.value)),
    /** 0 at the start, 1 when finished. */
    elapsed: computed(() => elapsedFraction(state.value, now.value)),
    durationMs: computed(() => state.value.durationMs),
    /** Starts from the full duration (or `durationMs` when given). */
    start: (ms?: number) => commit(startCountdown(ms ?? state.value.durationMs, clock())),
    pause: () => commit(pauseCountdown(state.value, clock())),
    resume: () => commit(resumeCountdown(state.value, clock())),
    /** Back to idle at the full duration (or `durationMs` when given). */
    reset: (ms?: number) => commit(idleCountdown(ms ?? state.value.durationMs)),
  };
}

export type CountdownTimer = ReturnType<typeof useCountdownTimer>;
