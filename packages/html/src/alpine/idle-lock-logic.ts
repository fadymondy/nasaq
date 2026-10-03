// Pure helpers for idle-lock (a copy of the lock-model idle helpers; no Register export, so the index skips this file).

export type IdlePhase = "active" | "warning" | "locked";

export interface IdleState {
  phase: IdlePhase;
  /** Whole seconds until the lock, while `warning`. Zero once locked, and the full warning window while active. */
  secondsLeft: number;
}

/** Where an idle session stands. A warning longer than the timeout is clamped to it. */
export function idleState(idleMs: number, timeoutMs: number, warningMs: number): IdleState {
  const warn = Math.min(Math.max(warningMs, 0), timeoutMs);
  const left = timeoutMs - Math.max(idleMs, 0);
  if (left <= 0) return { phase: "locked", secondsLeft: 0 };
  if (left <= warn) return { phase: "warning", secondsLeft: Math.ceil(left / 1000) };
  return { phase: "active", secondsLeft: Math.ceil(warn / 1000) };
}

/** Milliseconds to wait before the idle phase can next change, so a timer fires exactly then. */
export function nextIdleCheck(idleMs: number, timeoutMs: number, warningMs: number): number {
  const warn = Math.min(Math.max(warningMs, 0), timeoutMs);
  const left = timeoutMs - Math.max(idleMs, 0);
  if (left <= 0) return 0;
  if (left <= warn) return left % 1000 || 1000;
  return left - warn;
}
