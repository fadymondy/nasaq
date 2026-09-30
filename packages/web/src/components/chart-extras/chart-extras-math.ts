/*
 * Maths for the extra charts: segment shares, ring geometry and the tone of a ring. Pure, shared by the UI and the tests.
 */

export interface SegmentInput {
  id: string;
  value: number;
}

export interface SegmentShare {
  id: string;
  value: number;
  /** Share of the whole, 0 to 1. */
  share: number;
}

/**
 * Shares of a whole. The whole is the sum of the positive values, or `total` when that is bigger (a bar that is only
 * partly full, such as 6 of 10 seats). Negative and non-finite values count as 0. An empty or all-zero input gives zeros.
 */
export function segmentShares(segments: readonly SegmentInput[], total?: number): { shares: SegmentShare[]; whole: number; rest: number } {
  const clean = segments.map((s) => ({ id: s.id, value: Number.isFinite(s.value) && s.value > 0 ? s.value : 0 }));
  const sum = clean.reduce((a, s) => a + s.value, 0);
  const whole = total !== undefined && Number.isFinite(total) ? Math.max(total, sum) : sum;
  return {
    shares: clean.map((s) => ({ ...s, share: whole > 0 ? s.value / whole : 0 })),
    whole,
    rest: Math.max(0, whole - sum),
  };
}

/** Fraction of a ring that is filled, clamped to 0 to 1. A zero or reversed range gives 0. */
export function ringFraction(value: number, max = 100, min = 0): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export interface RingGeometry {
  radius: number;
  circumference: number;
  /** The visible part of the stroke. */
  dash: number;
  /** The gap after it. */
  gap: number;
}

/** Circle geometry inside a 100 by 100 box for a stroke width. */
export function ringGeometry(fraction: number, strokeWidth = 8): RingGeometry {
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const f = Math.min(1, Math.max(0, fraction));
  return { radius, circumference, dash: circumference * f, gap: circumference - circumference * f };
}

export type RingTone = "default" | "info" | "success" | "warning" | "danger";

/** A tone from a fraction: below `warnAt` is fine, from `warnAt` warning, from `dangerAt` danger. For usage rings. */
export function ringToneFor(fraction: number, warnAt = 0.8, dangerAt = 0.95): RingTone {
  if (fraction >= dangerAt) return "danger";
  if (fraction >= warnAt) return "warning";
  return "default";
}

/** A funnel bar width, 0 to 1, of the first step. A step never shows thinner than `min`, so a tiny step stays visible. */
export function funnelBarShare(count: number, first: number, min = 0.06): number {
  if (first <= 0 || count <= 0) return 0;
  return Math.min(1, Math.max(min, count / first));
}
