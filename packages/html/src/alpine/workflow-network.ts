// nqWorkflowNetwork: lays out a workflow's step cards in balanced rows (or one column on a narrow container) and
// draws the connectors between them. The markup is the React WorkflowNetwork's; Blade renders the first frame
// (rows of up to four, as React does before it has measured anything), this module re-flows the rows to the
// container and draws the SVG paths and their labels from the cards' measured boxes.
//
//   <figure data-slot="workflow-network" x-data="nqWorkflowNetwork({ ids: ['ask','check'], links: null, layout: 'auto', uid: 'nq-net-1' })">
//     <div data-net="flow"><svg data-net="edges">…</svg>
//       <div data-net="rows"><div data-net="row"><div data-net="cell"><div data-step="ask">…</div></div> …
//
// Geometry is the React network-geometry.ts, copied: neighbours on a row join side to side, rows join bottom to
// top, a jump over other steps on the same row arcs above them, a jump in a single column routes round the side.
// Reading direction comes from the computed `direction`, so an Arabic flow runs right to left and nothing here
// mirrors by hand.

import type { Register } from "./types";

interface Link {
  from: string;
  to: string;
  label?: string;
}
interface Config {
  ids: string[];
  links: Link[] | null;
  layout: "horizontal" | "vertical" | "auto";
  highlight?: string | null;
  animate?: boolean;
  uid: string;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Connector {
  d: string;
  mid: { x: number; y: number };
}

/** The links as step indexes. Without links the steps run in order. Unknown ids and self links are dropped. */
export function networkLinks(ids: string[], links?: Link[] | null): { from: number; to: number; label?: string }[] {
  if (!links || links.length === 0) return ids.slice(1).map((_, i) => ({ from: i, to: i + 1 }));
  const index = new Map(ids.map((id, i) => [id, i]));
  const out: { from: number; to: number; label?: string }[] = [];
  for (const l of links) {
    const from = index.get(l.from);
    const to = index.get(l.to);
    if (from === undefined || to === undefined || from === to) continue;
    out.push(l.label === undefined || l.label === null ? { from, to } : { from, to, label: l.label });
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

const SVG = "http://www.w3.org/2000/svg";
const LABEL =
  "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-background px-2 text-caption text-muted-foreground";

export const workflowNetwork: Register = (Alpine) => {
  Alpine.data("nqWorkflowNetwork", (config: Config) => {
    let ro: ResizeObserver | undefined;
    let signature = "";
    let drawn = false;
    return {
      init(this: { $el: HTMLElement; $nextTick(fn: () => void): void }) {
        const root = this.$el;
        const flow = root.querySelector<HTMLElement>('[data-net="flow"]');
        const stack = root.querySelector<HTMLElement>('[data-net="rows"]');
        const svg = root.querySelector<SVGSVGElement>('[data-net="edges"]');
        if (!flow || !stack || !svg) return;
        const n = config.ids.length;
        const indexed = networkLinks(config.ids, config.links);
        const jumps = indexed.some((e) => Math.abs(e.to - e.from) > 1);

        const reflow = () => {
          const width = flow.clientWidth;
          const em = Number.parseFloat(getComputedStyle(flow).fontSize) || 16;
          const vertical = config.layout === "vertical" || (config.layout !== "horizontal" && width > 0 && width < em * 30);
          const perRow = Math.max(2, Math.min(6, Math.floor((width + em * 2.6) / (em * 11.5)) || 4));
          const rows = vertical ? config.ids.map(() => 1) : rowsFor(n, config.layout === "horizontal" ? Math.max(perRow, Math.min(n, 4)) : perRow);
          const arcs = !vertical && jumps;
          const next = `${vertical}|${rows.join(",")}|${arcs}`;
          if (next !== signature) {
            signature = next;
            const cells = [...stack.querySelectorAll<HTMLElement>('[data-net="cell"]')];
            for (const row of [...stack.children]) row.remove();
            let at = 0;
            for (const count of rows) {
              const row = document.createElement("div");
              row.setAttribute("data-net", "row");
              row.className = vertical ? "flex items-stretch justify-center mx-auto w-full max-w-[26rem]" : "flex items-stretch justify-center gap-10";
              for (const cell of cells.slice(at, at + count)) {
                cell.className = vertical ? "flex min-w-0 w-full" : "flex min-w-0 max-w-64 flex-1 basis-0";
                row.append(cell);
              }
              at += count;
              stack.append(row);
            }
            stack.className = `relative flex flex-col p-2 ${vertical ? "gap-9" : "gap-10"}`;
            flow.className = ["relative", arcs ? "pt-12" : "", vertical && jumps ? "px-12" : ""].filter(Boolean).join(" ");
            root.setAttribute("data-layout", vertical ? "vertical" : "horizontal");
          }
          draw(vertical, width);
        };

        const draw = (vertical: boolean, width: number) => {
          if (width === 0) return;
          const rtl = getComputedStyle(flow).direction === "rtl";
          const origin = flow.getBoundingClientRect();
          const scale = flow.offsetWidth ? origin.width / flow.offsetWidth : 1;
          const boxes: Box[] = [...flow.querySelectorAll<HTMLElement>("[data-step]")].map((c) => {
            const r = c.getBoundingClientRect();
            return { x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale };
          });
          if (boxes.length !== n) return;
          svg.setAttribute("width", String(flow.offsetWidth));
          svg.setAttribute("height", String(flow.offsetHeight));
          svg.setAttribute("viewBox", `0 0 ${flow.offsetWidth || 1} ${flow.offsetHeight || 1}`);
          for (const old of svg.querySelectorAll("path[data-edge]")) old.remove();
          for (const old of flow.querySelectorAll("[data-net-label]")) old.remove();
          const first = !drawn;
          drawn = true;
          indexed.forEach((e, i) => {
            const a = boxes[e.from];
            const b = boxes[e.to];
            if (!a || !b) return;
            const skip = Math.abs(e.to - e.from) > 1;
            const c = vertical && skip ? sideConnector(a, b, rtl ? "left" : "right") : connector(a, b);
            const hot = Boolean(config.highlight) && (config.ids[e.from] === config.highlight || config.ids[e.to] === config.highlight);
            const path = document.createElementNS(SVG, "path");
            path.setAttribute("d", c.d);
            path.setAttribute("pathLength", "1");
            path.setAttribute("data-edge", String(i));
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-width", hot ? "2" : "1.5");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("class", [hot ? "stroke-nq-brand" : "stroke-current", config.animate && first ? "nq-net-draw" : ""].filter(Boolean).join(" "));
            if (config.animate && first) path.style.animationDelay = `${i * 90}ms`;
            path.setAttribute("marker-end", `url(#${config.uid}${hot ? "-hot" : ""})`);
            svg.append(path);
            if (e.label) {
              const label = document.createElement("span");
              label.setAttribute("data-net-label", String(i));
              label.className = LABEL;
              label.style.left = `${c.mid.x}px`;
              label.style.top = `${c.mid.y}px`;
              label.textContent = e.label;
              flow.append(label);
            }
          });
        };

        reflow();
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => reflow());
          ro.observe(flow);
        }
      },
      destroy() {
        ro?.disconnect();
      },
    };
  });
};
