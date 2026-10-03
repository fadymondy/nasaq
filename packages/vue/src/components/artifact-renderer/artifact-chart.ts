// Geometry for the artifact renderer's charts. React draws them with Recharts; here they are plain SVG paths, so no chart
// library is needed. Everything is computed in a fixed viewBox and mirrored for RTL (time runs right to left, the Y axis
// sits on the right), like Recharts with `useChartAxis`.
import { monotonePath } from "../chart/chart";
import type { PieSlice } from "./artifact-renderer-logic";

export interface ArtifactCartesianInput {
  kind: "bar" | "line" | "area";
  keys: readonly string[];
  /** One row per category: `x` and one number per key. */
  data: readonly ({ x: string | number } & Record<string, string | number>)[];
  rtl: boolean;
  /** Formats a tick or tooltip number. */
  fmt: (n: number) => string;
  /** Series labels, for the hover text. */
  labels: readonly string[];
  width?: number;
  height?: number;
}

export interface ArtifactCartesianGeometry {
  width: number;
  height: number;
  grid: { y: number; x1: number; x2: number }[];
  yTicks: { x: number; y: number; text: string; anchor: "start" | "end" }[];
  xTicks: { x: number; y: number; text: string }[];
  /** Bars: one path per series and category. */
  bars: { key: string; d: string }[];
  lines: { key: string; d: string }[];
  areas: { key: string; d: string }[];
  /** A transparent band per category that carries the hover text. */
  bands: { x: number; width: number; title: string }[];
}

const f = (n: number) => +n.toFixed(2);

/** A round step (1, 2, 5 times a power of ten) near `raw`. */
function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Axis ticks that cover [min, max] with round steps, including zero. */
export function artifactTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0, 1];
  const step = niceStep((hi - lo) / count);
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 1e6; v += step) out.push(+v.toFixed(10));
  return out;
}

export function artifactCartesianGeometry(input: ArtifactCartesianInput): ArtifactCartesianGeometry {
  const W = input.width ?? 600;
  const H = input.height ?? 224;
  const L = 44;
  const R = 8;
  const T = 8;
  const B = 26;
  const values = input.data.flatMap((row) => input.keys.map((k) => Number(row[k])));
  const ticks = artifactTicks(Math.min(0, ...values), Math.max(0, ...values));
  const lo = ticks[0]!;
  const hi = ticks[ticks.length - 1]!;
  const span = hi - lo || 1;
  const ph = H - T - B;
  const pw = W - L - R;
  const yOf = (v: number) => T + ph - ((v - lo) / span) * ph;
  const mx = (x: number) => (input.rtl ? W - x : x);
  const n = input.data.length;
  const band = n ? pw / n : pw;
  // Left edge of category i in LTR plot space.
  const bandX = (i: number) => L + i * band;
  const centre = (i: number) => (input.kind === "bar" ? bandX(i) + band / 2 : n === 1 ? L + pw / 2 : L + (i / (n - 1)) * pw);

  const out: ArtifactCartesianGeometry = { width: W, height: H, grid: [], yTicks: [], xTicks: [], bars: [], lines: [], areas: [], bands: [] };
  for (const v of ticks) {
    out.grid.push({ y: f(yOf(v)), x1: input.rtl ? R : L, x2: input.rtl ? W - L : W - R });
    out.yTicks.push({ x: f(input.rtl ? W - L + 6 : L - 6), y: f(yOf(v) + 4), text: input.fmt(v), anchor: input.rtl ? "start" : "end" });
  }
  // Skip category labels that would collide: about one per 56 units.
  const every = Math.max(1, Math.ceil(56 / Math.max(band, 1)));
  input.data.forEach((row, i) => {
    if (i % every === 0) out.xTicks.push({ x: f(mx(centre(i))), y: H - 8, text: String(row.x) });
  });

  const keys = input.keys;
  keys.forEach((key, s) => {
    if (input.kind === "bar") {
      const inner = band * 0.8;
      const bw = inner / keys.length;
      input.data.forEach((row, i) => {
        const x0 = bandX(i) + band * 0.1 + s * bw;
        const v = Number(row[key]);
        const y0 = yOf(0);
        const y1 = yOf(v);
        const top = Math.min(y0, y1);
        const h = Math.abs(y0 - y1);
        if (h === 0) return;
        const r = Math.min(4, bw / 2, h);
        const left = f(input.rtl ? W - (x0 + bw) : x0);
        const right = f(left + bw);
        // Rounded on the free end only: the top for positive values, the bottom for negative ones.
        out.bars.push({
          key,
          d:
            v >= 0
              ? `M${left},${f(top + h)}V${f(top + r)}Q${left},${f(top)},${f(left + r)},${f(top)}H${f(right - r)}Q${right},${f(top)},${right},${f(top + r)}V${f(top + h)}Z`
              : `M${left},${f(top)}V${f(top + h - r)}Q${left},${f(top + h)},${f(left + r)},${f(top + h)}H${f(right - r)}Q${right},${f(top + h)},${right},${f(top + h - r)}V${f(top)}Z`,
        });
      });
    } else {
      const pts = input.data.map((row, i): [number, number] => [mx(centre(i)), yOf(Number(row[key]))]);
      const line = monotonePath(pts);
      out.lines.push({ key, d: line });
      if (input.kind === "area" && pts.length) {
        const base = f(yOf(0));
        out.areas.push({ key, d: `${line}L${f(pts[pts.length - 1]![0])},${base}L${f(pts[0]![0])},${base}Z` });
      }
    }
  });

  input.data.forEach((row, i) => {
    const x0 = bandX(i);
    const left = input.rtl ? W - (x0 + band) : x0;
    const lines = keys.map((k, s) => `${input.labels[s] ?? k}: ${input.fmt(Number(row[k]))}`);
    out.bands.push({ x: f(left), width: f(band), title: [String(row.x), ...lines].join("\n") });
  });
  return out;
}

export interface ArtifactPieGeometry {
  width: number;
  height: number;
  slices: { key: string; d: string; title: string }[];
}

/** Slice paths for a pie (inner 0) or donut (inner 58%), starting at 12 o'clock, clockwise. */
export function artifactPieGeometry(slices: readonly PieSlice[], donut: boolean, names: readonly string[], fmt: (n: number) => string, width = 600, height = 256): ArtifactPieGeometry {
  const cx = width / 2;
  const cy = height / 2;
  const max = Math.min(width, height) / 2;
  const outer = max * 0.8;
  const inner = donut ? max * 0.58 : 0;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const pt = (r: number, a: number) => `${f(cx + r * Math.sin(a))},${f(cy - r * Math.cos(a))}`;
  let acc = 0;
  const out = slices.map((s, i) => {
    const a0 = (acc / total) * Math.PI * 2;
    acc += s.value;
    // A single full slice cannot be one arc: stop a hair short.
    const a1 = Math.min((acc / total) * Math.PI * 2, a0 + Math.PI * 2 - 0.0001);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = inner
      ? `M${pt(outer, a0)}A${f(outer)},${f(outer)},0,${large},1,${pt(outer, a1)}L${pt(inner, a1)}A${f(inner)},${f(inner)},0,${large},0,${pt(inner, a0)}Z`
      : `M${f(cx)},${f(cy)}L${pt(outer, a0)}A${f(outer)},${f(outer)},0,${large},1,${pt(outer, a1)}Z`;
    return { key: `p${i}`, d, title: `${names[i] ?? ""}: ${fmt(s.value)}` };
  });
  return { width, height, slices: out };
}
