/** Pure helpers for the lock screen: PIN entry and the attempt counter. */

export type LockMethod = "pin" | "password" | "biometric" | "passkey";

export const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Adds a digit to a PIN. Non-digits and digits past `length` are ignored. */
export function pinAppend(pin: string, key: string, length: number): string {
  return /^\d$/.test(key) && pin.length < length ? pin + key : pin;
}

export function pinBackspace(pin: string): string {
  return pin.slice(0, -1);
}

export interface AttemptState {
  failures: number;
  /** True when this failure hit the limit and the screen should lock for a while. */
  lockedOut: boolean;
}

/** Counts a wrong attempt. Reaching `maxAttempts` locks out and resets the counter for the next round. */
export function registerFailure(failures: number, maxAttempts: number): AttemptState {
  const next = failures + 1;
  return next >= maxAttempts ? { failures: 0, lockedOut: true } : { failures: next, lockedOut: false };
}

/** Attempts left before a lockout, never below zero. */
export function attemptsLeft(failures: number, maxAttempts: number): number {
  return Math.max(0, maxAttempts - failures);
}

export type IdlePhase = "active" | "warning" | "locked";

export interface IdleState {
  phase: IdlePhase;
  /** Whole seconds until the lock, while `warning`. Zero once locked, and the full warning window while active. */
  secondsLeft: number;
}

/**
 * Where an idle session stands. `idleMs` is the time since the last activity, `timeoutMs` the idle time that locks,
 * `warningMs` how long before the lock the warning shows. A warning longer than the timeout is clamped to it.
 */
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
