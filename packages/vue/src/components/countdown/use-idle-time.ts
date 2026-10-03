import { ref, toValue, watchEffect, type MaybeRefOrGetter } from "vue";
import { idleMinutes } from "./countdown-math";

export interface UseIdleTimeOptions {
  /** Idle longer than this counts as being away. Default 5 minutes. */
  thresholdMs?: number;
  /** Do not watch (nothing is running, so there is nothing to ask about). */
  disabled?: boolean;
}

export interface IdleTime {
  /** How long the person was away. */
  idleMs: number;
  /** When they went idle (epoch ms). */
  since: number;
}

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Notices the person coming back after `thresholdMs` without any input, for example a laptop that slept.
 * `idle` is set on that first input; call `dismiss` once the prompt is answered. It compares wall-clock
 * time, so it also catches a sleeping machine that never fired a timer.
 */
export function useIdleTime(options: MaybeRefOrGetter<UseIdleTimeOptions> = {}) {
  const idle = ref<IdleTime | null>(null);
  let last = 0;
  let prompted = false;

  watchEffect((onCleanup) => {
    const { thresholdMs = 5 * 60_000, disabled = false } = toValue(options);
    if (disabled || typeof window === "undefined") return;
    last = Date.now();
    prompted = false;
    const onActivity = () => {
      const at = Date.now();
      const gap = at - last;
      if (!prompted && idleMinutes(gap, thresholdMs) !== null) {
        prompted = true;
        idle.value = { idleMs: gap, since: last };
      }
      if (!prompted) last = at;
    };
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true, capture: true });
    onCleanup(() => {
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity, { capture: true });
    });
  });

  function dismiss() {
    prompted = false;
    last = Date.now();
    idle.value = null;
  }
  return { idle, dismiss };
}
