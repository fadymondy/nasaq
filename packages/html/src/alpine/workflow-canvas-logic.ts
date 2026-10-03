/*
 * Workflow canvas model and geometry: pure functions of a graph (nodes + edges) and a list of step types,
 * shared by the canvas, its validation and the tests. Nothing here touches the DOM.
 * Copy of packages/vue/src/components/workflow-canvas/workflow-model.ts (the step type icon is a lucide name here).
 */


export type WorkflowStatus = "idle" | "running" | "success" | "error" | "skipped" | "waiting";

export type WorkflowFieldKind = "text" | "textarea" | "number" | "boolean" | "select" | "url" | "code";

export interface WorkflowFieldDef {
  /** Key in the node's `config`. */
  name: string;
  /** Localised label. */
  label: string;
  kind: WorkflowFieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** For `kind: "select"`. */
  options?: { value: string; label: string }[];
}

export interface WorkflowStepType {
  id: string;
  /** Localised name. */
  label: string;
  /** Localised one-liner shown in the node picker. */
  description?: string;
  /** Group in the node picker. Matches a `categories` id, or is shown as is. */
  category: string;
  /** The icon name (lucide) the Blade component renders for this type. */
  icon?: string;
  /** `trigger` starts a workflow (no inputs, at most one per graph). Default `action`. */
  role?: "trigger" | "action";
  fields?: WorkflowFieldDef[];
  /** The config a new node of this type starts with. */
  defaults?: Record<string, unknown>;
  /** Named outputs (a condition's yes/no). Default is one unnamed output. */
  outputs?: { id: string; label: string }[];
  /** Extra search words. */
  keywords?: string[];
}

export interface WorkflowNodeData {
  id: string;
  type: string;
  /** A name the person gave this node. Falls back to the step type's label. */
  label?: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdgeData {
  id: string;
  source: string;
  target: string;
  /** Which output of the source it leaves from, for branching steps. */
  sourceHandle?: string | null;
  label?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

export interface WorkflowNodeRun {
  status: WorkflowStatus;
  /** When it ran, relative to the run's start, in ms. Drives replay order; falls back to graph order. */
  startedAtMs?: number;
  durationMs?: number;
  /** How many items came out of it; shown on its outgoing edges. */
  items?: number;
  output?: unknown;
  error?: string;
}

export interface WorkflowRun {
  id: string;
  status: WorkflowStatus;
  startedAt: Date | number | string;
  durationMs?: number;
  /** "Manual", "Schedule", "Webhook": localised by the caller. */
  trigger?: string;
  nodes: Record<string, WorkflowNodeRun>;
}

export interface WorkflowVersion {
  version: number;
  savedAt: Date | number | string;
  author?: string;
  note?: string;
  graph: WorkflowGraph;
}

export type WorkflowIssueCode = "empty" | "no-trigger" | "multiple-triggers" | "unknown-type" | "missing-field" | "unreachable" | "cycle" | "trigger-input";

export interface WorkflowIssue {
  code: WorkflowIssueCode;
  level: "error" | "warning";
  nodeId?: string;
  /** The field's name for `missing-field`. */
  field?: string;
}

/* ------------------------------------------------------------------ geometry */

export const NODE_WIDTH = 248;
export const NODE_HEIGHT = 76;
const COL_GAP = 96;
const ROW_GAP = 40;

export type WorkflowDirection = "horizontal" | "vertical";

export function typeMap(types: WorkflowStepType[]): Map<string, WorkflowStepType> {
  return new Map(types.map((t) => [t.id, t]));
}

const outgoing = (graph: WorkflowGraph) => {
  const map = new Map<string, WorkflowEdgeData[]>();
  for (const e of graph.edges) map.set(e.source, [...(map.get(e.source) ?? []), e]);
  return map;
};

/** Ids reachable from `from` by following edges (including `from` itself only when it sits on a cycle). */
export function reachableFrom(graph: WorkflowGraph, from: string): Set<string> {
  const out = outgoing(graph);
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop() as string;
    for (const e of out.get(id) ?? []) {
      if (!seen.has(e.target)) {
        seen.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return seen;
}

/** Would adding `source -> target` be legal: no self loop, no duplicate, no cycle, nothing flowing into a trigger. */
export function canConnect(graph: WorkflowGraph, types: Map<string, WorkflowStepType>, source: string, target: string, sourceHandle?: string | null): boolean {
  if (source === target) return false;
  const t = graph.nodes.find((n) => n.id === target);
  if (!t || !graph.nodes.some((n) => n.id === source)) return false;
  if (types.get(t.type)?.role === "trigger") return false;
  if (graph.edges.some((e) => e.source === source && e.target === target && (e.sourceHandle ?? null) === (sourceHandle ?? null))) return false;
  return !reachableFrom(graph, target).has(source);
}

/**
 * Lays the graph out as a tidy tree: leaves take consecutive rows, a parent sits at the average of its
 * children, depth sets the column. Roots are nodes with no incoming edge; leftovers (cycles) are appended.
 */
export function autoLayout(graph: WorkflowGraph, direction: WorkflowDirection = "horizontal"): Map<string, { x: number; y: number }> {
  const out = outgoing(graph);
  const hasIn = new Set(graph.edges.map((e) => e.target));
  const ids = graph.nodes.map((n) => n.id);
  const roots = ids.filter((id) => !hasIn.has(id));
  const depth = new Map<string, number>();
  // Longest-path depth (iterative relaxation, capped so a cycle cannot loop forever).
  for (const r of roots) depth.set(r, 0);
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of graph.edges) {
      const d = depth.get(e.source);
      if (d !== undefined && (depth.get(e.target) ?? -1) < d + 1 && d + 1 <= ids.length) {
        depth.set(e.target, d + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const id of ids) if (!depth.has(id)) depth.set(id, 0);

  const along = direction === "horizontal" ? NODE_WIDTH + COL_GAP : NODE_HEIGHT + COL_GAP;
  const across = direction === "horizontal" ? NODE_HEIGHT + ROW_GAP : NODE_WIDTH + ROW_GAP;
  const slot = new Map<string, number>();
  let next = 0;
  const visit = (id: string) => {
    if (slot.has(id)) return;
    slot.set(id, Number.NaN); // being visited
    const kids = (out.get(id) ?? []).map((e) => e.target).filter((k) => !slot.has(k) && (depth.get(k) ?? 0) > (depth.get(id) ?? 0));
    for (const k of kids) visit(k);
    const placed = kids.map((k) => slot.get(k)).filter((v): v is number => v !== undefined && !Number.isNaN(v));
    slot.set(id, placed.length ? placed.reduce((a, b) => a + b, 0) / placed.length : next++);
  };
  for (const r of [...roots, ...ids]) visit(r);

  const positions = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const d = (depth.get(id) ?? 0) * along;
    const s = (slot.get(id) ?? 0) * across;
    positions.set(id, direction === "horizontal" ? { x: d, y: s } : { x: s, y: d });
  }
  return positions;
}

/** Positions for every node: the ones it already has are kept, the rest come from `autoLayout`. */
export function withPositions(graph: WorkflowGraph, direction: WorkflowDirection = "horizontal"): WorkflowGraph {
  if (graph.nodes.every((n) => n.position)) return graph;
  const laid = autoLayout(graph, direction);
  return { ...graph, nodes: graph.nodes.map((n) => (n.position ? n : { ...n, position: laid.get(n.id) ?? { x: 0, y: 0 } })) };
}

/* ------------------------------------------------------------------ editing */

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Adds a node of `typeId` after `after.sourceId` (or on its own when there is no source). When that output
 * already leads somewhere the node is spliced in between, and everything downstream moves out of its way.
 */
export function addStep(
  graph: WorkflowGraph,
  types: Map<string, WorkflowStepType>,
  typeId: string,
  after?: { sourceId: string; sourceHandle?: string | null },
  direction: WorkflowDirection = "horizontal",
): { graph: WorkflowGraph; id: string } {
  const type = types.get(typeId);
  const id = uid("n");
  const base = withPositions(graph, direction);
  const source = after ? base.nodes.find((n) => n.id === after.sourceId) : undefined;
  const horizontal = direction === "horizontal";
  const stepX = NODE_WIDTH + COL_GAP;
  const stepY = NODE_HEIGHT + COL_GAP;
  const handle = after?.sourceHandle ?? null;
  const spliced = source ? base.edges.find((e) => e.source === source.id && (e.sourceHandle ?? null) === handle) : undefined;
  let position = { x: 0, y: 0 };
  if (source?.position) {
    const siblings = base.edges.filter((e) => e.source === source.id).length;
    const spread = spliced ? 0 : siblings * (horizontal ? NODE_HEIGHT + ROW_GAP : NODE_WIDTH + ROW_GAP);
    position = horizontal ? { x: source.position.x + stepX, y: source.position.y + spread } : { x: source.position.x + spread, y: source.position.y + stepY };
  } else if (base.nodes.length) {
    const maxY = Math.max(...base.nodes.map((n) => n.position?.y ?? 0));
    position = { x: 0, y: maxY + NODE_HEIGHT + ROW_GAP };
  }
  let nodes = base.nodes;
  let edges = base.edges;
  if (source && after) {
    if (spliced) {
      const moved = new Set([spliced.target, ...reachableFrom({ nodes, edges }, spliced.target)]);
      const dx = horizontal ? stepX : 0;
      const dy = horizontal ? 0 : stepY;
      nodes = nodes.map((n) => (moved.has(n.id) && n.position ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
      edges = edges.filter((e) => e.id !== spliced.id);
      edges = [...edges, { id: uid("e"), source: id, target: spliced.target, sourceHandle: type?.outputs?.[0]?.id ?? null }];
    }
    edges = [...edges, { id: uid("e"), source: source.id, target: id, sourceHandle: handle }];
  }
  nodes = [...nodes, { id, type: typeId, config: { ...(type?.defaults ?? {}) }, position }];
  return { graph: { nodes, edges }, id };
}

/** Removes nodes; when a removed node had exactly one way in and one way out, its neighbours are joined. */
export function removeNodes(graph: WorkflowGraph, ids: string[]): WorkflowGraph {
  let edges = graph.edges;
  for (const id of ids) {
    const ins = edges.filter((e) => e.target === id && !ids.includes(e.source));
    const outs = edges.filter((e) => e.source === id && !ids.includes(e.target));
    const i = ins[0];
    const o = outs[0];
    if (ins.length === 1 && outs.length === 1 && i && o && !edges.some((e) => e.source === i.source && e.target === o.target)) {
      edges = [...edges, { id: uid("e"), source: i.source, target: o.target, sourceHandle: i.sourceHandle ?? null }];
    }
  }
  const gone = new Set(ids);
  return { nodes: graph.nodes.filter((n) => !gone.has(n.id)), edges: edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)) };
}

/* ------------------------------------------------------------------ validation */

const filled = (v: unknown) => !(v === undefined || v === null || (typeof v === "string" && v.trim() === ""));

export function validateWorkflow(graph: WorkflowGraph, types: Map<string, WorkflowStepType>): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  if (graph.nodes.length === 0) return [{ code: "empty", level: "error" }];
  const triggers = graph.nodes.filter((n) => types.get(n.type)?.role === "trigger");
  if (triggers.length === 0) issues.push({ code: "no-trigger", level: "error" });
  for (const t of triggers.slice(1)) issues.push({ code: "multiple-triggers", level: "error", nodeId: t.id });
  for (const n of graph.nodes) {
    const type = types.get(n.type);
    if (!type) {
      issues.push({ code: "unknown-type", level: "error", nodeId: n.id });
      continue;
    }
    for (const f of type.fields ?? []) {
      if (f.required && f.kind !== "boolean" && !filled(n.config[f.name])) issues.push({ code: "missing-field", level: "error", nodeId: n.id, field: f.name });
    }
    if (type.role === "trigger" && graph.edges.some((e) => e.target === n.id)) issues.push({ code: "trigger-input", level: "error", nodeId: n.id });
  }
  if (triggers.length) {
    const seen = new Set<string>(triggers.map((t) => t.id));
    for (const t of triggers) for (const r of reachableFrom(graph, t.id)) seen.add(r);
    for (const n of graph.nodes) if (!seen.has(n.id)) issues.push({ code: "unreachable", level: "warning", nodeId: n.id });
  }
  const looping = graph.nodes.find((n) => reachableFrom(graph, n.id).has(n.id));
  if (looping) issues.push({ code: "cycle", level: "error", nodeId: looping.id });
  return issues;
}

/* ------------------------------------------------------------------ runs */

/** Node ids in the order they ran: by `startedAtMs` where the run has it, else left to right in the graph. */
export function runOrder(graph: WorkflowGraph, run: WorkflowRun): string[] {
  const layout = autoLayout(graph, "horizontal");
  const rank = (id: string) => layout.get(id)?.x ?? 0;
  return graph.nodes
    .map((n) => n.id)
    .filter((id) => run.nodes[id])
    .sort((a, b) => (run.nodes[a]?.startedAtMs ?? rank(a)) - (run.nodes[b]?.startedAtMs ?? rank(b)) || rank(a) - rank(b));
}

/** The run as of step `cursor` of a replay: nodes after it have not run yet, the one at it is running. */
export function runAtStep(graph: WorkflowGraph, run: WorkflowRun, cursor: number): WorkflowRun {
  const order = runOrder(graph, run);
  const nodes: Record<string, WorkflowNodeRun> = {};
  order.forEach((id, i) => {
    const r = run.nodes[id] as WorkflowNodeRun;
    if (i < cursor) nodes[id] = r;
    else if (i === cursor) nodes[id] = { status: "running" };
  });
  return { ...run, status: cursor >= order.length ? run.status : "running", nodes };
}

/* ------------------------------------------------------------------ canvas geometry (the hand-drawn graph) */

export interface Pt {
  x: number;
  y: number;
}
/** The viewport: world point (0, 0) sits at (x, y) on screen, scaled by k. */
export interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 1.6;
export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** A node's height: branching steps grow to fit their named outputs. */
export function nodeHeight(outputCount: number): number {
  return outputCount > 1 ? Math.max(NODE_HEIGHT, outputCount * 34 + 12) : NODE_HEIGHT;
}

/** Where output `i` of `n` leaves a node (world coordinates). */
export function outputPoint(pos: Pt, height: number, direction: WorkflowDirection, i: number, n: number): Pt {
  const frac = (i + 1) / (n + 1);
  return direction === "horizontal" ? { x: pos.x + NODE_WIDTH, y: pos.y + height * frac } : { x: pos.x + NODE_WIDTH * frac, y: pos.y + height };
}

/** Where edges enter a node. */
export function inputPoint(pos: Pt, height: number, direction: WorkflowDirection): Pt {
  return direction === "horizontal" ? { x: pos.x, y: pos.y + height / 2 } : { x: pos.x + NODE_WIDTH / 2, y: pos.y };
}

const controlOffset = (distance: number) => (distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance));

/** A smooth connector from an output to an input, and the point halfway along it (for the label / "+" button). */
export function edgeGeometry(s: Pt, t: Pt, direction: WorkflowDirection): { path: string; mid: Pt } {
  let c1: Pt;
  let c2: Pt;
  if (direction === "horizontal") {
    c1 = { x: s.x + controlOffset(t.x - s.x), y: s.y };
    c2 = { x: t.x - controlOffset(t.x - s.x), y: t.y };
  } else {
    c1 = { x: s.x, y: s.y + controlOffset(t.y - s.y) };
    c2 = { x: t.x, y: t.y - controlOffset(t.y - s.y) };
  }
  return {
    path: `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${t.x},${t.y}`,
    mid: { x: (s.x + 3 * c1.x + 3 * c2.x + t.x) / 8, y: (s.y + 3 * c1.y + 3 * c2.y + t.y) / 8 },
  };
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function nodeBounds(boxes: Bounds[]): Bounds | null {
  if (boxes.length === 0) return null;
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** The transform that shows `bounds` centred in a `width` x `height` viewport with `padding` (a fraction) around it. */
export function fitTransform(bounds: Bounds | null, width: number, height: number, padding = 0.25, maxZoom = 1): ViewTransform {
  if (!bounds || width <= 0 || height <= 0) return { x: 0, y: 0, k: 1 };
  const k = Math.min(maxZoom, Math.max(MIN_ZOOM, Math.min(width / (bounds.w * (1 + padding * 2)), height / (bounds.h * (1 + padding * 2)))));
  return { k, x: (width - bounds.w * k) / 2 - bounds.x * k, y: (height - bounds.h * k) / 2 - bounds.y * k };
}

/** Zoom to `next` keeping the screen point (px, py) fixed. */
export function zoomAt(v: ViewTransform, next: number, px: number, py: number): ViewTransform {
  const k = clampZoom(next);
  const wx = (px - v.x) / v.k;
  const wy = (py - v.y) / v.k;
  return { k, x: px - wx * k, y: py - wy * k };
}

/** The border colour class of a node by status. */
export const STATUS_BORDER: Record<WorkflowStatus, string> = {
  idle: "border-border",
  running: "border-nq-info",
  success: "border-nq-success",
  error: "border-nq-danger",
  skipped: "border-border border-dashed",
  waiting: "border-nq-warning",
};

export const STATUS_TONE: Record<WorkflowStatus, string> = {
  idle: "text-muted-foreground",
  running: "text-nq-info-text",
  success: "text-nq-success-text",
  error: "text-nq-danger-text",
  skipped: "text-muted-foreground",
  waiting: "text-nq-warning-text",
};

/** The first config value worth showing under a node's title. */
export function firstFilled(node: WorkflowNodeData, type: WorkflowStepType | undefined): string | undefined {
  for (const f of type?.fields ?? []) {
    const v = node.config[f.name];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

/** The minimap colour of a node by status (CSS variables, never hex). */
export function minimapColor(status?: string): string {
  return status === "success" ? "var(--nq-success)" : status === "error" ? "var(--nq-danger)" : status === "running" ? "var(--nq-info)" : "var(--nq-line-strong)";
}

/** Config value of a field as the editor shows it. */
export const fieldText = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Case, diacritics and Arabic letter variants folded away so search matches what people mean. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ̀-ͯ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/** Picker groups: the steps matching `q`, grouped by category in the given order. */
export function pickerGroups(types: WorkflowStepType[], categories: { id: string; label: string }[] | undefined, q: string) {
  const needle = normalizeForSearch(q.trim());
  const order = categories?.map((c) => c.id) ?? [];
  const ids = [...new Set([...order, ...types.map((s) => s.category)])];
  return ids
    .map((id) => ({
      id,
      label: categories?.find((c) => c.id === id)?.label ?? id,
      steps: types.filter((s) => s.category === id && (!needle || normalizeForSearch([s.label, s.description ?? "", s.id, ...(s.keywords ?? [])].join(" ")).includes(needle))),
    }))
    .filter((g) => g.steps.length > 0);
}
