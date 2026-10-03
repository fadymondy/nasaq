import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import { type IdlePhase, idleState, nextIdleCheck } from "../lock-screen/lock-model";

/** Events that count as being active. Movement is cheap to handle: it only stamps a timestamp. */
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

export interface UseIdleLockOptions {
  /** Idle seconds before the lock. Default 300. */
  timeoutSeconds?: MaybeRefOrGetter<number>;
  /** Seconds before the lock that the warning shows. Default 30. `0` locks with no warning. */
  warningSeconds?: MaybeRefOrGetter<number>;
  /** Pause the timer (no session, or a page that must not lock, like a video call). */
  disabled?: MaybeRefOrGetter<boolean>;
  /** Called once when the idle timer runs out. */
  onIdle?: () => void;
}

export interface IdleLockControls {
  phase: Ref<IdlePhase>;
  /** Whole seconds until the lock while `warning`. */
  secondsLeft: Ref<number>;
  /** Counts as activity now and closes the warning. */
  stayActive: () => void;
  /** Starts counting again from zero, after unlocking. */
  reset: () => void;
}

/**
 * The idle timer. It tracks the last input (pointer, keys, scroll, touch), moves `active` to `warning` to
 * `locked`, and re-checks when the tab becomes visible again so a sleeping laptop locks on wake. Input during
 * the warning does not cancel it: the person has to say they are still there.
 */
export function useIdleLock(options: UseIdleLockOptions = {}): IdleLockControls {
  const timeoutMs = () => (toValue(options.timeoutSeconds) ?? 300) * 1000;
  const warningMs = () => (toValue(options.warningSeconds) ?? 30) * 1000;
  let last = Date.now();
  let current: IdlePhase = "active";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const phase = ref<IdlePhase>("active");
  const secondsLeft = ref(Math.ceil(warningMs() / 1000));

  function check() {
    clearTimeout(timer);
    const idle = Date.now() - last;
    const next = idleState(idle, timeoutMs(), warningMs());
    const prev = current;
    current = next.phase;
    phase.value = next.phase;
    secondsLeft.value = next.secondsLeft;
    if (next.phase === "locked") {
      if (prev !== "locked") options.onIdle?.();
      return;
    }
    timer = setTimeout(check, Math.max(nextIdleCheck(idle, timeoutMs(), warningMs()), 50));
  }

  function reset() {
    last = Date.now();
    current = "active";
    check();
  }

  const onActivity = () => {
    // The warning is answered by the button, not by a stray mouse move.
    if (current === "active") last = Date.now();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  let attached = false;
  function attach() {
    if (attached) return;
    attached = true;
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
  }
  function detach() {
    clearTimeout(timer);
    if (!attached) return;
    attached = false;
    for (const type of ACTIVITY) window.removeEventListener(type, onActivity, { capture: true });
    document.removeEventListener("visibilitychange", onVisible);
  }

  watch(
    [() => toValue(options.disabled) ?? false, timeoutMs, warningMs],
    ([off]) => {
      if (off) {
        detach();
        return;
      }
      attach();
      reset();
    },
    { immediate: true },
  );
  onBeforeUnmount(detach);

  return { phase, secondsLeft, stayActive: reset, reset };
}
