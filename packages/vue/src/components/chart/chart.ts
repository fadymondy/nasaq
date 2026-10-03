import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

/** Series colours, in order. Brand first, then the tag hues; all are theme tokens (light, dark and brand aware). */
export const CHART_COLORS = [
  "var(--primary)",
  "var(--nq-tag-blue)",
  "var(--nq-tag-teal)",
  "var(--nq-tag-amber)",
  "var(--nq-tag-violet)",
  "var(--nq-tag-pink)",
  "var(--nq-tag-orange)",
  "var(--nq-tag-green)",
] as const;

export interface ChartSeries {
  /** Human label shown in the tooltip and legend. Localise it. */
  label?: string;
  /** Any CSS colour value, normally a token: "var(--nq-tag-teal)". Default: the palette entry for the series' position. */
  color?: string;
}

/** Series key -> label and colour. The key is what you pass as `dataKey` (or a slice's `nameKey` value). */
export type ChartConfig = Record<string, ChartSeries>;

/** Resolve every series colour so charts can use `var(--color-<key>)` for fills and strokes. */
export function seriesVars(config: ChartConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  Object.keys(config).forEach((key, i) => {
    vars[`--color-${key}`] = config[key]?.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
  });
  return vars;
}

/**
 * Axis flags that mirror a chart for RTL: the X axis runs right to left and the Y axis sits on the right.
 * Same shape as the React hook; hand them to whichever Vue charting library you use.
 */
export function useChartAxis(): ComputedRef<{ isRtl: boolean; xAxis: { reversed: boolean }; yAxis: { orientation: "left" | "right" } }> {
  const nq = useNasaq();
  return computed(() => {
    const isRtl = nq.isRtl.value;
    return { isRtl, xAxis: { reversed: isRtl }, yAxis: { orientation: isRtl ? "right" : "left" } };
  });
}

export interface ChartPayloadItem {
  name?: string | number;
  dataKey?: string | number;
  value?: unknown;
  color?: string;
  fill?: string;
  payload?: { fill?: string } & Record<string, unknown>;
}

export interface ChartLegendItem {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
  payload?: { fill?: string } & Record<string, unknown>;
}

export type ChartPoint = number | { value: number };
export const toRows = (data: readonly ChartPoint[]) => data.map((d, i) => ({ i, value: typeof d === "number" ? d : d.value }));

/** Monotone cubic (Fritsch-Carlson) path through the points, like d3's curveMonotoneX that Recharts uses for type="monotone". */
export function monotonePath(points: readonly [number, number][]): string {
  const n = points.length;
  if (n === 0) return "";
  const f = (v: number) => +v.toFixed(2);
  if (n === 1) return `M${f(points[0]![0])},${f(points[0]![1])}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1]![0] - points[i]![0];
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1]![1] - points[i]![1]) / dx[i]!;
  }
  const m: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++) m[i] = slope[i - 1]! * slope[i]! <= 0 ? 0 : (slope[i - 1]! + slope[i]!) / 2;
  m[n - 1] = slope[n - 2]!;
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / slope[i]!;
    const b = m[i + 1]! / slope[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i]!;
      m[i + 1] = t * b * slope[i]!;
    }
  }
  let d = `M${f(points[0]![0])},${f(points[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${f(x0 + h)},${f(y0 + m[i]! * h)},${f(x1 - h)},${f(y1 - m[i + 1]! * h)},${f(x1)},${f(y1)}`;
  }
  return d;
}

/** SVG paths for a Sparkline in a w x h box with a 2px margin: the line and the closed area under it. Values scale from 0 to the max. */
export function sparklinePaths(data: readonly ChartPoint[], w = 128, h = 32, pad = 2): { line: string; area: string } {
  const rows = toRows(data);
  if (!rows.length) return { line: "", area: "" };
  const max = Math.max(0, ...rows.map((r) => r.value));
  const min = Math.min(0, ...rows.map((r) => r.value));
  const span = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = rows.map((r, i): [number, number] => [pad + (rows.length === 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW), pad + innerH - ((r.value - min) / span) * innerH]);
  const line = monotonePath(pts);
  const base = pad + innerH - ((0 - min) / span) * innerH;
  const area = `${line}L${pts[pts.length - 1]![0].toFixed(2)},${base.toFixed(2)}L${pts[0]![0].toFixed(2)},${base.toFixed(2)}Z`;
  return { line, area };
}
