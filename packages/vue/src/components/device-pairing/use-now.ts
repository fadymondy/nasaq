import { onBeforeUnmount, ref, watch, type Ref } from "vue";

/** A clock for countdowns: ticks each second while `expiresAt` is set. */
export function useCountdownClock(expiresAt: () => Date | number | string | undefined): Ref<number> {
  const now = ref(Date.now());
  let id: ReturnType<typeof setInterval> | undefined;
  watch(
    expiresAt,
    (value) => {
      clearInterval(id);
      if (value === undefined) return;
      now.value = Date.now();
      id = setInterval(() => (now.value = Date.now()), 1000);
    },
    { immediate: true },
  );
  onBeforeUnmount(() => clearInterval(id));
  return now;
}
