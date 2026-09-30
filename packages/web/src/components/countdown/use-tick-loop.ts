"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Re-runs `run` on a self-correcting timeout. `run` does the work and returns the real milliseconds until
 * it should run again, or null to sleep. It also runs when the tab becomes visible, so a throttled or
 * sleeping tab catches up at once. Returns `wake`, to call after any action that may start the loop.
 */
export function useTickLoop(run: () => number | null): () => void {
  const runRef = useRef(run);
  runRef.current = run;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const wake = useCallback(() => {
    clearTimeout(timer.current);
    const delay = runRef.current();
    if (delay !== null) timer.current = setTimeout(wake, Math.max(delay, 16));
  }, []);

  useEffect(() => {
    wake();
    const onVisible = () => {
      if (document.visibilityState === "visible") wake();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [wake]);

  return wake;
}
