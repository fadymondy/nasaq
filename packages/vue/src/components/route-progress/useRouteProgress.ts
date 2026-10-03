import { computed, getCurrentInstance, onBeforeUnmount, ref } from "vue";

/**
 * Counts running jobs so several can share one bar: `active` stays true until every `start()` has been
 * finished. `run(promise)` wraps a promise. The finisher returned by `start` is safe to call twice.
 */
export function useRouteProgress() {
  const count = ref(0);
  let mounted = true;
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      mounted = false;
    });
  }
  function start() {
    let finished = false;
    count.value += 1;
    return () => {
      if (finished) return;
      finished = true;
      if (mounted) count.value = Math.max(0, count.value - 1);
    };
  }
  async function run<T>(work: Promise<T> | (() => Promise<T>)): Promise<T> {
    const done = start();
    try {
      return await (typeof work === "function" ? work() : work);
    } finally {
      done();
    }
  }
  return { active: computed(() => count.value > 0), count, start, run };
}
