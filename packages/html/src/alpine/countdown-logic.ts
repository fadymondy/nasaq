/*
 * Pure, drift-free countdown maths. A running countdown stores the moment it ends (`endAt`), never a
 * counter that a timer decrements, so a late, throttled or skipped tick can not make it slow or fast:
 * the remaining time is always `endAt - now`. Every function takes `now` (milliseconds on any clock)
 * so tests and demos can drive it without real waiting.
 */

export type CountdownStatus = "idle" | "running" | "paused" | "done";

export interface CountdownState {
  status: CountdownStatus;
  /** The full length of this countdown. */
  durationMs: number;
  /** When it ends while `running`; otherwise null. */
  endAt: number | null;
  /** Time left while `idle`, `paused` or `done`. While `running` it is derived from `endAt`. */
  remainingMs: number;
}

export const idleCountdown = (durationMs: number): CountdownState => {
  const d = Math.max(0, durationMs);
  return { status: "idle", durationMs: d, endAt: null, remainingMs: d };
};

/** Starts a countdown at `at`. Passing the previous countdown's `endAt` chains phases without drift. */
export const startCountdown = (durationMs: number, at: number): CountdownState => {
  const d = Math.max(0, durationMs);
  return { status: "running", durationMs: d, endAt: at + d, remainingMs: d };
};

/** Milliseconds left at `now`, never below zero. */
export function remainingAt(state: CountdownState, now: number): number {
  if (state.status === "running" && state.endAt !== null) return Math.max(0, state.endAt - now);
  return Math.max(0, state.remainingMs);
}

/** Whole seconds to show. Rounds up, so "0:00" appears only when the countdown is really over. */
export const displaySeconds = (remainingMs: number): number => Math.ceil(Math.max(0, remainingMs) / 1000);

/** 0 at the start, 1 when finished. */
export function elapsedFraction(state: CountdownState, now: number): number {
  if (state.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remainingAt(state, now) / state.durationMs));
}

export function pauseCountdown(state: CountdownState, now: number): CountdownState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", endAt: null, remainingMs: remainingAt(state, now) };
}

export function resumeCountdown(state: CountdownState, now: number): CountdownState {
  if (state.status !== "paused") return state;
  return { ...state, status: "running", endAt: now + state.remainingMs };
}

/** Moves a running countdown that has reached its end to `done`. Otherwise returns the same object. */
export function tickCountdown(state: CountdownState, now: number): CountdownState {
  if (state.status === "running" && state.endAt !== null && now >= state.endAt) return { ...state, status: "done", endAt: null, remainingMs: 0 };
  return state;
}

/** How late a finished tick was: milliseconds past `endAt`. Used to carry the overshoot into the next phase. */
export const overshootMs = (state: CountdownState, now: number): number => (state.status === "running" && state.endAt !== null ? Math.max(0, now - state.endAt) : 0);

/** Milliseconds (on the same clock) until the displayed second changes. 0 when nothing is running. */
export function nextTickDelay(state: CountdownState, now: number): number {
  if (state.status !== "running") return 0;
  const r = remainingAt(state, now);
  if (r <= 0) return 0;
  const shown = Math.ceil(r / 1000);
  return r - (shown - 1) * 1000 || 1000;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 1500 -> "25:00"; 3725 -> "1:02:05". */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
}

/** A clock that runs `speed` times faster than real time, for demos ("25 minutes in 25 seconds"). */
export function scaledClock(speed: number, source: () => number = Date.now): () => number {
  if (!Number.isFinite(speed) || speed <= 0 || speed === 1) return source;
  const t0 = source();
  return () => t0 + (source() - t0) * speed;
}

/** Idle time worth asking about: whole minutes, or null when below the threshold. */
export function idleMinutes(idleMs: number, thresholdMs: number): number | null {
  return idleMs >= thresholdMs ? Math.max(1, Math.floor(idleMs / 60000)) : null;
}
