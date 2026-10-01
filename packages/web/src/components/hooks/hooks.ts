"use client";
import { type RefCallback, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** The value, updated only after it stopped changing for `delay` ms. For search boxes and autosave. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** A stable function that runs `fn` once calls stop for `delay` ms. `.cancel()` drops a pending call. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 300) {
  const latest = useRef(fn);
  latest.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const debounced = useCallback(
    (...args: A) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(...args), delay);
    },
    [delay],
  ) as ((...args: A) => void) & { cancel: () => void };
  debounced.cancel = () => clearTimeout(timer.current);
  return debounced;
}

/** True while the CSS media query matches. False on the server and the first client render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True below `breakpoint` px (default 768, Tailwind's `md`). */
export function useIsMobile(breakpoint = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 0.02}px)`);
}

export interface UseInfiniteScrollOptions {
  /** Loads the next page. Not called again while `loading`. */
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  /** Start loading this far before the sentinel is visible. Default "240px". */
  rootMargin?: string;
  /** The scrolling element, when it is not the page. */
  root?: Element | null;
  disabled?: boolean;
}

/**
 * Calls `onLoadMore` when a sentinel element nears the viewport. Put the returned ref on an element after the
 * last item, and keep a "Load more" button for keyboard and screen-reader users.
 */
export function useInfiniteScroll({ onLoadMore, hasMore, loading = false, rootMargin = "240px", root = null, disabled = false }: UseInfiniteScrollOptions): RefCallback<Element> {
  const load = useRef(onLoadMore);
  load.current = onLoadMore;
  const [node, setNode] = useState<Element | null>(null);

  useEffect(() => {
    if (!node || disabled || !hasMore || loading || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load.current(), { root, rootMargin });
    io.observe(node);
    return () => io.disconnect();
  }, [node, disabled, hasMore, loading, root, rootMargin]);

  return setNode;
}
