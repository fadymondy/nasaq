import { computed, onBeforeUnmount, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { secondsUntil, type DateLike } from "./ws-status-format";

/** Whole seconds until `at`, ticking each second. `null` when there is no target. */
export function useCountdown(at: MaybeRefOrGetter<DateLike | undefined>): ComputedRef<number | null> {
  const now = ref(Date.now());
  let id: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (id !== undefined) clearInterval(id);
    id = undefined;
  };
  watch(
    () => toValue(at),
    (target) => {
      stop();
      if (target === undefined) return;
      now.value = Date.now();
      id = setInterval(() => (now.value = Date.now()), 1000);
    },
    { immediate: true },
  );
  onBeforeUnmount(stop);
  return computed(() => {
    const target = toValue(at);
    return target === undefined ? null : secondsUntil(target, now.value);
  });
}
