"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Columns3, ExternalLink, LayoutGrid, List, Maximize2, Minus, Network, Plus, Search, X } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge, type TagHue } from "../badge";
import { Button } from "../button";
import { Input } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { adjacency, boundsOf, filterNodes, fitTransform, forceLayout, linksAmong, type ListSortKey, nodeRadius, type Point, pinchTransform, sortRows, toGraphPoint, type Transform, zoomAbout } from "./graph-layout";
import { orderByNeighbours, type SchemaBox, schemaColumns, schemaConnector, schemaFit } from "./graph-schema";
import { arrowPoints, dashFor, type GraphLinkStyle, type GraphNodeShape, linkEnds, shapeExtent, shapePath } from "./graph-shapes";
import { createSimulation, type SimInput } from "./graph-sim";

export type GraphViewMode = "graph" | "grid" | "list" | "schema";
/** Where a node's label sits. The graph surface is left-to-right, so "right" is always on the physical right. */
export type GraphLabelPosition = "bottom" | "right" | "inside" | "none";

export interface GraphViewNode {
  id: string;
  label: string;
  /** Matches a `GraphViewKind` id. */
  kind: string;
  description?: string;
  tags?: string[];
  updatedAt?: Date | number | string;
  /** Overrides the shape of the node's kind. */
  shape?: GraphNodeShape;
  /** How important the node is. Sets its size instead of its number of links. */
  weight?: number;
  /** Overrides the icon of the node's kind. */
  icon?: LucideIcon;
  /** Overrides where the label goes for this node. */
  labelPosition?: GraphLabelPosition;
}

export interface GraphViewLink {
  source: string;
  target: string;
  /** How the source relates to the target ("part of", "cites"). */
  label?: string;
  /** Matches a `GraphViewLinkKind` id, for the line style. */
  kind?: string;
}

export interface GraphViewKind {
  id: string;
  label: string;
  /** Categorical colour. Kinds are also told apart by name in the legend, cards and list. */
  hue: TagHue;
  /** One line on what this kind holds, shown in the kinds filter. */
  description?: string;
  icon?: LucideIcon;
  /** The shape of this kind's nodes in the graph. Default `"circle"`. */
  shape?: GraphNodeShape;
  labelPosition?: GraphLabelPosition;
}

/** How one kind of relation is drawn. */
export interface GraphViewLinkKind {
  id: string;
  label?: string;
  /** `"flow"` is dashes moving from source to target (still under reduced motion). Default `"solid"`. */
  style?: GraphLinkStyle;
  /** Draw an arrowhead at the target. */
  arrow?: boolean;
  /** Colour of the line. Default the neutral line colour. */
  hue?: TagHue;
}

/** What `renderNode` receives to draw one node. Drawn inside an SVG group centred on the node. */
export interface GraphNodeRenderContext {
  node: GraphViewNode;
  kind: GraphViewKind | undefined;
  shape: GraphNodeShape;
  /** Size (radius) from links or `weight`. */
  radius: number;
  selected: boolean;
  /** Hovered, focused or next to the hovered node. */
  highlighted: boolean;
  /** Faded because something else is focused. */
  dimmed: boolean;
  pinned: boolean;
}

export interface GraphViewLabels {
  search: string;
  view: string;
  graph: string;
  grid: string;
  list: string;
  schema: string;
  kinds: string;
  allKinds: string;
  counts: (nodes: string, links: string) => string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  graphHint: string;
  schemaHint: string;
  pinned: string;
  inspector: string;
  close: string;
  open: string;
  linksTo: string;
  linkedFrom: string;
  noLinks: string;
  updated: string;
  tags: string;
  connections: (n: string) => string;
  colName: string;
  colKind: string;
  colLinks: string;
  colUpdated: string;
  emptyTitle: string;
  emptyBody: string;
  clear: string;
}

const STRINGS: { en: GraphViewLabels; ar: GraphViewLabels } = {
  en: {
    search: "Search the graph",
    view: "View",
    graph: "Graph",
    grid: "Grid",
    list: "List",
    schema: "Schema",
    kinds: "Filter by type",
    allKinds: "All types",
    counts: (n, l) => `${n} items, ${l} links`,
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit to view",
    graphHint: "Drag a node to pin it, double-click to release it. Drag the background to pan, scroll to zoom.",
    schemaHint: "Hover a card to trace its links. Drag to pan, scroll to zoom.",
    pinned: "pinned",
    inspector: "Details",
    close: "Close",
    open: "Open",
    linksTo: "Links to",
    linkedFrom: "Linked from",
    noLinks: "Not connected to anything yet.",
    updated: "Updated",
    tags: "Tags",
    connections: (n) => `${n} links`,
    colName: "Name",
    colKind: "Type",
    colLinks: "Links",
    colUpdated: "Updated",
    emptyTitle: "Nothing matches",
    emptyBody: "Try a different search or clear the type filter.",
    clear: "Clear filters",
  },
  ar: {
    search: "ابحث في الرسم",
    view: "العرض",
    graph: "رسم",
    grid: "شبكة",
    list: "قائمة",
    schema: "مخطط",
    kinds: "تصفية حسب النوع",
    allKinds: "كل الأنواع",
    counts: (n, l) => `${n} عنصرًا، ${l} روابط`,
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    fit: "ملاءمة العرض",
    graphHint: "اسحب عقدة لتثبيتها وانقر مرتين لتحريرها. اسحب الخلفية للتحريك ومرّر للتكبير.",
    schemaHint: "مرّر فوق بطاقة لتتبّع روابطها. اسحب للتحريك، ومرّر للتكبير.",
    pinned: "مثبّتة",
    inspector: "التفاصيل",
    close: "إغلاق",
    open: "فتح",
    linksTo: "يرتبط بـ",
    linkedFrom: "مرتبط من",
    noLinks: "غير مرتبط بشيء بعد.",
    updated: "آخر تحديث",
    tags: "الوسوم",
    connections: (n) => `${n} روابط`,
    colName: "الاسم",
    colKind: "النوع",
    colLinks: "الروابط",
    colUpdated: "آخر تحديث",
    emptyTitle: "لا نتائج مطابقة",
    emptyBody: "جرّب بحثًا آخر أو امسح تصفية النوع.",
    clear: "مسح التصفية",
  },
};

export interface GraphViewProps {
  nodes: GraphViewNode[];
  links: GraphViewLink[];
  kinds: GraphViewKind[];
  /** How link kinds (`link.kind`) are drawn: solid, dashed or flowing, with an arrowhead. */
  linkKinds?: GraphViewLinkKind[];
  mode?: GraphViewMode;
  defaultMode?: GraphViewMode;
  onModeChange?: (mode: GraphViewMode) => void;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Adds an "Open" button to the inspector. */
  onOpen?: (node: GraphViewNode) => void;
  /** Extra actions in the inspector (Edit, Archive). */
  renderActions?: (node: GraphViewNode) => ReactNode;
  /** Draws a node yourself, in place of its shape, icon and label. */
  renderNode?: (context: GraphNodeRenderContext) => ReactNode;
  /** Live force simulation: nodes settle on load and move when dragged. Default `true`. Always off under `prefers-reduced-motion`. */
  animate?: boolean;
  /** Default label position for every node. Default `"bottom"`. */
  labelPosition?: GraphLabelPosition;
  /** Arrowheads on every link, not just the link kinds that ask for them. */
  arrows?: boolean;
  /** Called with the ids of the pinned nodes after a drag or an unpin. */
  onPinnedChange?: (ids: string[]) => void;
  /** Extra controls at the end of the toolbar. */
  toolbarEnd?: ReactNode;
  /** Height of the whole view. Default `100%`, minimum 420px. */
  height?: number | string;
  labels?: Partial<GraphViewLabels>;
  className?: string;
}

const hueVar = (hue: TagHue) => `var(--nq-tag-${hue})`;

function useControlled<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  return [controlled ? value : inner, (v: T) => (controlled ? undefined : setInner(v), onChange?.(v))];
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia(REDUCED);
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * One knowledge graph, four ways to look at it: a live force-directed graph you can drag, pan and zoom, a grid
 * of cards, a sortable list, and a schema of columns (one per type) with connectors between related cards.
 * Search and type filters apply to all of them, the selection follows you from one to the next, and an
 * inspector shows the selected node with everything it links to.
 */
export function GraphView({
  nodes,
  links,
  kinds,
  linkKinds,
  mode,
  defaultMode = "graph",
  onModeChange,
  selectedId,
  defaultSelectedId = null,
  onSelectedChange,
  onOpen,
  renderActions,
  renderNode,
  animate = true,
  labelPosition = "bottom",
  arrows = false,
  onPinnedChange,
  toolbarEnd,
  height = "100%",
  labels,
  className,
}: GraphViewProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as GraphViewLabels;
  const num = (n: number) => formatNumber(n, locale);
  const [view, setView] = useControlled<GraphViewMode>(mode, defaultMode, onModeChange);
  const [selected, setSelected] = useControlled<string | null>(selectedId, defaultSelectedId, onSelectedChange);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const kindById = useMemo(() => new Map(kinds.map((k) => [k.id, k])), [kinds]);
  const linkKindById = useMemo(() => new Map((linkKinds ?? []).map((k) => [k.id, k])), [linkKinds]);
  const shownNodes = useMemo(() => filterNodes(nodes, { query, kinds: picked }), [nodes, query, picked]);
  const ids = useMemo(() => new Set(shownNodes.map((n) => n.id)), [shownNodes]);
  const shownLinks = useMemo(() => linksAmong(links, ids), [links, ids]);
  const around = useMemo(() => adjacency(links), [links]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const node = selected ? byId.get(selected) : undefined;
  const filtered = query.trim() !== "" || picked.length > 0;
  const kindOf = (id: string) => kindById.get(id);
  const linkKindOf = (id: string | undefined) => (id === undefined ? undefined : linkKindById.get(id));

  return (
    <div data-slot="graph-view" data-mode={view} style={{ height, minHeight: 420 }} className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="relative min-w-40 flex-1 sm:max-w-72">
          <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-8" type="search" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="secondary" size="sm" aria-label={t.kinds} />}>
            {picked.length === 1 && kindById.get(picked[0] ?? "") ? (
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: hueVar(kindById.get(picked[0] ?? "")!.hue) }} />
            ) : null}
            {picked.length === 0 ? t.allKinds : picked.length === 1 ? (kindById.get(picked[0] ?? "")?.label ?? t.kinds) : `${t.kinds} · ${num(picked.length)}`}
            <ChevronDown aria-hidden className="opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 min-w-64 overflow-y-auto">
            <DropdownMenuItem disabled={picked.length === 0} onClick={() => setPicked([])}>
              {t.allKinds}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {kinds.map((k) => {
              const Icon = k.icon;
              const count = nodes.filter((n) => n.kind === k.id).length;
              return (
                <DropdownMenuCheckboxItem
                  key={k.id}
                  checked={picked.includes(k.id)}
                  onCheckedChange={(on) => setPicked((p) => (on ? [...p, k.id] : p.filter((x) => x !== k.id)))}
                  closeOnClick={false}
                >
                  <span className="flex min-w-0 flex-1 items-start gap-2">
                    {Icon ? <Icon aria-hidden className="mt-0.5 size-4 shrink-0" style={{ color: hueVar(k.hue) }} /> : <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: hueVar(k.hue) }} />}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{k.label}</span>
                      {k.description ? <span className="text-caption text-muted-foreground">{k.description}</span> : null}
                    </span>
                    <span className="ms-auto ps-2 text-caption text-muted-foreground tabular-nums">{num(count)}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ms-auto flex items-center gap-2">
          <span className="hidden text-caption text-muted-foreground sm:inline">
            <bdi>{t.counts(num(shownNodes.length), num(shownLinks.length))}</bdi>
          </span>
          <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0] as GraphViewMode)} aria-label={t.view}>
            <Toggle value="graph" aria-label={t.graph} title={t.graph}>
              <Network aria-hidden />
              <span className="hidden md:inline">{t.graph}</span>
            </Toggle>
            <Toggle value="schema" aria-label={t.schema} title={t.schema}>
              <Columns3 aria-hidden />
              <span className="hidden md:inline">{t.schema}</span>
            </Toggle>
            <Toggle value="grid" aria-label={t.grid} title={t.grid}>
              <LayoutGrid aria-hidden />
              <span className="hidden md:inline">{t.grid}</span>
            </Toggle>
            <Toggle value="list" aria-label={t.list} title={t.list}>
              <List aria-hidden />
              <span className="hidden md:inline">{t.list}</span>
            </Toggle>
          </ToggleGroup>
          {toolbarEnd}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {shownNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title={t.emptyTitle}
                description={t.emptyBody}
                actions={
                  filtered ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery("");
                        setPicked([]);
                      }}
                    >
                      {t.clear}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : view === "graph" ? (
            <GraphCanvas nodes={shownNodes} links={shownLinks} around={around} kindOf={kindOf} linkKindOf={linkKindOf} selected={selected} onSelect={setSelected} t={t} animate={animate} labelPosition={labelPosition} arrows={arrows} renderNode={renderNode} onPinnedChange={onPinnedChange} />
          ) : view === "schema" ? (
            <SchemaMode nodes={shownNodes} links={shownLinks} kinds={kinds} around={around} kindOf={kindOf} linkKindOf={linkKindOf} arrows={arrows} selected={selected} onSelect={setSelected} t={t} num={num} ar={ar} />
          ) : view === "grid" ? (
            <GridMode nodes={shownNodes} around={around} kindOf={kindOf} selected={selected} onSelect={setSelected} t={t} num={num} />
          ) : (
            <ListMode nodes={shownNodes} around={around} kindOf={kindOf} selected={selected} onSelect={setSelected} t={t} num={num} locale={locale} />
          )}
        </div>
        {node ? (
          <aside data-slot="graph-inspector" aria-label={t.inspector} className="absolute inset-0 z-10 flex flex-col border-s border-border bg-card md:static md:inset-auto md:w-80 md:shrink-0">
            <Inspector node={node} kind={kindOf(node.kind)} links={links} byId={byId} kindOf={kindOf} onSelect={setSelected} onClose={() => setSelected(null)} onOpen={onOpen} actions={renderActions?.(node)} t={t} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

interface ModeProps {
  nodes: GraphViewNode[];
  around: Map<string, Set<string>>;
  kindOf: (id: string) => GraphViewKind | undefined;
  selected: string | null;
  onSelect: (id: string | null) => void;
  t: GraphViewLabels;
}

function ZoomButtons({ t, onZoom, onFit }: { t: GraphViewLabels; onZoom: (factor: number) => void; onFit: () => void }) {
  return (
    <div className="absolute start-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" aria-label={t.zoomIn}>
      <Button variant="ghost" size="icon-sm" className="rounded-none" aria-label={t.zoomIn} title={t.zoomIn} onClick={() => onZoom(1.3)}>
        <Plus aria-hidden />
      </Button>
      <Button variant="ghost" size="icon-sm" className="rounded-none border-t border-border" aria-label={t.zoomOut} title={t.zoomOut} onClick={() => onZoom(1 / 1.3)}>
        <Minus aria-hidden />
      </Button>
      <Button variant="ghost" size="icon-sm" className="rounded-none border-t border-border" aria-label={t.fit} title={t.fit} onClick={onFit}>
        <Maximize2 aria-hidden />
      </Button>
    </div>
  );
}

/** Wheel zoom (and trackpad pinch) on an element, about the pointer. `pan` makes a plain wheel scroll the surface instead of zooming. */
function useWheel(ref: RefObject<HTMLElement | null>, apply: (fn: (tf: Transform) => Transform) => void, pan: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (pan && !e.ctrlKey && !e.metaKey) {
        apply((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
        return;
      }
      const c = { x: e.clientX - r.left, y: e.clientY - r.top };
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      apply((p) => zoomAbout(p, factor, c));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, apply, pan]);
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/* ------------------------------------------------------------------ graph */

interface Look {
  shape: GraphNodeShape;
  r: number;
  label: GraphLabelPosition;
  icon: LucideIcon | undefined;
}

const stroked = { paintOrder: "stroke", stroke: "var(--nq-bg)", strokeWidth: 3 } as CSSProperties;

function GraphCanvas({
  nodes,
  links,
  around,
  kindOf,
  linkKindOf,
  selected,
  onSelect,
  t,
  animate,
  labelPosition,
  arrows,
  renderNode,
  onPinnedChange,
}: ModeProps & {
  links: GraphViewLink[];
  linkKindOf: (id: string | undefined) => GraphViewLinkKind | undefined;
  animate: boolean;
  labelPosition: GraphLabelPosition;
  arrows: boolean;
  renderNode: GraphViewProps["renderNode"];
  onPinnedChange: GraphViewProps["onPinnedChange"];
}) {
  const box = useRef<HTMLDivElement>(null);
  const size = useSize(box);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const tfRef = useRef(tf);
  tfRef.current = tf;
  const userMoved = useRef(false);
  const [hover, setHover] = useState<string | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const reduced = useReducedMotion();
  const live = animate && !reduced;
  const liveRef = useRef(live);
  liveRef.current = live;

  const looks = useMemo(() => {
    const map = new Map<string, Look>();
    for (const n of nodes) {
      const kind = kindOf(n.kind);
      map.set(n.id, { shape: n.shape ?? kind?.shape ?? "circle", r: nodeRadius(around.get(n.id)?.size ?? 0, n.weight), label: n.labelPosition ?? kind?.labelPosition ?? labelPosition, icon: n.icon ?? kind?.icon });
    }
    return map;
  }, [nodes, around, kindOf, labelPosition]);
  const inputs = useMemo<SimInput[]>(
    () =>
      nodes.map((n) => {
        const look = looks.get(n.id) as Look;
        const e = shapeExtent(look.shape, look.r);
        return { id: n.id, r: Math.max(e.hw, e.hh) };
      }),
    [nodes, looks],
  );
  // The deterministic layout: what reduced motion (and the server) show.
  const still = useMemo(() => forceLayout(nodes.map((n) => ({ id: n.id })), links, { iterations: nodes.length > 250 ? 120 : 260 }), [nodes, links]);
  const [sim] = useState(() => createSimulation(inputs, links));

  const positions = (): Map<string, Point> => {
    if (live) return sim.positions();
    const map = new Map(still);
    for (const p of sim.nodes) if (p.fx !== null && p.fy !== null) map.set(p.id, { x: p.fx, y: p.fy });
    return map;
  };
  const pos = positions();
  const at = (id: string): Point => pos.get(id) ?? { x: 0, y: 0 };

  /* the loop: one tick per frame, paused while the tab is hidden or the graph is off-screen, stopped once settled */
  const raf = useRef(0);
  const gate = useRef({ visible: true, onscreen: true });
  const loop = useRef<() => void>(() => undefined);
  const kick = useCallback(() => {
    if (raf.current || !liveRef.current || !gate.current.visible || !gate.current.onscreen) return;
    raf.current = requestAnimationFrame(() => loop.current());
  }, []);
  loop.current = () => {
    raf.current = 0;
    if (!liveRef.current || !gate.current.visible || !gate.current.onscreen) return;
    const moving = sim.tick();
    const s = sizeRef.current;
    if (!userMoved.current && s.w > 0) {
      const b = boundsOf(sim.positions().values(), 48);
      if (b) {
        const target = fitTransform(b, s.w, s.h);
        setTf((p) => (moving ? { x: p.x + (target.x - p.x) * 0.12, y: p.y + (target.y - p.y) * 0.12, k: p.k + (target.k - p.k) * 0.12 } : target));
      }
    }
    bump();
    if (moving) kick();
  };
  useEffect(() => {
    const el = box.current;
    if (!el || !live) return;
    const sync = () => {
      if (gate.current.visible && gate.current.onscreen) kick();
      else {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
      }
    };
    const onVisibility = () => {
      gate.current.visible = document.visibilityState !== "hidden";
      sync();
    };
    gate.current.visible = document.visibilityState !== "hidden";
    document.addEventListener("visibilitychange", onVisibility);
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        gate.current.onscreen = entries[entries.length - 1]?.isIntersecting ?? true;
        sync();
      });
      io.observe(el);
    }
    kick();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [live, kick]);

  // New data (a filter, an edit): keep what stays, reheat, and start the loop again.
  const first = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sim and kick are stable
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!live) sim.cool();
      return;
    }
    sim.update(inputs, links);
    if (live) kick();
    else sim.cool();
    bump();
  }, [inputs, links]);

  const fitNow = useCallback(() => {
    const s = sizeRef.current;
    const b = boundsOf(positions().values(), 48);
    if (b && s.w > 0) setTf(fitTransform(b, s.w, s.h));
  }, [still, live]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when the size or the still layout changes
  useEffect(() => {
    if (!userMoved.current) fitNow();
  }, [size.w, size.h, still, live]);

  const applyTf = useCallback((fn: (p: Transform) => Transform) => {
    userMoved.current = true;
    setTf(fn);
  }, []);
  useWheel(box, applyTf, false);

  /* pointer gestures: drag a node, pan the background, pinch with two fingers */
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<
    | { kind: "node"; id: string; pointer: number; sx: number; sy: number; moved: boolean }
    | { kind: "pan"; pointer: number; sx: number; sy: number; ox: number; oy: number; moved: boolean }
    | { kind: "pinch"; start: Transform; a: Point; b: Point }
    | null
  >(null);
  const handled = useRef(0);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = (box.current as HTMLDivElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pinned = () => sim.nodes.filter((n) => n.fx !== null).map((n) => n.id);
  const unpin = (id: string) => {
    if (!sim.isPinned(id)) return;
    sim.unpin(id);
    if (live) {
      sim.reheat(0.3);
      kick();
    }
    bump();
    onPinnedChange?.(pinned());
  };
  const toggle = (id: string) => onSelect(id === selected ? null : id);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest("button")) return;
    pointers.current.set(e.pointerId, local(e));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point];
      userMoved.current = true;
      gesture.current = { kind: "pinch", start: tfRef.current, a, b };
      return;
    }
    const id = (e.target as Element).closest("[data-node]")?.getAttribute("data-node");
    gesture.current = id
      ? { kind: "node", id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false }
      : { kind: "pan", pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: tfRef.current.x, oy: tfRef.current.y, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) setTf(pinchTransform(g.start, { a: g.a, b: g.b }, { a: pts[0] as Point, b: pts[1] as Point }));
      return;
    }
    if (g.pointer !== e.pointerId) return;
    if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) < 4) return;
    g.moved = true;
    if (g.kind === "pan") {
      userMoved.current = true;
      setTf((p) => ({ ...p, x: g.ox + e.clientX - g.sx, y: g.oy + e.clientY - g.sy }));
      return;
    }
    const p = toGraphPoint(local(e), tfRef.current);
    sim.pin(g.id, p.x, p.y, live);
    if (live) {
      sim.reheat(0.35);
      kick();
    }
    bump();
  };
  const finish = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === "pinch") {
      if (pointers.current.size < 2) gesture.current = null;
      return;
    }
    if (!g || g.pointer !== e.pointerId) return;
    gesture.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    if (g.kind === "node") {
      if (g.moved) {
        sim.drop();
        if (live) kick();
        handled.current = Date.now();
        onPinnedChange?.(pinned());
        bump();
      } else if (!cancelled) {
        handled.current = Date.now();
        const prev = lastTap.current;
        if (prev && prev.id === g.id && Date.now() - prev.at < 400) {
          lastTap.current = null;
          unpin(g.id);
        } else {
          lastTap.current = { id: g.id, at: Date.now() };
          toggle(g.id);
        }
      }
    } else if (!g.moved && !cancelled) {
      onSelect(null);
    }
  };

  const nudge = (id: string, dx: number, dy: number) => {
    const p = at(id);
    sim.pin(id, p.x + dx, p.y + dy);
    if (live) {
      sim.reheat(0.3);
      kick();
    }
    bump();
    onPinnedChange?.(pinned());
  };

  const focus = hover ?? selected;
  const near = focus ? (around.get(focus) ?? new Set<string>()) : null;
  const motion = live;

  return (
    <div
      ref={box}
      data-slot="graph-canvas"
      data-live={live ? "true" : "false"}
      data-settled={sim.settled ? "true" : "false"}
      dir="ltr"
      className="relative h-full min-h-72 touch-none select-none overflow-hidden bg-[radial-gradient(var(--nq-line)_1px,transparent_1px)] [background-size:20px_20px]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
    >
      <svg width={size.w} height={size.h} role="group" aria-label={t.graph} className="block">
        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
          {links.map((l, i) => {
            const la = looks.get(l.source);
            const lb = looks.get(l.target);
            if (!la || !lb) return null;
            const a = at(l.source);
            const b = at(l.target);
            const lk = linkKindOf(l.kind);
            const hot = focus !== null && (l.source === focus || l.target === focus);
            const ends = linkEnds(a, la.shape, la.r, b, lb.shape, lb.r);
            const arrow = arrows || lk?.arrow === true;
            const lineEnd = arrow ? { x: ends.b.x - Math.cos(ends.angle) * 6, y: ends.b.y - Math.sin(ends.angle) * 6 } : ends.b;
            const colour = hot ? undefined : lk?.hue ? hueVar(lk.hue) : undefined;
            const dash = dashFor(lk?.style);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: links have no id
              <g key={i} data-link-kind={lk?.id} className={cn("transition-opacity", focus && !hot && "opacity-20")}>
                <line x1={ends.a.x} y1={ends.a.y} x2={lineEnd.x} y2={lineEnd.y} strokeWidth={hot ? 2 : 1.25} strokeDasharray={dash} style={colour ? { stroke: colour } : undefined} className={colour ? undefined : hot ? "stroke-nq-brand" : "stroke-nq-line-strong"}>
                  {lk?.style === "flow" && motion ? <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" /> : null}
                </line>
                {arrow ? <polygon points={arrowPoints(ends.b, ends.angle)} style={colour ? { fill: colour } : undefined} className={colour ? undefined : hot ? "fill-nq-brand" : "fill-nq-line-strong"} /> : null}
                {hot && l.label ? (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={stroked}>
                    {l.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = at(n.id);
            const kind = kindOf(n.kind);
            const look = looks.get(n.id) as Look;
            const { r, shape } = look;
            const ext = shapeExtent(shape, r);
            const dim = focus !== null && n.id !== focus && !near?.has(n.id);
            const on = n.id === selected;
            const pin = sim.isPinned(n.id);
            const showLabel = look.label !== "none" && (tf.k >= 0.55 || !dim || on);
            const Icon = look.icon;
            const fill = kind ? hueVar(kind.hue) : "var(--nq-line-strong)";
            const name = kind ? `${n.label}, ${kind.label}` : n.label;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                role="button"
                tabIndex={0}
                aria-label={pin ? `${name}, ${t.pinned}` : name}
                aria-pressed={on}
                data-node={n.id}
                data-pinned={pin ? "true" : undefined}
                data-shape={shape}
                className={cn("cursor-grab outline-none transition-opacity active:cursor-grabbing", dim && "opacity-25")}
                onClick={() => {
                  // Assistive tech and keyboards click without a pointer; real clicks are handled on pointer up.
                  if (Date.now() - handled.current > 400) toggle(n.id);
                }}
                onDoubleClick={() => unpin(n.id)}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 48 : 12;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(n.id);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    nudge(n.id, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
                  } else if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    unpin(n.id);
                  }
                }}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
              >
                {renderNode ? (
                  renderNode({ node: n, kind, shape, radius: r, selected: on, highlighted: focus !== null && !dim, dimmed: dim, pinned: pin })
                ) : (
                  <>
                    {on ? <path d={shapePath(shape, r + 5)} fill="none" strokeWidth={2} className="stroke-nq-focus" /> : null}
                    <path d={shapePath(shape, r)} strokeWidth={2} className="stroke-background" style={{ fill }} />
                    {Icon && r >= 9 ? <Icon aria-hidden x={-r * 0.55} y={-r * 0.55} width={r * 1.1} height={r * 1.1} strokeWidth={2.2} className="pointer-events-none text-white" /> : null}
                    {pin ? <circle cx={ext.hw * 0.75} cy={-ext.hh * 0.75} r={3.5} strokeWidth={1.5} className="fill-nq-brand stroke-background" /> : null}
                    {showLabel && look.label === "bottom" ? (
                      <text y={ext.hh + 13} textAnchor="middle" fontSize={11} className="pointer-events-none fill-foreground" style={stroked}>
                        {n.label}
                      </text>
                    ) : null}
                    {showLabel && look.label === "right" ? (
                      <text x={ext.hw + 6} y={4} textAnchor="start" fontSize={11} className="pointer-events-none fill-foreground" style={stroked}>
                        {n.label}
                      </text>
                    ) : null}
                    {look.label === "inside" ? (
                      <text y={4} textAnchor="middle" fontSize={10} className="pointer-events-none fill-white">
                        {fitText(n.label, Math.floor((ext.hw * 2 - 8) / 5.6))}
                      </text>
                    ) : null}
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <ZoomButtons
        t={t}
        onZoom={(factor) => applyTf((p) => zoomAbout(p, factor, { x: size.w / 2, y: size.h / 2 }))}
        onFit={() => {
          userMoved.current = false;
          fitNow();
        }}
      />
      <p className="pointer-events-none absolute end-3 bottom-3 hidden max-w-72 text-end text-caption text-muted-foreground md:block">{t.graphHint}</p>
    </div>
  );
}

/** Cuts a label to `max` characters with an ellipsis. */
function fitText(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= Math.max(1, max) ? text : `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}

/* ------------------------------------------------------------------ schema */

function SchemaMode({
  nodes,
  links,
  kinds,
  around,
  kindOf,
  linkKindOf,
  arrows,
  selected,
  onSelect,
  t,
  num,
  ar,
}: ModeProps & { links: GraphViewLink[]; kinds: GraphViewKind[]; linkKindOf: (id: string | undefined) => GraphViewLinkKind | undefined; arrows: boolean; num: (n: number) => string; ar: boolean }) {
  const view = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const size = useSize(view);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const tfRef = useRef(tf);
  tfRef.current = tf;
  const userMoved = useRef(false);
  const [boxes, setBoxes] = useState<Map<string, SchemaBox>>(new Map());
  const [extent, setExtent] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<string | null>(null);

  const columns = useMemo(() => orderByNeighbours(schemaColumns(nodes, kinds.map((k) => k.id)), links), [nodes, kinds, links]);

  const measure = useCallback(() => {
    const c = content.current;
    if (!c) return;
    const origin = c.getBoundingClientRect();
    const k = tfRef.current.k || 1;
    const next = new Map<string, SchemaBox>();
    for (const el of c.querySelectorAll<HTMLElement>("[data-node]")) {
      const r = el.getBoundingClientRect();
      const id = el.dataset.node;
      if (id) next.set(id, { x: (r.left - origin.left) / k, y: (r.top - origin.top) / k, w: r.width / k, h: r.height / k });
    }
    setBoxes(next);
    setExtent({ w: c.offsetWidth, h: c.offsetHeight });
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: measure again whenever the cards change
  useLayoutEffect(() => {
    measure();
  }, [measure, columns, ar]);
  useEffect(() => {
    const c = content.current;
    if (!c) return;
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [measure]);

  const fit = useCallback((height: boolean) => setTf(schemaFit(extent, size, ar, { height })), [extent, size, ar]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: fit once measured, until the user moves it
  useEffect(() => {
    if (!userMoved.current && extent.w > 0 && size.w > 0) fit(false);
  }, [extent.w, extent.h, size.w, size.h, ar]);

  const applyTf = useCallback((fn: (p: Transform) => Transform) => {
    userMoved.current = true;
    setTf(fn);
  }, []);
  useWheel(view, applyTf, false);

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ kind: "pan"; pointer: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | { kind: "pinch"; start: Transform; a: Point; b: Point } | null>(null);
  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = (view.current as HTMLDivElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const active = hover ?? selected;
  const activeNear = active ? (around.get(active) ?? new Set<string>()) : null;
  const side = ar ? "left" : "right";

  return (
    <div
      ref={view}
      data-slot="graph-schema"
      className="relative h-full min-h-72 touch-none select-none overflow-hidden bg-[radial-gradient(var(--nq-line)_1px,transparent_1px)] [background-size:20px_20px]"
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target as Element).closest("button")) return;
        pointers.current.set(e.pointerId, local(e));
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointers cannot be captured */
        }
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()] as [Point, Point];
          userMoved.current = true;
          gesture.current = { kind: "pinch", start: tfRef.current, a, b };
        } else {
          gesture.current = { kind: "pan", pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: tfRef.current.x, oy: tfRef.current.y, moved: false };
        }
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, local(e));
        const g = gesture.current;
        if (!g) return;
        if (g.kind === "pinch") {
          const pts = [...pointers.current.values()];
          if (pts.length >= 2) setTf(pinchTransform(g.start, { a: g.a, b: g.b }, { a: pts[0] as Point, b: pts[1] as Point }));
          return;
        }
        if (g.pointer !== e.pointerId) return;
        if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) < 4) return;
        g.moved = true;
        userMoved.current = true;
        setTf((p) => ({ ...p, x: g.ox + e.clientX - g.sx, y: g.oy + e.clientY - g.sy }));
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        const g = gesture.current;
        if (g?.kind === "pinch" ? pointers.current.size < 2 : g?.pointer === e.pointerId) {
          gesture.current = null;
          if (g?.kind === "pan" && !g.moved && !(e.target as Element).closest("[data-node]")) onSelect(null);
        }
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        gesture.current = null;
      }}
    >
      <div ref={content} className="absolute top-0 w-max origin-top-left p-6" style={{ left: 0, transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.k})` }}>
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 size-full overflow-visible" width={extent.w} height={extent.h}>
          {links.map((l, i) => {
            const a = boxes.get(l.source);
            const b = boxes.get(l.target);
            if (!a || !b) return null;
            const lk = linkKindOf(l.kind);
            const hot = active !== null && (l.source === active || l.target === active);
            const c = schemaConnector(a, b, side);
            const arrow = arrows || lk?.arrow === true;
            const colour = hot ? undefined : lk?.hue ? hueVar(lk.hue) : undefined;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: links have no id
              <g key={i} data-link-kind={lk?.id} data-hot={hot ? "true" : undefined} className={cn("transition-opacity", active && !hot && "opacity-15")}>
                <path d={c.d} fill="none" strokeWidth={hot ? 2 : 1.25} strokeDasharray={dashFor(lk?.style)} style={colour ? { stroke: colour } : undefined} className={colour ? undefined : hot ? "stroke-nq-brand" : "stroke-nq-line-strong"}>
                  {lk?.style === "flow" ? <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" /> : null}
                </path>
                {arrow ? <polygon points={arrowPoints(c.end, c.angle)} style={colour ? { fill: colour } : undefined} className={colour ? undefined : hot ? "fill-nq-brand" : "fill-nq-line-strong"} /> : null}
                {hot && l.label ? (
                  <text x={c.mid.x} y={c.mid.y - 4} textAnchor="middle" fontSize={11} className="fill-muted-foreground" style={stroked}>
                    {l.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className="relative z-10 flex items-start gap-x-20">
          {columns.map((col) => {
            const kind = kindOf(col.kind);
            const Icon = kind?.icon;
            return (
              <section key={col.kind} data-column={col.kind} aria-label={kind?.label ?? col.kind} className="flex w-56 shrink-0 flex-col gap-2.5">
                <header className="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2">
                  <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-3.5" style={{ backgroundColor: kind ? hueVar(kind.hue) : "var(--nq-line-strong)" }}>
                    {Icon ? <Icon /> : null}
                  </span>
                  <h3 className="min-w-0 flex-1 truncate text-label text-foreground">{kind?.label ?? col.kind}</h3>
                  <Badge variant="outline">
                    <bdi>{num(col.nodes.length)}</bdi>
                  </Badge>
                </header>
                <ul className="flex flex-col gap-2.5">
                  {col.nodes.map((n) => {
                    const on = n.id === selected;
                    const dim = active !== null && n.id !== active && !activeNear?.has(n.id);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          data-node={n.id}
                          onClick={() => onSelect(on ? null : n.id)}
                          onPointerEnter={() => setHover(n.id)}
                          onPointerLeave={() => setHover(null)}
                          onFocus={() => setHover(n.id)}
                          onBlur={() => setHover(null)}
                          style={{ borderInlineStartColor: kind ? hueVar(kind.hue) : undefined }}
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-card border border-s-4 bg-card px-3 py-2 text-start shadow-xs outline-none transition-[opacity,background-color] hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                            on ? "border-primary bg-nq-selected" : "border-border",
                            dim && "opacity-40",
                          )}
                        >
                          <span className="truncate text-label text-foreground">{n.label}</span>
                          {n.description ? <span className="line-clamp-2 text-caption text-muted-foreground">{n.description}</span> : null}
                          <span className="text-caption text-muted-foreground">
                            <bdi>{t.connections(num(around.get(n.id)?.size ?? 0))}</bdi>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      <ZoomButtons
        t={t}
        onZoom={(factor) => applyTf((p) => zoomAbout(p, factor, { x: size.w / 2, y: size.h / 2 }, 0.3, 2))}
        onFit={() => {
          userMoved.current = false;
          fit(true);
        }}
      />
      <p className="pointer-events-none absolute end-3 bottom-3 hidden max-w-72 text-end text-caption text-muted-foreground md:block">{t.schemaHint}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ grid & list */

function KindDot({ kind }: { kind: GraphViewKind | undefined }) {
  const Icon = kind?.icon;
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-4" style={{ backgroundColor: kind ? hueVar(kind.hue) : "var(--nq-line-strong)" }}>
      {Icon ? <Icon /> : null}
    </span>
  );
}

function GridMode({ nodes, around, kindOf, selected, onSelect, t, num }: ModeProps & { num: (n: number) => string }) {
  return (
    <ul className="grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-3 overflow-y-auto p-3">
      {nodes.map((n) => {
        const kind = kindOf(n.kind);
        const on = n.id === selected;
        return (
          <li key={n.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={on}
              data-node={n.id}
              onClick={() => onSelect(on ? null : n.id)}
              className={cn(
                "flex h-full w-full flex-col gap-2 rounded-card border bg-card p-3 text-start shadow-xs outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                on ? "border-primary bg-nq-selected" : "border-border",
              )}
            >
              <span className="flex items-center gap-2.5">
                <KindDot kind={kind} />
                <span className="min-w-0">
                  <span className="block truncate text-label text-foreground">{n.label}</span>
                  <span className="block truncate text-caption text-muted-foreground">{kind?.label ?? n.kind}</span>
                </span>
              </span>
              {n.description ? <span className="line-clamp-2 text-body-sm text-muted-foreground">{n.description}</span> : null}
              <span className="mt-auto flex items-center justify-between gap-2 text-caption text-muted-foreground">
                <bdi>{t.connections(num(around.get(n.id)?.size ?? 0))}</bdi>
                {n.updatedAt !== undefined ? <DateTime value={n.updatedAt} relative /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ListMode({ nodes, around, kindOf, selected, onSelect, t, num, locale }: ModeProps & { num: (n: number) => string; locale: string }) {
  const [sort, setSort] = useState<{ key: ListSortKey; dir: "asc" | "desc" }>({ key: "label", dir: "asc" });
  const rows = useMemo(
    () => sortRows(nodes.map((n) => ({ node: n, label: n.label, kind: kindOf(n.kind)?.label ?? n.kind, links: around.get(n.id)?.size ?? 0, ...(n.updatedAt !== undefined ? { updated: new Date(n.updatedAt).getTime() } : {}) })), sort.key, sort.dir, locale),
    [nodes, around, kindOf, sort, locale],
  );
  const head = (key: ListSortKey, text: string, className?: string) => {
    const on = sort.key === key;
    const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
        <button type="button" onClick={() => setSort({ key, dir: on && sort.dir === "asc" ? "desc" : "asc" })} className="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
          {text}
          <Icon aria-hidden className={cn("size-3.5", !on && "text-muted-foreground")} />
        </button>
      </TableHead>
    );
  };
  return (
    <div className="h-full overflow-auto">
      <Table label={t.list}>
        <TableHeader>
          <TableRow>
            {head("label", t.colName)}
            {head("kind", t.colKind)}
            {head("links", t.colLinks)}
            {head("updated", t.colUpdated)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ node: n, links: count }) => {
            const kind = kindOf(n.kind);
            const on = n.id === selected;
            return (
              <TableRow key={n.id} data-node={n.id} data-state={on ? "selected" : undefined} className={cn("cursor-pointer", on && "bg-nq-selected")} onClick={() => onSelect(on ? null : n.id)}>
                <TableCell>
                  <button type="button" aria-pressed={on} onClick={(e) => { e.stopPropagation(); onSelect(on ? null : n.id); }} className="text-start text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                    {n.label}
                  </button>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: kind ? hueVar(kind.hue) : "var(--nq-line-strong)" }} />
                    {kind?.label ?? n.kind}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">
                  <bdi>{num(count)}</bdi>
                </TableCell>
                <TableCell className="text-muted-foreground">{n.updatedAt !== undefined ? <DateTime value={n.updatedAt} relative /> : null}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ inspector */

function Inspector({ node, kind, links, byId, kindOf, onSelect, onClose, onOpen, actions, t }: {
  node: GraphViewNode;
  kind: GraphViewKind | undefined;
  links: GraphViewLink[];
  byId: Map<string, GraphViewNode>;
  kindOf: (id: string) => GraphViewKind | undefined;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onOpen?: (node: GraphViewNode) => void;
  actions?: ReactNode;
  t: GraphViewLabels;
}) {
  const out = links.filter((l) => l.source === node.id && byId.has(l.target));
  const into = links.filter((l) => l.target === node.id && byId.has(l.source));
  const list = (title: string, items: { id: string; label?: string | undefined }[]) =>
    items.length ? (
      <section className="flex flex-col gap-1">
        <h3 className="eyebrow">{title}</h3>
        <ul className="flex flex-col">
          {items.map((it, i) => {
            const other = byId.get(it.id) as GraphViewNode;
            const k = kindOf(other.kind);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: the same node can be linked twice with different labels
              <li key={`${it.id}-${i}`}>
                <button type="button" onClick={() => onSelect(it.id)} className="flex w-full items-center gap-2 rounded-control px-1.5 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: k ? hueVar(k.hue) : "var(--nq-line-strong)" }} />
                  <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">{other.label}</span>
                  {it.label ? <span className="shrink-0 text-caption text-muted-foreground">{it.label}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;
  return (
    <>
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <KindDot kind={kind} />
        <div className="min-w-0 flex-1">
          <h2 className="text-label text-foreground">{node.label}</h2>
          <p className="text-caption text-muted-foreground">{kind?.label ?? node.kind}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t.close} title={t.close}>
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {node.description ? <p className="text-body-sm text-foreground">{node.description}</p> : null}
        {node.tags?.length ? (
          <section className="flex flex-col gap-1.5">
            <h3 className="eyebrow">{t.tags}</h3>
            <div className="flex flex-wrap gap-1.5">
              {node.tags.map((g) => (
                <Badge key={g} variant="outline">
                  {g}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}
        {node.updatedAt !== undefined ? (
          <p className="text-caption text-muted-foreground">
            {t.updated} <DateTime value={node.updatedAt} format={{ dateStyle: "medium" }} />
          </p>
        ) : null}
        {list(t.linksTo, out.map((l) => ({ id: l.target, label: l.label })))}
        {list(t.linkedFrom, into.map((l) => ({ id: l.source, label: l.label })))}
        {out.length + into.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.noLinks}</p> : null}
      </div>
      {onOpen || actions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {onOpen ? (
            <Button variant="primary" size="sm" onClick={() => onOpen(node)}>
              <ExternalLink aria-hidden className="rtl:-scale-x-100" />
              {t.open}
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </>
  );
}
