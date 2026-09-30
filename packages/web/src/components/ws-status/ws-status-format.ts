/** Pure helpers for the realtime status indicator: states, latency, reconnect backoff and the countdown. No React here. */

export type WsState = "connected" | "connecting" | "reconnecting" | "offline";
export type LatencyQuality = "good" | "fair" | "poor";
export type DateLike = Date | number | string;

const toMs = (v: DateLike): number => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

export const GOOD_LATENCY_MS = 150;
export const FAIR_LATENCY_MS = 400;

/** How the round trip time feels: up to 150 ms good, up to 400 ms fair, above that poor. */
export function latencyQuality(ms: number): LatencyQuality {
  return ms <= GOOD_LATENCY_MS ? "good" : ms <= FAIR_LATENCY_MS ? "fair" : "poor";
}

/** `42 ms`, `1.2 s`. Latin digits, LTR. Non-finite or negative values give `-`. */
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace(/\.0$/, "")} s`;
}

/** Whole seconds until `at`, rounded up, never below 0. */
export function secondsUntil(at: DateLike, now: DateLike = Date.now()): number {
  return Math.max(0, Math.ceil((toMs(at) - toMs(now)) / 1000));
}

/** Exponential backoff with a cap: base, 2x base, 4x base ... up to `max`. `attempt` starts at 1. */
export function backoffDelay(attempt: number, baseMs = 1000, maxMs = 30_000): number {
  const n = Math.max(1, Math.floor(attempt));
  return Math.min(maxMs, baseMs * 2 ** (n - 1));
}

/** `0:07`, `1:05`. For the reconnect countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The levels of the signal glyph that are lit for a latency. */
export function signalBars(ms: number | undefined): 0 | 1 | 2 | 3 {
  if (ms === undefined || !Number.isFinite(ms)) return 0;
  const q = latencyQuality(ms);
  return q === "good" ? 3 : q === "fair" ? 2 : 1;
}
