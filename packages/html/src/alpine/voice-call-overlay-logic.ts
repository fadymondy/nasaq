export type VoiceCallState = "connecting" | "listening" | "thinking" | "speaking" | "error";

/** Clamps to 0..1 and treats anything that is not a finite number as silence. */
export function clampLevel(level: number | undefined | null): number {
  return typeof level === "number" && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
}

/** Appends a level to a fixed-length history (oldest dropped). A new array; the input is not changed. */
export function pushLevel(history: readonly number[], level: number, size: number): number[] {
  const next = [...history, clampLevel(level)];
  return next.length > size ? next.slice(next.length - size) : next.length < size ? [...Array(size - next.length).fill(0), ...next] : next;
}

/** Rounds a level to `steps` even steps so a reduced-motion meter changes rarely instead of flickering. */
export function quantizeLevel(level: number, steps = 4): number {
  const l = clampLevel(level);
  return steps > 0 ? Math.round(l * steps) / steps : l;
}

/**
 * Bar heights (0..1, never below `floor`) from the level history. The newest level is in the middle and older ones
 * spread outwards, so the row reads as a symmetric voice shape and stays the same in left-to-right and right-to-left.
 */
export function barHeights(history: readonly number[], bars: number, floor = 0.08): number[] {
  const half = Math.ceil(bars / 2);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const distance = Math.abs(i - (bars - 1) / 2);
    const age = Math.min(half - 1, Math.floor(distance));
    const level = history[history.length - 1 - age] ?? 0;
    const taper = 1 - (distance / (half + 1)) * 0.55;
    out.push(Math.max(floor, Math.min(1, clampLevel(level) * taper)));
  }
  return out;
}

/**
 * Loudness from audio samples, 0..1. Float samples are in -1..1 (`getFloatTimeDomainData`); byte samples are 0..255 with
 * silence at 128 (`getByteTimeDomainData`). Uses the RMS, boosted so ordinary speech reaches the upper half.
 */
export function levelFromSamples(samples: ArrayLike<number>): number {
  const n = samples.length;
  if (!n) return 0;
  const bytes = samples instanceof Uint8Array || samples instanceof Uint8ClampedArray;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = bytes ? (samples[i]! - 128) / 128 : samples[i]!;
    sum += v * v;
  }
  return clampLevel(Math.sqrt(sum / n) * 2.5);
}

/** 65 -> "1:05", 3725 -> "1:02:05". Digits are Latin so the timer keeps its shape in every locale. */
export function formatCallTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The classes of one bar (the same rule as nq_voice_bar_class in the Blade logic). */
export function barClass(state: VoiceCallState, quiet: boolean, reduced = false): string {
  const color = state === "speaking" ? "bg-nq-accent" : state === "error" ? "bg-nq-danger" : quiet ? "bg-nq-line-strong" : "bg-foreground";
  return ["w-1.5 rounded-full", color, state === "connecting" ? "opacity-40" : "", reduced ? "" : "transition-[height] duration-100 ease-out", state === "thinking" && !reduced ? "animate-pulse" : ""]
    .filter(Boolean)
    .join(" ");
}
