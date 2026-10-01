/*
 * Workflow network geometry. Pure: no DOM, so the layout rules can be tested under node.
 * Steps flow in the reading direction (the rows are ordinary flex rows, so RTL mirrors by itself); these
 * functions only work out which steps are linked and how the connectors are drawn between measured boxes.
 */

export interface NetworkLink {
  from: string;
  to: string;
  label?: string;
}

export interface IndexedLink {
  from: number;
  to: number;
  label?: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The links as step indexes. Without links the steps run in order. Unknown ids and self links are dropped. */
export function networkLinks(ids: string[], links?: NetworkLink[]): IndexedLink[] {
  if (!links || links.length === 0) return ids.slice(1).map((_, i) => ({ from: i, to: i + 1 }));
  const index = new Map(ids.map((id, i) => [id, i]));
  const out: IndexedLink[] = [];
  for (const l of links) {
    const from = index.get(l.from);
    const to = index.get(l.to);
    if (from === undefined || to === undefined || from === to) continue;
    out.push(l.label === undefined ? { from, to } : { from, to, label: l.label });
  }
  return out;
}

/** Columns per row for a horizontal flow: at most `max`, balanced across the rows. */
export function rowsFor(count: number, max: number): number[] {
  if (count <= 0) return [];
  const rows = Math.max(1, Math.ceil(count / Math.max(1, max)));
  const per = Math.ceil(count / rows);
  const out: number[] = [];
  let left = count;
  while (left > 0) {
    out.push(Math.min(per, left));
    left -= per;
  }
  return out;
}

export interface Connector {
  d: string;
  mid: { x: number; y: number };
}

/**
 * A connector between two boxes as an SVG path. Neighbours on a row join side to side, rows join bottom to
 * top, and a jump over other steps on the same row arcs above them. It only looks at where the boxes are,
 * so it works for any reading direction.
 */
export function connector(a: Box, b: Box): Connector {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const sameRow = Math.abs(acy - bcy) < Math.min(a.h, b.h) / 2;
  if (sameRow) {
    const gap = Math.abs(bcx - acx);
    const neighbour = gap < (a.w + b.w) / 2 + Math.max(a.w, b.w) * 0.9;
    if (neighbour) {
      const sx = bcx > acx ? a.x + a.w : a.x;
      const ex = bcx > acx ? b.x : b.x + b.w;
      const dx = (ex - sx) / 2;
      return { d: `M ${sx} ${acy} C ${sx + dx} ${acy}, ${ex - dx} ${bcy}, ${ex} ${bcy}`, mid: { x: (sx + ex) / 2, y: (acy + bcy) / 2 } };
    }
    const lift = Math.min(60, 18 + gap * 0.12);
    return {
      d: `M ${acx} ${a.y} C ${acx} ${a.y - lift}, ${bcx} ${b.y - lift}, ${bcx} ${b.y}`,
      mid: { x: (acx + bcx) / 2, y: Math.min(a.y, b.y) - lift * 0.75 },
    };
  }
  const down = bcy > acy;
  const sy = down ? a.y + a.h : a.y;
  const ey = down ? b.y : b.y + b.h;
  const dy = (ey - sy) / 2;
  return { d: `M ${acx} ${sy} C ${acx} ${sy + dy}, ${bcx} ${ey - dy}, ${bcx} ${ey}`, mid: { x: (acx + bcx) / 2, y: (sy + ey) / 2 } };
}

/** A jump in a single column, routed around the cards on one side ("start" = left, "end" = right, in x terms). */
export function sideConnector(a: Box, b: Box, side: "left" | "right"): Connector {
  const out = Math.min(48, 22 + Math.abs(b.y - a.y) * 0.08);
  const sx = side === "right" ? a.x + a.w : a.x;
  const ex = side === "right" ? b.x + b.w : b.x;
  const sy = a.y + a.h / 2;
  const ey = b.y + b.h / 2;
  const k = side === "right" ? out : -out;
  const edge = side === "right" ? Math.max(sx, ex) : Math.min(sx, ex);
  return { d: `M ${sx} ${sy} C ${sx + k} ${sy}, ${ex + k} ${ey}, ${ex} ${ey}`, mid: { x: edge + k * 0.75, y: (sy + ey) / 2 } };
}
