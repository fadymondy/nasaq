import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** A frame counter that stands still under `prefers-reduced-motion` (and until mounted, so SSR matches). */
export function useTick(interval: MaybeRefOrGetter<number>, enabled: MaybeRefOrGetter<boolean> = true) {
  const tick = ref(0);
  let id: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (id !== undefined) clearInterval(id);
    id = undefined;
  };
  const start = () => {
    stop();
    if (!toValue(enabled)) return;
    if (typeof window !== "undefined" && window.matchMedia?.(REDUCED).matches) return;
    id = setInterval(() => tick.value++, toValue(interval));
  };
  onMounted(() => {
    start();
    watch([() => toValue(interval), () => toValue(enabled)], start);
  });
  onBeforeUnmount(stop);
  return tick;
}
