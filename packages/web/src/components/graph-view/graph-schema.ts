/*
 * Schema view logic: nodes in one column per kind, connectors between measured cards. Pure, so the column
 * order and connector geometry are testable under node.
 */

export interface SchemaNode {
  id: string;
  kind: string;
}
export interface SchemaLink {
  source: string;
  target: string;
}
export interface SchemaColumn<T extends SchemaNode> {
  kind: string;
  nodes: T[];
}

/**
 * One column per kind. Columns follow `kindOrder`; kinds not listed come after in the order they first appear;
 * kinds with no nodes get no column. Nodes keep their order within a column.
 */
export function schemaColumns<T extends SchemaNode>(nodes: T[], kindOrder: string[]): SchemaColumn<T>[] {
  const map = new Map<string, T[]>();
  for (const n of nodes) {
    const list = map.get(n.kind);
    if (list) list.push(n);
    else map.set(n.kind, [n]);
  }
  const ordered = [...kindOrder.filter((k) => map.has(k)), ...[...map.keys()].filter((k) => !kindOrder.includes(k))];
  return ordered.map((kind) => ({ kind, nodes: map.get(kind) as T[] }));
}

/**
 * Reorders the cards of each column after the first so linked cards sit near each other: by the average row of
 * their neighbours in the columns before it (cards with none keep their place at the end).
 */
export function orderByNeighbours<T extends SchemaNode>(columns: SchemaColumn<T>[], links: SchemaLink[]): SchemaColumn<T>[] {
  const row = new Map<string, number>();
  return columns.map((c, ci) => {
    if (ci === 0) {
      c.nodes.forEach((n, i) => row.set(n.id, i));
      return c;
    }
    const score = (id: string) => {
      const rows: number[] = [];
      for (const l of links) {
        const other = l.source === id ? l.target : l.target === id ? l.source : null;
        const r = other === null ? undefined : row.get(other);
        if (r !== undefined) rows.push(r);
      }
      return rows.length ? rows.reduce((s, x) => s + x, 0) / rows.length : Number.POSITIVE_INFINITY;
    };
    const sorted = c.nodes.map((n, i) => ({ n, i, s: score(n.id) })).sort((a, b) => (a.s === b.s ? a.i - b.i : a.s - b.s));
    sorted.forEach((x, i) => row.set(x.n.id, i));
    return { kind: c.kind, nodes: sorted.map((x) => x.n) };
  });
}

export interface SchemaBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SchemaConnector {
  d: string;
  mid: { x: number; y: number };
  /** Where it ends and the direction it points, for an arrowhead. */
  end: { x: number; y: number };
  angle: number;
}

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * A connector between two measured cards. Cards in different columns join facing side to facing side with a
 * horizontal S-curve, whatever the reading direction, since it only looks at where the boxes are. Cards in the
 * same column loop out around the given screen `side`.
 */
export function schemaConnector(a: SchemaBox, b: SchemaBox, side: "right" | "left" = "right"): SchemaConnector {
  const ay = a.y + a.h / 2;
  const by = b.y + b.h / 2;
  const acx = a.x + a.w / 2;
  const bcx = b.x + b.w / 2;
  if (Math.abs(acx - bcx) < Math.min(a.w, b.w) / 2) {
    const dir = side === "right" ? 1 : -1;
    const out = Math.min(56, 26 + Math.abs(by - ay) * 0.1);
    const sx = side === "right" ? a.x + a.w : a.x;
    const ex = side === "right" ? b.x + b.w : b.x;
    const edge = side === "right" ? Math.max(sx, ex) : Math.min(sx, ex);
    return {
      d: `M ${f(sx)} ${f(ay)} C ${f(sx + dir * out)} ${f(ay)}, ${f(ex + dir * out)} ${f(by)}, ${f(ex)} ${f(by)}`,
      mid: { x: edge + dir * out * 0.75, y: (ay + by) / 2 },
      end: { x: ex, y: by },
      angle: dir === 1 ? Math.PI : 0,
    };
  }
  const right = bcx > acx;
  const sx = right ? a.x + a.w : a.x;
  const ex = right ? b.x : b.x + b.w;
  const dx = (ex - sx) / 2;
  return {
    d: `M ${f(sx)} ${f(ay)} C ${f(sx + dx)} ${f(ay)}, ${f(ex - dx)} ${f(by)}, ${f(ex)} ${f(by)}`,
    mid: { x: (sx + ex) / 2, y: (ay + by) / 2 },
    end: { x: ex, y: by },
    angle: right ? 0 : Math.PI,
  };
}

/** Scale and offset that fit a `content` box in a viewport, anchored to the start edge. Never enlarges past 1; `height: false` fits the width only. */
export function schemaFit(content: { w: number; h: number }, view: { w: number; h: number }, rtl: boolean, { height = true, min = 0.3 }: { height?: boolean; min?: number } = {}): { x: number; y: number; k: number } {
  const k = Math.max(min, Math.min(1, view.w / Math.max(content.w, 1), height ? view.h / Math.max(content.h, 1) : 1));
  return { k, x: rtl ? view.w - content.w * k : 0, y: 0 };
}
