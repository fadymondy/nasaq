import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { SlugCheck, SlugState } from "./types";
import { slugProblem } from "./workspace-slug";

/** Debounced (400 ms) availability check of a slug. Idle for an invalid slug, or the saved one when `saved` is given. */
export function useSlugCheck(slug: Ref<string>, check: () => ((slug: string) => Promise<SlugCheck>) | undefined, saved?: () => string) {
  const state = ref<SlugState>({ status: "idle" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  watch(
    [slug, () => saved?.()],
    () => {
      const id = ++run;
      clearTimeout(timer);
      const fn = check();
      if (!fn || slug.value === saved?.() || slugProblem(slug.value)) {
        state.value = { status: "idle" };
        return;
      }
      state.value = { status: "checking" };
      timer = setTimeout(async () => {
        try {
          const result = await fn(slug.value);
          if (id !== run || result === undefined) return;
          const free = typeof result === "boolean" ? result : result.available;
          state.value = { status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined };
        } catch {
          if (id === run) state.value = { status: "error" };
        }
      }, 400);
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    run++;
    clearTimeout(timer);
  });
  return state;
}
