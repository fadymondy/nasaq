"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * "Tail" behaviour for a scrolling log: stays pinned to the bottom while new rows arrive, lets go when the
 * user scrolls up, and `jump` pins it again. `count` is the number of rows; a change re-pins when following.
 */
export function useFollowScroll<T extends HTMLElement>(count: number, initial = true) {
  const ref = useRef<T>(null);
  const [following, setFollowingState] = useState(initial);
  const stick = useRef(initial);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    stick.current = atBottom;
    setFollowingState(atBottom);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `count` is the trigger, not a value read here
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [count]);

  const setFollowing = useCallback((on: boolean) => {
    stick.current = on;
    setFollowingState(on);
    const el = ref.current;
    if (on && el) el.scrollTop = el.scrollHeight;
  }, []);

  return { ref, following, setFollowing, onScroll };
}
