// nqGraph: one knowledge graph, four views (the React GraphView): a live force-directed graph you can drag, pan and
// zoom, a grid of cards, a sortable list and a schema of columns with connectors. Search and type filters apply to
// all of them, the selection follows you across views, and an inspector shows the selected node and its links.
// The Blade component (<x-nq::graph-view>) renders the toolbar and frame; the four views and the inspector are
// painted from here as HTML strings, with every piece of user text escaped.
//
//   <div x-data="nqGraph({ nodes, links, kinds, linkKinds, icons, mode: 'graph', openable: true })">
//
// Config: nodes [{ id, label, kind, description?, tags?, updatedAt?, shape?, weight?, icon?, labelPosition? }],
// links [{ source, target, label?, kind? }], kinds [{ id, label, hue, icon?, shape?, labelPosition? }],
// linkKinds [{ id, style?: solid|dashed|flow, arrow?, hue? }], icons { name: "<svg inner markup>" } (trusted markup),
// mode, selectedId, animate (default true; always off under prefers-reduced-motion), labelPosition, arrows, openable
// (adds an Open button to the inspector), labels (string overrides). Events (bubbling, from the root): "select" { id },
// "mode" { mode }, "open" { node }, "pinned" { ids }.

import { adjacency, boundsOf, filterNodes, fitTransform, forceLayout, linksAmong, nodeRadius, pinchTransform, sortRows, toGraphPoint, zoomAbout, type ListSortKey, type Point, type Transform } from "./graph-view-core/graph-layout";
import { orderByNeighbours, schemaColumns, schemaConnector, schemaFit, type SchemaBox } from "./graph-view-core/graph-schema";
import { arrowPoints, dashFor, linkEnds, shapeExtent, shapePath, type GraphLinkStyle, type GraphNodeShape } from "./graph-view-core/graph-shapes";
import { createSimulation, type SimInput } from "./graph-view-core/graph-sim";
import { GRAPH_STRINGS, type GraphViewLabels } from "./graph-view-core/graph-strings";
import type { Magics, Register } from "./types";

export type GraphViewMode = "graph" | "grid" | "list" | "schema";
type LabelPosition = "bottom" | "right" | "inside" | "none";

export interface GraphNodeConfig {
  id: string;
  label: string;
  kind: string;
  description?: string;
  tags?: string[];
  updatedAt?: string | number;
  shape?: GraphNodeShape;
  weight?: number;
  icon?: string;
  labelPosition?: LabelPosition;
}
export interface GraphLinkConfig {
  source: string;
  target: string;
  label?: string;
  kind?: string;
}
export interface GraphKindConfig {
  id: string;
  label: string;
  hue: string;
  icon?: string;
  shape?: GraphNodeShape;
  labelPosition?: LabelPosition;
}
export interface GraphLinkKindConfig {
  id: string;
  style?: GraphLinkStyle;
  arrow?: boolean;
  hue?: string;
}
export interface GraphConfig {
  nodes: GraphNodeConfig[];
  links: GraphLinkConfig[];
  kinds: GraphKindConfig[];
  linkKinds?: GraphLinkKindConfig[];
  icons?: Record<string, string>;
  mode?: GraphViewMode;
  selectedId?: string | null;
  animate?: boolean;
  labelPosition?: LabelPosition;
  arrows?: boolean;
  openable?: boolean;
  labels?: Partial<Record<keyof GraphViewLabels, string>>;
}

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export const hueVar = (hue: string | undefined) => (hue ? `var(--nq-tag-${hue})` : "var(--nq-line-strong)");
export function fitText(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= Math.max(1, max) ? text : `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}
/** Everything the graph and grid agree on: which nodes show, and which links join them. */
export function visible(nodes: GraphNodeConfig[], links: GraphLinkConfig[], query: string, kinds: string[]) {
  const shown = filterNodes(nodes, { query, kinds });
  return { nodes: shown, links: linksAmong(links, new Set(shown.map((n) => n.id))) };
}
export { adjacency, filterNodes, sortRows };

const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const STROKED = "paint-order:stroke;stroke:var(--nq-bg);stroke-width:3";
const TOGGLE = "flex w-full flex-col gap-1 rounded-card border bg-card text-start shadow-xs outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";
const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-nq-focus";

interface Look {
  shape: GraphNodeShape;
  r: number;
  label: LabelPosition;
  icon: string | undefined;
}

type Scope = Magics & {
  $nq: { t(en: string, ar: string): string; locale: string };
  nodes: GraphNodeConfig[];
  links: GraphLinkConfig[];
  kinds: GraphKindConfig[];
  mode: GraphViewMode;
  selectedId: string | null;
  query: string;
  picked: string[];
  sortKey: ListSortKey;
  sortDir: "asc" | "desc";
  frame: number;
  hover: string | null;
} & Record<string, any>;

export const graphView: Register = (Alpine) => {
  Alpine.data("nqGraph", (config: GraphConfig) => {
    // Non-reactive state: the simulation, the viewport and the gesture in flight.
    const sim = createSimulation([], []);
    let tf: Transform = { x: 0, y: 0, k: 1 };
    let userMoved = false;
    let size = { w: 0, h: 0 };
    let raf = 0;
    let handled = 0;
    let lastTap: { id: string; at: number } | null = null;
    let looks = new Map<string, Look>();
    let around = adjacency(config.links ?? []);
    let still = new Map<string, Point>();
    let reducedMotion = false;
    let focusedId: string | null = null;
    const gate = { visible: true, onscreen: true };
    const pointers = new Map<number, Point>();
    type Gesture =
      | { kind: "node"; id: string; pointer: number; sx: number; sy: number; moved: boolean }
      | { kind: "pan"; pointer: number; sx: number; sy: number; ox: number; oy: number; moved: boolean }
      | { kind: "pinch"; start: Transform; a: Point; b: Point };
    let gesture: Gesture | null = null;
    let cleanup: Array<() => void> = [];
    const kindMap = new Map(config.kinds.map((k) => [k.id, k]));
    const linkKindMap = new Map((config.linkKinds ?? []).map((k) => [k.id, k]));
    const byId = new Map(config.nodes.map((n) => [n.id, n]));

    return {
      nodes: config.nodes,
      links: config.links,
      kinds: config.kinds,
      mode: (config.mode ?? "graph") as GraphViewMode,
      selectedId: (config.selectedId ?? null) as string | null,
      query: "",
      picked: [] as string[],
      sortKey: "label" as ListSortKey,
      sortDir: "asc" as "asc" | "desc",
      frame: 0,
      hover: null as string | null,

      init(this: Scope & Record<string, any>) {
        const stage = this.$refs.stage;
        reducedMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)").matches : false;
        this.measure();
        if (typeof ResizeObserver !== "undefined" && stage) {
          const ro = new ResizeObserver(() => this.measure());
          ro.observe(stage);
          cleanup.push(() => ro.disconnect());
        }
        if (typeof IntersectionObserver !== "undefined" && stage) {
          const io = new IntersectionObserver((entries) => {
            gate.onscreen = entries[entries.length - 1]?.isIntersecting ?? true;
            this.sync();
          });
          io.observe(stage);
          cleanup.push(() => io.disconnect());
        }
        const onVis = () => {
          gate.visible = document.visibilityState !== "hidden";
          this.sync();
        };
        document.addEventListener("visibilitychange", onVis);
        cleanup.push(() => document.removeEventListener("visibilitychange", onVis));
        const onWheel = (e: WheelEvent) => this.wheel(e);
        stage?.addEventListener("wheel", onWheel, { passive: false });
        cleanup.push(() => stage?.removeEventListener("wheel", onWheel));
        const onFocusIn = (e: FocusEvent) => {
          focusedId = (e.target as Element | null)?.closest?.("[data-node]")?.getAttribute("data-node") ?? null;
        };
        stage?.addEventListener("focusin", onFocusIn);
        cleanup.push(() => stage?.removeEventListener("focusin", onFocusIn));
        this.$watch("query", () => this.refilter());
        this.$watch("picked", () => this.refilter());
        this.refilter(true);
        this.$watch("mode", () => {
          userMoved = false;
          this.$root.dispatchEvent(new CustomEvent("mode", { detail: { mode: this.mode }, bubbles: true }));
          this.$nextTick(() => this.sync());
        });
        this.$watch("selectedId", (id: string | null) => this.$root.dispatchEvent(new CustomEvent("select", { detail: { id }, bubbles: true })));
      },
      destroy() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        cleanup.forEach((fn) => fn());
        cleanup = [];
      },

      /* ---------- text ---------- */
      get locale(): string {
        return (this as unknown as Scope).$nq.locale;
      },
      get rtl(): boolean {
        return this.locale.startsWith("ar");
      },
      get t(): GraphViewLabels {
        return { ...GRAPH_STRINGS[this.rtl ? "ar" : "en"], ...(config.labels ?? {}) } as GraphViewLabels;
      },
      n(value: number): string {
        return new Intl.NumberFormat(this.rtl ? "ar-u-nu-arab" : "en").format(value);
      },
      get countsText(): string {
        const v = this.visibleSet();
        return this.t.counts(this.n(v.nodes.length), this.n(v.links.length));
      },
      get modeValue(): string[] {
        return [this.mode];
      },
      set modeValue(v: string[]) {
        if (v[0] && v[0] !== this.mode) this.mode = v[0] as GraphViewMode;
      },
      get isViewport(): boolean {
        return this.mode === "graph" || this.mode === "schema";
      },
      get hint(): string {
        return this.mode === "graph" ? this.t.graphHint : this.mode === "schema" ? this.t.schemaHint : "";
      },

      /* ---------- data ---------- */
      visibleSet(this: Scope) {
        return visible(this.nodes, this.links, this.query, [...this.picked]);
      },
      get filtered(): boolean {
        return this.query.trim() !== "" || this.picked.length > 0;
      },
      get node(): GraphNodeConfig | undefined {
        return this.selectedId ? byId.get(this.selectedId) : undefined;
      },
      kindOf: (id: string) => kindMap.get(id),
      select(this: Scope, id: string | null) {
        this.selectedId = id;
      },
      toggle(this: Scope, id: string) {
        this.selectedId = id === this.selectedId ? null : id;
      },
      clear(this: Scope) {
        this.query = "";
        this.picked = [];
      },
      setMode(this: Scope, mode: GraphViewMode) {
        this.mode = mode;
      },

      /* ---------- the simulation ---------- */
      get live(): boolean {
        return config.animate !== false && !reducedMotion;
      },
      measure(this: Scope & Record<string, any>) {
        const el = this.$refs.stage;
        if (!el) return;
        const next = { w: el.clientWidth, h: el.clientHeight };
        if (next.w === size.w && next.h === size.h) return;
        size = next;
        if (!userMoved) this.fitNow();
        else this.bump();
      },
      refilter(this: Scope & Record<string, any>, first = false) {
        const v = this.visibleSet();
        looks = new Map();
        const inputs: SimInput[] = v.nodes.map((n: GraphNodeConfig) => {
          const kind = kindMap.get(n.kind);
          const shape = (n.shape ?? kind?.shape ?? "circle") as GraphNodeShape;
          const r = nodeRadius(around.get(n.id)?.size ?? 0, n.weight);
          looks.set(n.id, { shape, r, label: n.labelPosition ?? kind?.labelPosition ?? config.labelPosition ?? "bottom", icon: n.icon ?? kind?.icon });
          const e = shapeExtent(shape, r);
          return { id: n.id, r: Math.max(e.hw, e.hh) };
        });
        still = forceLayout(v.nodes.map((n: GraphNodeConfig) => ({ id: n.id })), v.links, { iterations: v.nodes.length > 250 ? 120 : 260 });
        sim.update(inputs, v.links);
        if (this.live) this.kick();
        else sim.cool();
        if (!first) userMoved = false;
        this.fitNow();
        this.bump();
      },
      bump(this: Scope) {
        this.frame++;
      },
      positions(): Map<string, Point> {
        if (this.live) return sim.positions();
        const map = new Map(still);
        for (const p of sim.nodes) if (p.fx !== null && p.fy !== null) map.set(p.id, { x: p.fx, y: p.fy });
        return map;
      },
      mayRun(): boolean {
        return this.live && gate.visible && gate.onscreen && this.mode === "graph";
      },
      kick(this: Scope & Record<string, any>) {
        if (raf || !this.mayRun() || typeof requestAnimationFrame === "undefined") return;
        raf = requestAnimationFrame(() => this.loop());
      },
      sync(this: Scope & Record<string, any>) {
        if (this.mayRun()) this.kick();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      loop(this: Scope & Record<string, any>) {
        raf = 0;
        if (!this.mayRun()) return;
        const moving = sim.tick();
        if (!userMoved && size.w > 0) {
          const b = boundsOf(sim.positions().values(), 48);
          if (b) {
            const target = fitTransform(b, size.w, size.h);
            tf = moving ? { x: tf.x + (target.x - tf.x) * 0.12, y: tf.y + (target.y - tf.y) * 0.12, k: tf.k + (target.k - tf.k) * 0.12 } : target;
          }
        }
        this.bump();
        if (moving) this.kick();
      },
      fitNow(this: Scope & Record<string, any>) {
        if (this.mode !== "graph") return;
        const b = boundsOf(this.positions().values(), 48);
        if (b && size.w > 0) tf = fitTransform(b, size.w, size.h);
        this.applyViewport();
      },

      /* ---------- viewport ---------- */
      applyViewport(this: Scope) {
        const g = this.$root.querySelector<SVGGElement>('[data-role="viewport"]');
        if (g) g.setAttribute("transform", `translate(${tf.x} ${tf.y}) scale(${tf.k})`);
        const c = this.$root.querySelector<HTMLElement>('[data-role="schema-content"]');
        if (c) c.style.transform = `translate(${tf.x}px, ${tf.y}px) scale(${tf.k})`;
      },
      setTf(this: Scope & Record<string, any>, next: Transform, moved = true) {
        if (moved) userMoved = true;
        tf = next;
        this.applyViewport();
      },
      zoom(this: Scope & Record<string, any>, factor: number) {
        this.setTf(zoomAbout(tf, factor, { x: size.w / 2, y: size.h / 2 }, this.mode === "schema" ? 0.3 : 0.2, this.mode === "schema" ? 2 : 3));
      },
      fit(this: Scope & Record<string, any>) {
        userMoved = false;
        if (this.mode === "schema") {
          this.setTf(schemaFit(this.schemaExtent(), size, this.rtl, { height: true }), false);
        } else this.fitNow();
      },
      wheel(this: Scope & Record<string, any>, e: WheelEvent) {
        if (!this.isViewport) return;
        e.preventDefault();
        const r = this.$refs.stage!.getBoundingClientRect();
        if (this.mode === "schema" && !e.ctrlKey && !e.metaKey) {
          this.setTf({ ...tf, x: tf.x - e.deltaX, y: tf.y - e.deltaY });
          return;
        }
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        this.setTf(zoomAbout(tf, factor, { x: e.clientX - r.left, y: e.clientY - r.top }, this.mode === "schema" ? 0.3 : 0.2, this.mode === "schema" ? 2 : 3));
      },

      /* ---------- pointer gestures ---------- */
      local(this: Scope, e: { clientX: number; clientY: number }): Point {
        const r = this.$refs.stage!.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      },
      pinnedIds: (): string[] => sim.nodes.filter((n) => n.fx !== null).map((n) => n.id),
      down(this: Scope & Record<string, any>, e: PointerEvent) {
        if (!this.isViewport || e.button !== 0 || (e.target as Element).closest("button, [data-role=zoom]")) return;
        pointers.set(e.pointerId, this.local(e));
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointers cannot be captured */
        }
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()] as [Point, Point];
          userMoved = true;
          gesture = { kind: "pinch", start: tf, a, b };
          return;
        }
        const id = (e.target as Element).closest("[data-node]")?.getAttribute("data-node");
        gesture = id && this.mode === "graph"
          ? { kind: "node", id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false }
          : { kind: "pan", pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, moved: false };
        if (id && this.mode === "schema") (gesture as { id?: string }).id = id;
      },
      move(this: Scope & Record<string, any>, e: PointerEvent) {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, this.local(e));
        const g = gesture;
        if (!g) return;
        if (g.kind === "pinch") {
          const pts = [...pointers.values()];
          if (pts.length >= 2) this.setTf(pinchTransform(g.start, { a: g.a, b: g.b }, { a: pts[0] as Point, b: pts[1] as Point }, this.mode === "schema" ? 0.3 : 0.2, this.mode === "schema" ? 2 : 3));
          return;
        }
        if (g.pointer !== e.pointerId) return;
        if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) < 4) return;
        g.moved = true;
        if (g.kind === "pan") {
          this.setTf({ ...tf, x: g.ox + e.clientX - g.sx, y: g.oy + e.clientY - g.sy });
          return;
        }
        const p = toGraphPoint(this.local(e), tf);
        sim.pin(g.id, p.x, p.y, this.live);
        if (this.live) {
          sim.reheat(0.35);
          this.kick();
        }
        this.bump();
      },
      up(this: Scope & Record<string, any>, e: PointerEvent, cancelled = false) {
        pointers.delete(e.pointerId);
        const g = gesture;
        if (g?.kind === "pinch") {
          if (pointers.size < 2) gesture = null;
          return;
        }
        if (!g || g.pointer !== e.pointerId) return;
        gesture = null;
        try {
          (e.currentTarget as Element).releasePointerCapture(e.pointerId);
        } catch {
          /* not captured */
        }
        if (g.kind === "node") {
          if (g.moved) {
            sim.drop();
            if (this.live) this.kick();
            handled = Date.now();
            this.$root.dispatchEvent(new CustomEvent("pinned", { detail: { ids: this.pinnedIds() }, bubbles: true }));
            this.bump();
          } else if (!cancelled) {
            handled = Date.now();
            const prev = lastTap;
            if (prev && prev.id === g.id && Date.now() - prev.at < 400) {
              lastTap = null;
              this.unpin(g.id);
            } else {
              lastTap = { id: g.id, at: Date.now() };
              this.toggle(g.id);
            }
          }
        } else if (!cancelled) {
          const id = (g as { id?: string }).id;
          handled = Date.now();
          if (!g.moved) {
            if (id) this.toggle(id);
            else this.select(null);
          }
        }
      },
      unpin(this: Scope & Record<string, any>, id: string) {
        if (!sim.isPinned(id)) return;
        sim.unpin(id);
        if (this.live) {
          sim.reheat(0.3);
          this.kick();
        }
        this.bump();
        this.$root.dispatchEvent(new CustomEvent("pinned", { detail: { ids: this.pinnedIds() }, bubbles: true }));
      },
      nudge(this: Scope & Record<string, any>, id: string, dx: number, dy: number) {
        const p = this.positions().get(id) ?? { x: 0, y: 0 };
        sim.pin(id, p.x + dx, p.y + dy);
        if (this.live) {
          sim.reheat(0.3);
          this.kick();
        }
        this.bump();
        this.$root.dispatchEvent(new CustomEvent("pinned", { detail: { ids: this.pinnedIds() }, bubbles: true }));
      },
      key(this: Scope & Record<string, any>, e: KeyboardEvent) {
        const id = (e.target as Element).closest("[data-node]")?.getAttribute("data-node");
        if (!id || this.mode !== "graph") return;
        const step = e.shiftKey ? 48 : 12;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggle(id);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          this.nudge(id, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          this.unpin(id);
        }
      },
      over(this: Scope & Record<string, any>, e: Event) {
        const id = (e.target as Element).closest?.("[data-node]")?.getAttribute("data-node") ?? null;
        if (id !== this.hover) {
          this.hover = id;
          if (this.mode === "graph" || this.mode === "schema") this.bump();
        }
      },
      out(this: Scope & Record<string, any>, e: Event) {
        if ((e.target as Element).closest?.("[data-node]") && this.hover !== null) {
          this.hover = null;
          if (this.mode === "graph" || this.mode === "schema") this.bump();
        }
      },
      /** Delegated clicks for every view: nodes, sort headers, the inspector and the empty state. */
      act(this: Scope & Record<string, any>, e: MouseEvent) {
        const el = (e.target as Element).closest<HTMLElement>("[data-act], [data-node]");
        if (!el) return;
        const act = el.getAttribute("data-act");
        if (act === "sort") {
          const key = el.getAttribute("data-key") as ListSortKey;
          this.sortDir = this.sortKey === key && this.sortDir === "asc" ? "desc" : "asc";
          this.sortKey = key;
        } else if (act === "clear") this.clear();
        else if (act === "close") this.select(null);
        else if (act === "goto") this.select(el.getAttribute("data-id"));
        else if (act === "open") {
          const n = this.node;
          if (n) this.$root.dispatchEvent(new CustomEvent("open", { detail: { node: n }, bubbles: true }));
        } else if (el.hasAttribute("data-node") && Date.now() - handled > 400) {
          this.toggle(el.getAttribute("data-node") as string);
        }
      },

      /* ---------- painting ---------- */
      paint(this: Scope & Record<string, any>) {
        // Reactive reads first, so the effect tracks them.
        void this.frame;
        void this.mode;
        void this.selectedId;
        void this.hover;
        void this.sortKey;
        void this.sortDir;
        void this.query;
        void this.picked.length;
        void this.rtl;
        const body = this.$refs.body;
        if (!body) return;
        const v = this.visibleSet();
        let html: string;
        if (v.nodes.length === 0) html = this.emptyHtml();
        else if (this.mode === "graph") html = this.graphHtml(v);
        else if (this.mode === "schema") html = this.schemaHtml(v);
        else if (this.mode === "grid") html = this.gridHtml(v);
        else html = this.listHtml(v);
        body.innerHTML = html;
        if (focusedId && !body.contains(document.activeElement)) {
          const again = body.querySelector<HTMLElement>(`[data-node="${focusedId.replace(/"/g, "\\\"")}"]`);
          if (again && document.activeElement === document.body) again.focus({ preventScroll: true });
        }
        if (this.mode === "schema" && v.nodes.length) this.measureSchema(v);
        this.applyViewport();
      },
      paintInspector(this: Scope & Record<string, any>) {
        void this.selectedId;
        void this.rtl;
        const el = this.$refs.inspector;
        if (el) el.innerHTML = this.inspectorHtml();
      },

      emptyHtml(this: Scope & Record<string, any>): string {
        const t = this.t;
        return `<div class="flex h-full items-center justify-center p-6"><div data-slot="empty-state" class="flex flex-col items-center gap-3 text-center"><h3 class="text-title text-foreground">${esc(t.emptyTitle)}</h3><p class="max-w-sm text-body-sm text-muted-foreground">${esc(t.emptyBody)}</p>${
          this.filtered ? `<button type="button" data-act="clear" class="inline-flex h-control items-center rounded-control border border-border bg-card px-3 text-label hover:bg-nq-hover ${FOCUS}">${esc(t.clear)}</button>` : ""
        }</div></div>`;
      },

      icon(this: Scope & Record<string, any>, name: string | undefined, cls = "size-4"): string {
        const inner = name ? config.icons?.[name] : undefined;
        return inner ? `<svg ${ICON_ATTRS} stroke-width="2" class="${cls}">${inner}</svg>` : "";
      },

      graphHtml(this: Scope & Record<string, any>, v: ReturnType<typeof visible>): string {
        const t = this.t;
        const pos = this.positions();
        const at = (id: string): Point => pos.get(id) ?? { x: 0, y: 0 };
        const focus = this.hover ?? this.selectedId;
        const near = focus ? around.get(focus) : undefined;
        const live = this.live;
        let out = `<svg width="${size.w}" height="${size.h}" role="group" aria-label="${esc(t.graph)}" class="block"><g data-role="viewport" transform="translate(${tf.x} ${tf.y}) scale(${tf.k})">`;
        v.links.forEach((l: GraphLinkConfig) => {
          const la = looks.get(l.source);
          const lb = looks.get(l.target);
          if (!la || !lb) return;
          const a = at(l.source);
          const b = at(l.target);
          const lk = l.kind ? linkKindMap.get(l.kind) : undefined;
          const hot = focus !== null && (l.source === focus || l.target === focus);
          const dim = focus !== null && !hot;
          const ends = linkEnds(a, la.shape, la.r, b, lb.shape, lb.r);
          const arrow = config.arrows === true || lk?.arrow === true;
          const lineEnd = arrow ? { x: ends.b.x - Math.cos(ends.angle) * 6, y: ends.b.y - Math.sin(ends.angle) * 6 } : ends.b;
          const colour = !hot && lk?.hue ? hueVar(lk.hue) : undefined;
          const dash = dashFor(lk?.style);
          const strokeCls = colour ? "" : hot ? "stroke-nq-brand" : "stroke-nq-line-strong";
          const fillCls = colour ? "" : hot ? "fill-nq-brand" : "fill-nq-line-strong";
          out += `<g${lk ? ` data-link-kind="${esc(lk.id)}"` : ""} class="transition-opacity${dim ? " opacity-20" : ""}"><line x1="${ends.a.x}" y1="${ends.a.y}" x2="${lineEnd.x}" y2="${lineEnd.y}" stroke-width="${hot ? 2 : 1.25}"${dash ? ` stroke-dasharray="${dash}"` : ""}${colour ? ` style="stroke:${colour}"` : ""} class="${strokeCls}">${
            lk?.style === "flow" && live ? '<animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" />' : ""
          }</line>${arrow ? `<polygon points="${arrowPoints(ends.b, ends.angle)}"${colour ? ` style="fill:${colour}"` : ""} class="${fillCls}" />` : ""}${
            hot && l.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2}" text-anchor="middle" font-size="10" class="fill-muted-foreground" style="${STROKED}">${esc(l.label)}</text>` : ""
          }</g>`;
        });
        for (const n of v.nodes as GraphNodeConfig[]) {
          const look = looks.get(n.id);
          if (!look) continue;
          const p = at(n.id);
          const kind = kindMap.get(n.kind);
          const ext = shapeExtent(look.shape, look.r);
          const dim = focus !== null && n.id !== focus && !near?.has(n.id);
          const on = n.id === this.selectedId;
          const pin = sim.isPinned(n.id);
          const name = kind ? `${n.label}, ${kind.label}` : n.label;
          const showLabel = look.label !== "none" && (tf.k >= 0.55 || !dim || on);
          const inner = look.icon ? config.icons?.[look.icon] : undefined;
          out += `<g transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="${esc(pin ? `${name}, ${t.pinned}` : name)}" aria-pressed="${on}" data-node="${esc(n.id)}"${pin ? ' data-pinned="true"' : ""} data-shape="${look.shape}" class="cursor-grab outline-none transition-opacity active:cursor-grabbing${dim ? " opacity-25" : ""}">`;
          if (on) out += `<path d="${shapePath(look.shape, look.r + 5)}" fill="none" stroke-width="2" class="stroke-nq-focus" />`;
          out += `<path d="${shapePath(look.shape, look.r)}" stroke-width="2" class="stroke-background" style="fill:${hueVar(kind?.hue)}" />`;
          if (inner && look.r >= 9) out += `<svg ${ICON_ATTRS} x="${-look.r * 0.55}" y="${-look.r * 0.55}" width="${look.r * 1.1}" height="${look.r * 1.1}" stroke-width="2.2" class="pointer-events-none text-white">${inner}</svg>`;
          if (pin) out += `<circle cx="${ext.hw * 0.75}" cy="${-ext.hh * 0.75}" r="3.5" stroke-width="1.5" class="fill-nq-brand stroke-background" />`;
          if (showLabel && look.label === "bottom") out += `<text y="${ext.hh + 13}" text-anchor="middle" font-size="11" class="pointer-events-none fill-foreground" style="${STROKED}">${esc(n.label)}</text>`;
          if (showLabel && look.label === "right") out += `<text x="${ext.hw + 6}" y="4" text-anchor="start" font-size="11" class="pointer-events-none fill-foreground" style="${STROKED}">${esc(n.label)}</text>`;
          if (look.label === "inside") out += `<text y="4" text-anchor="middle" font-size="10" class="pointer-events-none fill-white">${esc(fitText(n.label, Math.floor((ext.hw * 2 - 8) / 5.6)))}</text>`;
          out += "</g>";
        }
        return `${out}</g></svg>`;
      },

      gridHtml(this: Scope & Record<string, any>, v: ReturnType<typeof visible>): string {
        const t = this.t;
        let out = '<ul class="grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-3 overflow-y-auto p-3">';
        for (const n of v.nodes as GraphNodeConfig[]) {
          const kind = kindMap.get(n.kind);
          const on = n.id === this.selectedId;
          out += `<li class="min-w-0"><button type="button" aria-pressed="${on}" data-node="${esc(n.id)}" class="${TOGGLE} h-full gap-2 p-3 ${on ? "border-primary bg-nq-selected" : "border-border"}">`;
          out += `<span class="flex items-center gap-2.5"><span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-4" style="background-color:${hueVar(kind?.hue)}">${this.icon(n.icon ?? kind?.icon)}</span>`;
          out += `<span class="min-w-0"><span class="block truncate text-label text-foreground">${esc(n.label)}</span><span class="block truncate text-caption text-muted-foreground">${esc(kind?.label ?? n.kind)}</span></span></span>`;
          if (n.description) out += `<span class="line-clamp-2 text-body-sm text-muted-foreground">${esc(n.description)}</span>`;
          out += `<span class="mt-auto flex items-center justify-between gap-2 text-caption text-muted-foreground"><bdi>${esc(t.connections(this.n(around.get(n.id)?.size ?? 0)))}</bdi>${
            n.updatedAt !== undefined ? `<span>${esc(this.date(n.updatedAt))}</span>` : ""
          }</span></button></li>`;
        }
        return `${out}</ul>`;
      },
      date(this: Scope & Record<string, any>, value: string | number): string {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(this.rtl ? "ar-u-nu-arab" : "en", { dateStyle: "medium" }).format(d);
      },

      listHtml(this: Scope & Record<string, any>, v: ReturnType<typeof visible>): string {
        const t = this.t;
        const rows = sortRows(
          v.nodes.map((n: GraphNodeConfig) => ({ node: n, label: n.label, kind: kindMap.get(n.kind)?.label ?? n.kind, links: around.get(n.id)?.size ?? 0, ...(n.updatedAt !== undefined ? { updated: new Date(n.updatedAt).getTime() } : {}) })),
          this.sortKey,
          this.sortDir,
          this.locale,
        );
        const cols: [ListSortKey, string][] = [["label", t.colName], ["kind", t.colKind], ["links", t.colLinks], ["updated", t.colUpdated]];
        const arrow = (key: ListSortKey) =>
          this.sortKey !== key
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-3.5 text-muted-foreground"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>'
            : this.sortDir === "asc"
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-3.5"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-3.5"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
        let out = `<div class="h-full overflow-auto"><table data-slot="table" aria-label="${esc(t.list)}" class="w-full caption-bottom text-body-sm"><thead class="border-b border-border"><tr>`;
        for (const [key, text] of cols) {
          const sorted = this.sortKey === key ? (this.sortDir === "asc" ? "ascending" : "descending") : "none";
          out += `<th scope="col" aria-sort="${sorted}" class="h-10 px-3 text-start text-label text-muted-foreground"><button type="button" data-act="sort" data-key="${key}" class="inline-flex items-center gap-1 rounded-sm ${FOCUS}">${esc(text)}${arrow(key)}</button></th>`;
        }
        out += "</tr></thead><tbody>";
        for (const r of rows) {
          const kind = kindMap.get(r.node.kind);
          const on = r.node.id === this.selectedId;
          out += `<tr data-node="${esc(r.node.id)}"${on ? ' data-state="selected"' : ""} class="cursor-pointer border-b border-border hover:bg-nq-hover${on ? " bg-nq-selected" : ""}">`;
          out += `<td class="px-3 py-2"><button type="button" aria-pressed="${on}" data-node="${esc(r.node.id)}" class="text-start text-label text-foreground ${FOCUS}">${esc(r.node.label)}</button></td>`;
          out += `<td class="px-3 py-2"><span class="inline-flex items-center gap-2"><span aria-hidden="true" class="size-2.5 rounded-full" style="background-color:${hueVar(kind?.hue)}"></span>${esc(kind?.label ?? r.node.kind)}</span></td>`;
          out += `<td class="px-3 py-2 tabular-nums"><bdi>${esc(this.n(r.links))}</bdi></td>`;
          out += `<td class="px-3 py-2 text-muted-foreground">${r.node.updatedAt !== undefined ? esc(this.date(r.node.updatedAt)) : ""}</td></tr>`;
        }
        return `${out}</tbody></table></div>`;
      },

      schemaHtml(this: Scope & Record<string, any>, v: ReturnType<typeof visible>): string {
        const t = this.t;
        const active = this.hover ?? this.selectedId;
        const activeNear = active ? around.get(active) : undefined;
        const columns = orderByNeighbours(schemaColumns(v.nodes, this.kinds.map((k: GraphKindConfig) => k.id)), v.links);
        let out = `<div data-role="schema-content" class="absolute top-0 w-max origin-top-left p-6" style="left:0;transform:translate(${tf.x}px, ${tf.y}px) scale(${tf.k})"><svg aria-hidden="true" data-role="schema-links" class="pointer-events-none absolute inset-0 z-0 size-full overflow-visible"></svg><div class="relative z-10 flex items-start gap-x-20">`;
        for (const col of columns) {
          const kind = kindMap.get(col.kind);
          out += `<section data-column="${esc(col.kind)}" aria-label="${esc(kind?.label ?? col.kind)}" class="flex w-56 shrink-0 flex-col gap-2.5"><header class="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2"><span aria-hidden="true" class="flex size-6 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-3.5" style="background-color:${hueVar(kind?.hue)}">${this.icon(kind?.icon, "size-3.5")}</span><h3 class="min-w-0 flex-1 truncate text-label text-foreground">${esc(kind?.label ?? col.kind)}</h3><span class="inline-flex items-center rounded-full border border-border px-2 text-caption text-muted-foreground"><bdi>${esc(this.n(col.nodes.length))}</bdi></span></header><ul class="flex flex-col gap-2.5">`;
          for (const n of col.nodes as GraphNodeConfig[]) {
            const on = n.id === this.selectedId;
            const faded = active !== null && n.id !== active && !activeNear?.has(n.id);
            out += `<li><button type="button" aria-pressed="${on}" data-node="${esc(n.id)}" style="${kind ? `border-inline-start-color:${hueVar(kind.hue)}` : ""}" class="${TOGGLE} border-s-4 px-3 py-2 ${on ? "border-primary bg-nq-selected" : "border-border"}${faded ? " opacity-40" : ""}"><span class="truncate text-label text-foreground">${esc(n.label)}</span>${
              n.description ? `<span class="line-clamp-2 text-caption text-muted-foreground">${esc(n.description)}</span>` : ""
            }<span class="text-caption text-muted-foreground"><bdi>${esc(t.connections(this.n(around.get(n.id)?.size ?? 0)))}</bdi></span></button></li>`;
          }
          out += "</ul></section>";
        }
        return `${out}</div></div>`;
      },
      schemaExtent(this: Scope & Record<string, any>) {
        const c = this.$root.querySelector<HTMLElement>('[data-role="schema-content"]');
        return { w: c?.offsetWidth ?? 0, h: c?.offsetHeight ?? 0 };
      },
      measureSchema(this: Scope & Record<string, any>, v: ReturnType<typeof visible>) {
        const c = this.$root.querySelector<HTMLElement>('[data-role="schema-content"]');
        const svg = this.$root.querySelector<SVGSVGElement>('[data-role="schema-links"]');
        if (!c || !svg) return;
        const origin = c.getBoundingClientRect();
        const k = tf.k || 1;
        const boxes = new Map<string, SchemaBox>();
        for (const el of c.querySelectorAll<HTMLElement>("[data-node]")) {
          const r = el.getBoundingClientRect();
          const id = el.dataset.node;
          if (id) boxes.set(id, { x: (r.left - origin.left) / k, y: (r.top - origin.top) / k, w: r.width / k, h: r.height / k });
        }
        const ext = { w: c.offsetWidth, h: c.offsetHeight };
        svg.setAttribute("width", String(ext.w));
        svg.setAttribute("height", String(ext.h));
        const active = this.hover ?? this.selectedId;
        const side = this.rtl ? "left" : "right";
        let out = "";
        for (const l of v.links as GraphLinkConfig[]) {
          const a = boxes.get(l.source);
          const b = boxes.get(l.target);
          if (!a || !b) continue;
          const lk = l.kind ? linkKindMap.get(l.kind) : undefined;
          const hot = active !== null && (l.source === active || l.target === active);
          const conn = schemaConnector(a, b, side);
          const arrow = config.arrows === true || lk?.arrow === true;
          const colour = !hot && lk?.hue ? hueVar(lk.hue) : undefined;
          const dash = dashFor(lk?.style);
          out += `<g${lk ? ` data-link-kind="${esc(lk.id)}"` : ""}${hot ? ' data-hot="true"' : ""} class="transition-opacity${active && !hot ? " opacity-15" : ""}"><path d="${conn.d}" fill="none" stroke-width="${hot ? 2 : 1.25}"${dash ? ` stroke-dasharray="${dash}"` : ""}${colour ? ` style="stroke:${colour}"` : ""} class="${colour ? "" : hot ? "stroke-nq-brand" : "stroke-nq-line-strong"}">${
            lk?.style === "flow" ? '<animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" />' : ""
          }</path>${arrow ? `<polygon points="${arrowPoints(conn.end, conn.angle)}"${colour ? ` style="fill:${colour}"` : ""} class="${colour ? "" : hot ? "fill-nq-brand" : "fill-nq-line-strong"}" />` : ""}${
            hot && l.label ? `<text x="${conn.mid.x}" y="${conn.mid.y - 4}" text-anchor="middle" font-size="11" class="fill-muted-foreground" style="${STROKED}">${esc(l.label)}</text>` : ""
          }</g>`;
        }
        svg.innerHTML = out;
        if (!userMoved && ext.w > 0 && size.w > 0) {
          tf = schemaFit(ext, size, this.rtl, { height: false });
          this.applyViewport();
        }
      },

      inspectorHtml(this: Scope & Record<string, any>): string {
        const node: GraphNodeConfig | undefined = this.node;
        if (!node) return "";
        const t = this.t;
        const kind = kindMap.get(node.kind);
        const out: string[] = [];
        out.push(`<div class="flex items-start gap-3 border-b border-border px-4 py-3"><span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-4" style="background-color:${hueVar(kind?.hue)}">${this.icon(node.icon ?? kind?.icon)}</span><div class="min-w-0 flex-1"><h2 class="text-label text-foreground">${esc(node.label)}</h2><p class="text-caption text-muted-foreground">${esc(kind?.label ?? node.kind)}</p></div><button type="button" data-act="close" aria-label="${esc(t.close)}" title="${esc(t.close)}" class="inline-flex size-8 items-center justify-center rounded-control text-muted-foreground hover:bg-nq-hover ${FOCUS}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>`);
        out.push('<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">');
        if (node.description) out.push(`<p class="text-body-sm text-foreground">${esc(node.description)}</p>`);
        if (node.tags?.length) out.push(`<section class="flex flex-col gap-1.5"><h3 class="eyebrow">${esc(t.tags)}</h3><div class="flex flex-wrap gap-1.5">${node.tags.map((g) => `<span data-slot="badge" class="inline-flex items-center rounded-full border border-border px-2 text-caption text-muted-foreground">${esc(g)}</span>`).join("")}</div></section>`);
        if (node.updatedAt !== undefined) out.push(`<p class="text-caption text-muted-foreground">${esc(t.updated)} ${esc(this.date(node.updatedAt))}</p>`);
        const outgoing = (this.links as GraphLinkConfig[]).filter((l) => l.source === node.id && byId.has(l.target));
        const incoming = (this.links as GraphLinkConfig[]).filter((l) => l.target === node.id && byId.has(l.source));
        const groups: [string, { id: string; label: string | undefined }[]][] = [
          [t.linksTo, outgoing.map((l) => ({ id: l.target, label: l.label }))],
          [t.linkedFrom, incoming.map((l) => ({ id: l.source, label: l.label }))],
        ];
        for (const [title, items] of groups) {
          if (!items.length) continue;
          out.push(`<section class="flex flex-col gap-1"><h3 class="eyebrow">${esc(title)}</h3><ul class="flex flex-col">`);
          for (const it of items) {
            const other = byId.get(it.id) as GraphNodeConfig;
            out.push(`<li><button type="button" data-act="goto" data-id="${esc(it.id)}" class="flex w-full items-center gap-2 rounded-control px-1.5 py-1.5 text-start hover:bg-nq-hover ${FOCUS}"><span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" style="background-color:${hueVar(kindMap.get(other.kind)?.hue)}"></span><span class="min-w-0 flex-1 truncate text-body-sm text-foreground">${esc(other.label)}</span>${it.label ? `<span class="shrink-0 text-caption text-muted-foreground">${esc(it.label)}</span>` : ""}</button></li>`);
          }
          out.push("</ul></section>");
        }
        if (outgoing.length + incoming.length === 0) out.push(`<p class="text-body-sm text-muted-foreground">${esc(t.noLinks)}</p>`);
        out.push("</div>");
        if (config.openable) out.push(`<div class="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3"><button type="button" data-act="open" class="inline-flex h-control items-center gap-2 rounded-control bg-primary px-3 text-label text-primary-foreground ${FOCUS}">${esc(t.open)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-4 rtl:-scale-x-100"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></button></div>`);
        return out.join("");
      },
    } satisfies ThisType<Scope>;
  });
};
