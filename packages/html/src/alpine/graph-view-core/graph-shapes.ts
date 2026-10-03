/*
 * Node shapes and link styles for the graph view. Pure geometry: SVG path strings and outline maths, so links can
 * end on the edge of any shape and arrowheads land on it.
 */

export type GraphNodeShape = "circle" | "square" | "rounded" | "diamond" | "hexagon" | "pill";
export const GRAPH_SHAPES: readonly GraphNodeShape[] = ["circle", "square", "rounded", "diamond", "hexagon", "pill"];
export type GraphLinkStyle = "solid" | "dashed" | "flow";

export interface ShapePoint {
  x: number;
  y: number;
}

/** Half width and half height of the shape drawn for size `r` (a circle of radius `r` has the same weight). */
export function shapeExtent(shape: GraphNodeShape, r: number): { hw: number; hh: number } {
  switch (shape) {
    case "square":
    case "rounded":
      return { hw: r * 0.9, hh: r * 0.9 };
    case "diamond":
      return { hw: r * 1.15, hh: r * 1.15 };
    case "hexagon":
      return { hw: r * 1.05, hh: r * 0.91 };
    case "pill":
      return { hw: r * 1.6, hh: r * 0.8 };
    default:
      return { hw: r, hh: r };
  }
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Corners of the polygonal shapes; `null` for the ones with curves. */
function vertices(shape: GraphNodeShape, r: number): [number, number][] | null {
  const { hw, hh } = shapeExtent(shape, r);
  if (shape === "square") return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  if (shape === "diamond") return [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
  if (shape === "hexagon") return [[-hw, 0], [-hw / 2, -hh], [hw / 2, -hh], [hw, 0], [hw / 2, hh], [-hw / 2, hh]];
  return null;
}

/** An SVG path for the shape, centred on (0, 0). */
export function shapePath(shape: GraphNodeShape, r: number): string {
  const v = vertices(shape, r);
  if (v) return `M ${v.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L ")} Z`;
  const { hw, hh } = shapeExtent(shape, r);
  if (shape === "rounded" || shape === "pill") {
    const c = shape === "pill" ? hh : Math.min(hw, hh) * 0.4;
    const arc = (x: number, y: number) => `A ${f(c)} ${f(c)} 0 0 1 ${f(x)} ${f(y)}`;
    return [`M ${f(-hw + c)} ${f(-hh)}`, `H ${f(hw - c)}`, arc(hw, -hh + c), `V ${f(hh - c)}`, arc(hw - c, hh), `H ${f(-hw + c)}`, arc(-hw, hh - c), `V ${f(-hh + c)}`, arc(-hw + c, -hh), "Z"].join(" ");
  }
  return `M ${f(-r)} 0 A ${f(r)} ${f(r)} 0 1 1 ${f(r)} 0 A ${f(r)} ${f(r)} 0 1 1 ${f(-r)} 0 Z`;
}

/** How far from the centre the outline lies in direction `angle` (radians). Approximate for rounded corners. */
export function boundaryDistance(shape: GraphNodeShape, r: number, angle: number): number {
  if (shape === "circle") return r;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const { hw, hh } = shapeExtent(shape, r);
  const v = vertices(shape, r);
  if (!v) {
    const tx = Math.abs(cos) < 1e-9 ? Number.POSITIVE_INFINITY : hw / Math.abs(cos);
    const ty = Math.abs(sin) < 1e-9 ? Number.POSITIVE_INFINITY : hh / Math.abs(sin);
    return Math.min(tx, ty);
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < v.length; i++) {
    const [x1, y1] = v[i] as [number, number];
    const [x2, y2] = v[(i + 1) % v.length] as [number, number];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = cos * ey - sin * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (x1 * ey - y1 * ex) / den;
    const u = (x1 * sin - y1 * cos) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return Number.isFinite(best) ? best : r;
}

/** Where a link from one node to another starts and ends: on the outline of each shape, `gap` clear of it. */
export function linkEnds(from: ShapePoint, fromShape: GraphNodeShape, fromR: number, to: ShapePoint, toShape: GraphNodeShape, toR: number, gap = 2): { a: ShapePoint; b: ShapePoint; angle: number; length: number } {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const da = boundaryDistance(fromShape, fromR, angle) + gap;
  const db = boundaryDistance(toShape, toR, angle + Math.PI) + gap;
  if (length <= da + db) return { a: from, b: to, angle, length };
  return { a: { x: from.x + Math.cos(angle) * da, y: from.y + Math.sin(angle) * da }, b: { x: to.x - Math.cos(angle) * db, y: to.y - Math.sin(angle) * db }, angle, length };
}

/** The corners (SVG `points`) of an arrowhead whose tip is `tip`, pointing along `angle`. */
export function arrowPoints(tip: ShapePoint, angle: number, size = 8): string {
  const back = (da: number) => `${f(tip.x - Math.cos(angle + da) * size)},${f(tip.y - Math.sin(angle + da) * size)}`;
  return `${f(tip.x)},${f(tip.y)} ${back(0.42)} ${back(-0.42)}`;
}

/** Stroke dash array of a link style; `undefined` for a solid line. */
export function dashFor(style: GraphLinkStyle | undefined): string | undefined {
  return style === "dashed" ? "6 4" : style === "flow" ? "5 6" : undefined;
}
