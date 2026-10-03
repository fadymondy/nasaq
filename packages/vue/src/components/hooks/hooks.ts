import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref, type ShallowRef, shallowRef } from "vue";

/** The value, updated only after it stopped changing for `delay` ms. For search boxes and autosave. */
export function useDebounce<T>(value: MaybeRefOrGetter<T>, delay: MaybeRefOrGetter<number> = 300): Readonly<Ref<T>> {
  const debounced = ref(toValue(value)) as Ref<T>;
  let id: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => [toValue(value), toValue(delay)] as const,
    ([v, ms]) => {
      clearTimeout(id);
      id = setTimeout(() => (debounced.value = v), ms);
    },
  );
  onBeforeUnmount(() => clearTimeout(id));
  return debounced;
}

/** A stable function that runs `fn` once calls stop for `delay` ms. `.cancel()` drops a pending call. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: MaybeRefOrGetter<number> = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  onBeforeUnmount(() => clearTimeout(timer));
  const debounced = ((...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), toValue(delay));
  }) as ((...args: A) => void) & { cancel: () => void };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** True while the CSS media query matches. False on the server and until mounted. */
export function useMediaQuery(query: MaybeRefOrGetter<string>): Readonly<Ref<boolean>> {
  const matches = ref(false);
  let mq: MediaQueryList | null = null;
  const update = () => (matches.value = Boolean(mq?.matches));
  const bind = () => {
    mq?.removeEventListener("change", update);
    mq = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(toValue(query)) : null;
    mq?.addEventListener("change", update);
    update();
  };
  onMounted(() => {
    bind();
    watch(() => toValue(query), bind);
  });
  onBeforeUnmount(() => mq?.removeEventListener("change", update));
  return matches;
}

/** True below `breakpoint` px (default 768, Tailwind's `md`). */
export function useIsMobile(breakpoint: MaybeRefOrGetter<number> = 768): Readonly<Ref<boolean>> {
  return useMediaQuery(() => `(max-width: ${toValue(breakpoint) - 0.02}px)`);
}

export interface UseInfiniteScrollOptions {
  /** Loads the next page. Not called again while `loading`. */
  onLoadMore: () => void;
  hasMore: MaybeRefOrGetter<boolean>;
  loading?: MaybeRefOrGetter<boolean>;
  /** Start loading this far before the sentinel is visible. Default "240px". */
  rootMargin?: string;
  /** The scrolling element, when it is not the page. */
  root?: MaybeRefOrGetter<Element | null>;
  disabled?: MaybeRefOrGetter<boolean>;
}

/**
 * Calls `onLoadMore` when a sentinel element nears the viewport. Bind the returned ref (`ref="sentinel"` through
 * a template ref variable) on an element after the last item, and keep a "Load more" button for keyboard and
 * screen-reader users.
 */
export function useInfiniteScroll({ onLoadMore, hasMore, loading = false, rootMargin = "240px", root = null, disabled = false }: UseInfiniteScrollOptions): ShallowRef<Element | null> {
  const sentinel = shallowRef<Element | null>(null);
  let io: IntersectionObserver | undefined;
  const stop = () => {
    io?.disconnect();
    io = undefined;
  };
  watch(
    () => [sentinel.value, toValue(disabled), toValue(hasMore), toValue(loading), toValue(root)] as const,
    ([node, off, more, busy, scroller]) => {
      stop();
      if (!node || off || !more || busy || typeof IntersectionObserver === "undefined") return;
      io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onLoadMore(), { root: scroller, rootMargin });
      io.observe(node);
    },
    { flush: "post", immediate: true },
  );
  onBeforeUnmount(stop);
  return sentinel;
}
