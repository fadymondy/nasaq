import { monotonePath } from "../chart";

// Internal: the scales and paths of the hand-drawn time-series chart (the React one is a Recharts AreaChart).
// The plot is a 100 x 100 box; X runs 0..100 in reading order (the SVG mirrors in RTL) and Y 0..100 from the top.

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export interface TimeSeriesDomain {
  lo: number;
  hi: number;
  ticks: number[];
}

/** Y domain and tick values: 0 to a nice maximum for counts, "min - 1" to "max + 1" for lower-is-better metrics. */
export function timeSeriesDomain(values: readonly number[], lowerIsBetter: boolean): TimeSeriesDomain {
  const fin = values.filter((v) => Number.isFinite(v));
  const r = (v: number) => Math.round(v * 1e9) / 1e9;
  if (lowerIsBetter) {
    const lo = Math.min(...fin) - 1;
    const hi = Math.max(...fin) + 1;
    const step = niceStep((hi - lo) / 4);
    const ticks: number[] = [];
    for (let k = Math.ceil(lo / step); k * step <= hi; k++) ticks.push(r(k * step));
    return { lo, hi, ticks };
  }
  const max = Math.max(0, ...fin);
  const step = niceStep((max || 1) / 4);
  const hi = Math.ceil(r(max / step)) * step || step;
  const ticks: number[] = [];
  for (let k = 0; k * step <= hi + step / 1e6; k++) ticks.push(r(k * step));
  return { lo: 0, hi: r(hi), ticks };
}

/** Vertical position of a value in percent from the top. A reversed axis puts the lowest value on top. */
export function timeSeriesY(value: number, d: TimeSeriesDomain, reversed: boolean): number {
  const frac = d.hi === d.lo ? 0.5 : (value - d.lo) / (d.hi - d.lo);
  return Math.round((reversed ? frac : 1 - frac) * 1e4) / 100;
}

/** Horizontal position of point `i` of `n` in percent. */
export function timeSeriesX(i: number, n: number): number {
  return n <= 1 ? 50 : Math.round((i / (n - 1)) * 1e4) / 100;
}

/** The smooth line through the defined values and the closed area under it. */
export function timeSeriesPaths(values: readonly (number | undefined)[], d: TimeSeriesDomain, reversed: boolean): { line: string; area: string } {
  const pts: [number, number][] = [];
  values.forEach((v, i) => {
    if (v !== undefined) pts.push([timeSeriesX(i, values.length), timeSeriesY(v, d, reversed)]);
  });
  if (!pts.length) return { line: "", area: "" };
  const line = monotonePath(pts);
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  return { line, area: `${line}L${last[0]},100L${first[0]},100Z` };
}

/** Indices of the X labels to print: up to `max`, evenly spread, always the first and the last. */
export function timeSeriesLabelIndices(n: number, max = 6): number[] {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: max }, (_, k) => Math.round((k * (n - 1)) / (max - 1)));
}
