"use client";

import { useEffect, useState } from "react";

/**
 * A clock that ticks every `intervalMs`. Pass `fixed` (ms) to freeze it, which keeps stories and tests
 * deterministic. Returns epoch milliseconds.
 */
export function useQueueNow(intervalMs = 1000, fixed?: number): number {
  const [now, setNow] = useState(() => fixed ?? Date.now());
  useEffect(() => {
    if (fixed !== undefined) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, fixed]);
  return fixed ?? now;
}
