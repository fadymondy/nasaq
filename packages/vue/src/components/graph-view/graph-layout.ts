/*
 * Graph view logic. Pure: no React, no DOM, so filtering, sorting and the force layout are testable under node.
 */

export interface LayoutNode {
  id: string;
}
export interface LayoutLink {
  source: string;
  target: string;
}
export interface Point {
  x: number;
  y: number;
}

/** A small deterministic pseudo-random source, so the same graph always lays out the same way. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * A force-directed layout (Fruchterman-Reingold): every node pushes the others away, every link pulls its
 * ends together, and the movement cools over `iterations`. Deterministic for the same input. The result is
 * centred on (0, 0). Links to unknown nodes are ignored.
 */
export function forceLayout(nodes: LayoutNode[], links: LayoutLink[], { iterations = 260, spacing = 90 }: { iterations?: number; spacing?: number } = {}): Map<string, Point> {
  const n = nodes.length;
  const out = new Map<string, Point>();
  if (n === 0) return out;
  if (n === 1) {
    out.set((nodes[0] as LayoutNode).id, { x: 0, y: 0 });
    return out;
  }
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const rand = mulberry(hash(nodes.map((x) => x.id).join("|")) ^ n);
  const radius = spacing * Math.sqrt(n);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  nodes.forEach((_, i) => {
    const angle = (i / n) * Math.PI * 2 + rand() * 0.4;
    const r = radius * (0.5 + rand() * 0.5);
    px[i] = Math.cos(angle) * r;
    py[i] = Math.sin(angle) * r;
  });
  const pairs: [number, number][] = [];
  for (const l of links) {
    const a = index.get(l.source);
    const b = index.get(l.target);
    if (a !== undefined && b !== undefined && a !== b) pairs.push([a, b]);
  }
  const k = spacing;
  let temperature = radius / 3;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  for (let step = 0; step < iterations; step++) {
    dx.fill(0);
    dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = (px[i] as number) - (px[j] as number);
        let vy = (py[i] as number) - (py[j] as number);
        let d2 = vx * vx + vy * vy;
        if (d2 < 0.01) {
          vx = rand() - 0.5;
          vy = rand() - 0.5;
          d2 = 0.01;
        }
        const d = Math.sqrt(d2);
        const f = (k * k) / d / d;
        dx[i] = (dx[i] as number) + vx * f;
        dy[i] = (dy[i] as number) + vy * f;
        dx[j] = (dx[j] as number) - vx * f;
        dy[j] = (dy[j] as number) - vy * f;
      }
    }
    for (const [a, b] of pairs) {
      const vx = (px[a] as number) - (px[b] as number);
      const vy = (py[a] as number) - (py[b] as number);
      const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
      const f = d / k;
      dx[a] = (dx[a] as number) - vx * f;
      dy[a] = (dy[a] as number) - vy * f;
      dx[b] = (dx[b] as number) + vx * f;
      dy[b] = (dy[b] as number) + vy * f;
    }
    for (let i = 0; i < n; i++) {
      // A weak pull to the centre keeps disconnected pieces from drifting away.
      const gx = (dx[i] as number) - (px[i] as number) * 0.02;
      const gy = (dy[i] as number) - (py[i] as number) * 0.02;
      const d = Math.sqrt(gx * gx + gy * gy) || 0.01;
      const m = Math.min(d, temperature);
      px[i] = (px[i] as number) + (gx / d) * m;
      py[i] = (py[i] as number) + (gy / d) * m;
    }
    temperature *= 1 - 1 / (iterations * 1.1);
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += px[i] as number;
    cy += py[i] as number;
  }
  cx /= n;
  cy /= n;
  nodes.forEach((node, i) => out.set(node.id, { x: (px[i] as number) - cx, y: (py[i] as number) - cy }));
  return out;
}

/** The box that holds every point, padded. `null` when there are none. */
export function boundsOf(points: Iterable<Point>, pad = 0): { x: number; y: number; w: number; h: number } | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/** Scale and offset that fit `box` inside a `width` x `height` viewport (never zooming in past `maxScale`). */
export function fitTransform(box: { x: number; y: number; w: number; h: number }, width: number, height: number, maxScale = 1.4): { x: number; y: number; k: number } {
  const k = Math.min(maxScale, width / Math.max(box.w, 1), height / Math.max(box.h, 1));
  return { k, x: width / 2 - (box.x + box.w / 2) * k, y: height / 2 - (box.y + box.h / 2) * k };
}

/* ------------------------------------------------------------------ data */

export interface FilterableNode {
  id: string;
  label: string;
  kind: string;
  description?: string;
  tags?: string[];
}

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Nodes matching the search text (label, description, tags, folded for Arabic and accents) and the chosen kinds. */
export function filterNodes<T extends FilterableNode>(nodes: T[], { query = "", kinds }: { query?: string; kinds?: string[] | null } = {}): T[] {
  const q = fold(query.trim());
  return nodes.filter((n) => {
    if (kinds && kinds.length > 0 && !kinds.includes(n.kind)) return false;
    if (!q) return true;
    return fold([n.label, n.description ?? "", ...(n.tags ?? [])].join(" ")).includes(q);
  });
}

/** Links whose both ends are in `ids`. */
export function linksAmong<L extends LayoutLink>(links: L[], ids: Set<string>): L[] {
  return links.filter((l) => ids.has(l.source) && ids.has(l.target));
}

/** Neighbour ids per node, both directions. */
export function adjacency(links: LayoutLink[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => map.set(a, (map.get(a) ?? new Set()).add(b));
  for (const l of links) {
    add(l.source, l.target);
    add(l.target, l.source);
  }
  return map;
}

/**
 * Node radius by how connected a node is: 6 to 16, growing slowly. An explicit `weight` (any number, "how
 * important") replaces the degree and may grow the node up to 24.
 */
export function nodeRadius(degree: number, weight?: number): number {
  const base = weight !== undefined && Number.isFinite(weight) ? weight : degree;
  return Math.min(weight !== undefined ? 24 : 16, 6 + Math.sqrt(Math.max(0, base)) * 2.2);
}

export type ListSortKey = "label" | "kind" | "links" | "updated";

/** Sorts rows for the list mode. Text sorts with the given locale; ties fall back to the label. */
export function sortRows<T extends { label: string; kind: string; links: number; updated?: number }>(rows: T[], key: ListSortKey, dir: "asc" | "desc", locale = "en"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a: T, b: T) => {
    if (key === "links") return a.links - b.links;
    if (key === "updated") return (a.updated ?? 0) - (b.updated ?? 0);
    if (key === "kind") return a.kind.localeCompare(b.kind, locale);
    return a.label.localeCompare(b.label, locale);
  };
  return [...rows].sort((a, b) => sign * cmp(a, b) || a.label.localeCompare(b.label, locale));
}

/* ------------------------------------------------------------------ pan and zoom */

export interface Transform {
  x: number;
  y: number;
  k: number;
}

/** A point on the screen (relative to the surface) as a point in graph space. */
export function toGraphPoint(p: Point, tf: Transform): Point {
  return { x: (p.x - tf.x) / tf.k, y: (p.y - tf.y) / tf.k };
}

/** Zoom by `factor` about the screen point `c`, keeping the scale within [min, max]. */
export function zoomAbout(tf: Transform, factor: number, c: Point, min = 0.2, max = 3): Transform {
  const k = Math.min(max, Math.max(min, tf.k * factor));
  const r = k / tf.k;
  return { k, x: c.x - (c.x - tf.x) * r, y: c.y - (c.y - tf.y) * r };
}

/** The transform for a two-finger gesture: scaled by how far the fingers moved apart, moved with their midpoint. */
export function pinchTransform(start: Transform, from: { a: Point; b: Point }, to: { a: Point; b: Point }, min = 0.2, max = 3): Transform {
  const mid = (s: { a: Point; b: Point }) => ({ x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 });
  const d0 = Math.hypot(from.a.x - from.b.x, from.a.y - from.b.y) || 1;
  const d1 = Math.hypot(to.a.x - to.b.x, to.a.y - to.b.y) || 1;
  const m0 = mid(from);
  const m1 = mid(to);
  const z = zoomAbout(start, d1 / d0, m0, min, max);
  return { k: z.k, x: z.x + (m1.x - m0.x), y: z.y + (m1.y - m0.y) };
}
