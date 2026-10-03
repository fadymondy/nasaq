<script setup lang="ts">
import { History, ListChecks, Lock, LockOpen, Maximize2, Minus, Play, Plus, Save, ShieldCheck, TriangleAlert, Wand2 } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { useFormatNumber } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import NqWorkflowConfigPanel from "./NqWorkflowConfigPanel.vue";
import NqWorkflowNodePicker from "./NqWorkflowNodePicker.vue";
import NqWorkflowRunsPanel from "./NqWorkflowRunsPanel.vue";
import NqWorkflowStatusGlyph from "./NqWorkflowStatusGlyph.vue";
import NqWorkflowStepNode from "./NqWorkflowStepNode.vue";
import NqWorkflowVersionsPanel from "./NqWorkflowVersionsPanel.vue";
import { useCanvasLabels, type WorkflowCanvasLabels } from "./labels";
import {
  addStep,
  autoLayout,
  canConnect,
  clampZoom,
  edgeGeometry,
  fitTransform,
  inputPoint,
  minimapColor,
  nodeBounds,
  nodeHeight,
  NODE_WIDTH,
  outputPoint,
  removeNodes,
  runAtStep,
  runOrder,
  typeMap,
  uid,
  validateWorkflow,
  withPositions,
  zoomAt,
  type Bounds,
  type Pt,
  type ViewTransform,
  type WorkflowDirection,
  type WorkflowGraph,
  type WorkflowIssue,
  type WorkflowRun,
  type WorkflowStepType,
  type WorkflowVersion,
} from "./workflow-model";

// An editable workflow: nodes with a status, a "what happens next" picker, a side panel to configure each step,
// a minimap, zoom controls, validation and an execution overlay that draws how a past run went (and replays it).
// The graph is hand-drawn (SVG edges, absolutely positioned nodes, native pointer events): no graph library.
// The canvas stays left-to-right in Arabic, like a diagram; the toolbar, panels and node text follow the page.
type Result = void | { error?: string };
interface Props {
  /** The workflow. The canvas keeps its own working copy and adopts a new `value` when the prop changes. */
  value: WorkflowGraph;
  /** The step types that can be added. Triggers are offered first when the graph has none. */
  types: WorkflowStepType[];
  /** Group headings for the node picker, in order. */
  categories?: { id: string; label: string }[];
  /** Shown on the start of the toolbar: the workflow's name. */
  title?: string;
  /** Executions to draw on the canvas. Omit to hide the Executions panel. */
  runs?: WorkflowRun[];
  /** Saved versions. Omit to hide the Versions panel. */
  versions?: WorkflowVersion[];
  /** The version the workflow is at. Defaults to the highest in `versions`. */
  currentVersion?: number;
  /** Save the working copy. Return `{ error }` to show it. Omit to hide the Save button. */
  onSave?: (graph: WorkflowGraph) => Promise<Result>;
  /** Start a run. Omit to hide the Run button. */
  onRun?: (graph: WorkflowGraph) => Promise<Result>;
  /** Restore a version. The parent should save the current graph as a new version first. */
  onRestoreVersion?: (version: WorkflowVersion) => Promise<Result>;
  direction?: WorkflowDirection;
  /** No editing: nodes can be selected and inspected, the toolbar hides its edit actions. */
  readOnly?: boolean;
  /** Start with an execution drawn on the canvas. */
  defaultRunId?: string | null;
  /** Height of the canvas. Default fills the parent, with a 480px minimum. */
  height?: number | string;
  labels?: Partial<WorkflowCanvasLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  categories: undefined,
  title: undefined,
  runs: undefined,
  versions: undefined,
  currentVersion: undefined,
  onSave: undefined,
  onRun: undefined,
  onRestoreVersion: undefined,
  direction: "horizontal",
  readOnly: false,
  defaultRunId: null,
  height: "100%",
  labels: undefined,
});
const emit = defineEmits<{ change: [graph: WorkflowGraph] }>();

type Panel = { kind: "picker"; after?: { sourceId: string; sourceHandle?: string | null } } | { kind: "config"; id: string } | { kind: "runs" } | { kind: "versions" } | null;

const { t, ar } = useCanvasLabels(() => props.labels);
const fmtNum = useFormatNumber();
const markerId = `nq-wf-arrow-${useId()}`;
const typeById = computed(() => typeMap(props.types));

const graph = ref<WorkflowGraph>(withPositions(props.value, props.direction));
let lastEmitted: WorkflowGraph | null = null;
const dirty = ref(false);
watch(
  () => [props.value, props.direction] as const,
  ([v, d]) => {
    if (toRaw(v) === lastEmitted) return;
    graph.value = withPositions(v, d);
    dirty.value = false;
  },
);

const panel = ref<Panel>(null);
const selectedEdge = ref<string | null>(null);
const hoverEdge = ref<string | null>(null);
const locked = ref(false);
const busy = ref<"save" | "run" | null>(null);
const message = ref<string | null>(null);
const runId = ref<string | null>(props.defaultRunId);
const cursor = ref<number | null>(null);
const previewV = ref<WorkflowVersion | null>(null);
const view = ref<ViewTransform>({ x: 0, y: 0, k: 1 });
const size = ref({ w: 0, h: 0 });
const animate = ref(false);
const dragPos = ref<Record<string, Pt>>({});
const connecting = ref<{ sourceId: string; handle: string | null; from: Pt; to: Pt } | null>(null);
const surface = ref<HTMLElement | null>(null);

const previewing = computed(() => previewV.value !== null);
const editable = computed(() => !props.readOnly && !previewing.value);
const shown = computed<WorkflowGraph>(() => (previewV.value ? withPositions(previewV.value.graph, props.direction) : graph.value));
const issues = computed(() => validateWorkflow(shown.value, typeById.value));
const errorCount = computed(() => issues.value.filter((i) => i.level === "error").length);
const problems = computed(() => issues.value.filter((i) => i.level === "error" || i.level === "warning"));

const baseRun = computed(() => (runId.value ? props.runs?.find((r) => r.id === runId.value) : undefined));
const run = computed(() => (baseRun.value && cursor.value !== null ? runAtStep(shown.value, baseRun.value, cursor.value) : baseRun.value));
const order = computed(() => (baseRun.value ? runOrder(shown.value, baseRun.value) : []));

// Replay: step through the order the nodes ran in.
let replayTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  [cursor, () => order.value.length],
  ([c, n]) => {
    clearTimeout(replayTimer);
    if (c === null) return;
    if (c > n) {
      cursor.value = null;
      return;
    }
    replayTimer = setTimeout(() => (cursor.value = cursor.value === null ? null : cursor.value + 1), 650);
  },
  { flush: "post" },
);
onBeforeUnmount(() => clearTimeout(replayTimer));

const formatDuration = (ms: number) =>
  ms < 1000 ? t.value.milliseconds(fmtNum(Math.round(ms))) : ms < 60_000 ? t.value.seconds(fmtNum(ms / 1000, { maximumFractionDigits: 1 })) : t.value.minutes(fmtNum(ms / 60_000, { maximumFractionDigits: 1 }));
const formatNumber = (n: number) => fmtNum(n);

function commit(next: WorkflowGraph) {
  graph.value = next;
  dirty.value = true;
  message.value = null;
  lastEmitted = next;
  emit("change", next);
}

/* ---- geometry of what is drawn ---- */
const posOf = (id: string, fallback?: Pt): Pt => dragPos.value[id] ?? fallback ?? { x: 0, y: 0 };
const outputsOf = (typeId: string) => (typeById.value.get(typeId)?.outputs?.length ? typeById.value.get(typeId)!.outputs! : [{ id: "", label: "" }]);

const boxes = computed(() =>
  shown.value.nodes.map((n) => ({ id: n.id, ...posOf(n.id, n.position), w: NODE_WIDTH, h: nodeHeight(outputsOf(n.type).length), status: run.value?.nodes[n.id]?.status })),
);

const drawnEdges = computed(() =>
  shown.value.edges.flatMap((e) => {
    const sNode = shown.value.nodes.find((n) => n.id === e.source);
    const tNode = shown.value.nodes.find((n) => n.id === e.target);
    if (!sNode || !tNode) return [];
    const outs = outputsOf(sNode.type);
    const i = Math.max(0, outs.findIndex((o) => o.id === (e.sourceHandle ?? "")));
    const sh = nodeHeight(outs.length);
    const th = nodeHeight(outputsOf(tNode.type).length);
    const g = edgeGeometry(outputPoint(posOf(sNode.id, sNode.position), sh, props.direction, i, outs.length), inputPoint(posOf(tNode.id, tNode.position), th, props.direction), props.direction);
    const src = run.value?.nodes[e.source];
    const dst = run.value?.nodes[e.target];
    const ran = Boolean(src && dst);
    const named = typeById.value.get(sNode.type)?.outputs?.find((o) => o.id === (e.sourceHandle ?? ""))?.label || undefined;
    return [
      {
        id: e.id,
        ...g,
        text: run.value && src?.items !== undefined && ran ? fmtNum(src.items) : (e.label ?? named),
        live: Boolean(run.value && src?.status === "success" && dst?.status === "running"),
        tone: run.value ? (ran ? "ran" : "dim") : "plain",
        selected: selectedEdge.value === e.id,
        showInsert: editable.value && (hoverEdge.value === e.id || selectedEdge.value === e.id),
      },
    ];
  }),
);
const STROKE = { ran: "var(--nq-success)", dim: "var(--nq-line)", plain: "var(--nq-line-strong)" } as const;

const connectPath = computed(() => {
  const c = connecting.value;
  if (!c) return "";
  return edgeGeometry(c.from, c.to, props.direction).path;
});

/* ---- viewport ---- */
function measure() {
  const el = surface.value;
  if (!el) return;
  size.value = { w: el.clientWidth, h: el.clientHeight };
}
function fit(padding = 0.25, withAnimation = true) {
  measure();
  animate.value = withAnimation;
  view.value = fitTransform(nodeBounds(boxes.value as Bounds[]), size.value.w, size.value.h, padding, 1);
  if (withAnimation) setTimeout(() => (animate.value = false), 320);
}
function zoomBy(factor: number) {
  measure();
  animate.value = true;
  view.value = zoomAt(view.value, view.value.k * factor, size.value.w / 2, size.value.h / 2);
  setTimeout(() => (animate.value = false), 200);
}
const clientToWorld = (cx: number, cy: number): Pt => {
  const r = surface.value?.getBoundingClientRect();
  return { x: (cx - (r?.left ?? 0) - view.value.x) / view.value.k, y: (cy - (r?.top ?? 0) - view.value.y) / view.value.k };
};

let ro: ResizeObserver | undefined;
onMounted(() => {
  fit(0.25, false);
  if (typeof ResizeObserver !== "undefined" && surface.value) {
    ro = new ResizeObserver(measure);
    ro.observe(surface.value);
  }
});
onBeforeUnmount(() => {
  ro?.disconnect();
  stopGesture?.();
});
watch(previewV, () => setTimeout(() => fit(0.25), 80));

function onWheel(e: WheelEvent) {
  if (locked.value) return;
  e.preventDefault();
  const r = surface.value!.getBoundingClientRect();
  const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
  view.value = zoomAt(view.value, view.value.k * factor, e.clientX - r.left, e.clientY - r.top);
}

/* ---- pointer gestures: pan, drag a node, draw a connection ---- */
let stopGesture: (() => void) | undefined;
let suppressClick = false;
const THRESHOLD = 4;

function track(onMove: (dx: number, dy: number, e: PointerEvent) => void, onEnd: (moved: boolean, e: PointerEvent) => void, start: PointerEvent) {
  stopGesture?.();
  let moved = false;
  const move = (e: PointerEvent) => {
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    if (!moved && Math.hypot(dx, dy) < THRESHOLD) return;
    moved = true;
    onMove(dx, dy, e);
  };
  const up = (e: PointerEvent) => {
    stopGesture?.();
    if (moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
    }
    onEnd(moved, e);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  stopGesture = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    stopGesture = undefined;
  };
}

function onPanStart(e: PointerEvent) {
  if (e.button !== 0 || locked.value) return;
  if ((e.target as HTMLElement).closest("[data-slot=workflow-node],[data-flow-ui]")) return;
  const origin = { ...view.value };
  track(
    (dx, dy) => (view.value = { ...origin, x: origin.x + dx, y: origin.y + dy }),
    () => undefined,
    e,
  );
}

function onNodeDragStart(id: string, e: PointerEvent) {
  if (e.button !== 0 || !editable.value || locked.value) return;
  const n = shown.value.nodes.find((x) => x.id === id);
  if (!n) return;
  const origin = posOf(id, n.position);
  track(
    (dx, dy) => (dragPos.value = { ...dragPos.value, [id]: { x: origin.x + dx / view.value.k, y: origin.y + dy / view.value.k } }),
    (moved) => {
      if (moved) {
        const dropped = dragPos.value[id];
        commit({ ...graph.value, nodes: graph.value.nodes.map((x) => (x.id === id && dropped ? { ...x, position: dropped } : x)) });
      }
      dragPos.value = {};
    },
    e,
  );
}

function onConnectStart(sourceId: string, handle: string | null, e: PointerEvent) {
  if (e.button !== 0 || !editable.value) return;
  const n = shown.value.nodes.find((x) => x.id === sourceId);
  if (!n) return;
  const outs = outputsOf(n.type);
  const i = Math.max(0, outs.findIndex((o) => o.id === (handle ?? "")));
  const from = outputPoint(posOf(sourceId, n.position), nodeHeight(outs.length), props.direction, i, outs.length);
  connecting.value = { sourceId, handle, from, to: from };
  track(
    (_dx, _dy, ev) => {
      if (connecting.value) connecting.value = { ...connecting.value, to: clientToWorld(ev.clientX, ev.clientY) };
    },
    (moved, ev) => {
      connecting.value = null;
      if (!moved) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-node-id]");
      const target = el?.dataset.nodeId;
      if (target) onConnect(sourceId, target, handle);
    },
    e,
  );
}

function onConnect(source: string, target: string, handle: string | null) {
  if (!editable.value) return;
  if (!canConnect(graph.value, typeById.value, source, target, handle)) return;
  if (graph.value.edges.some((e) => e.source === source && e.target === target && (e.sourceHandle ?? null) === handle)) return;
  commit({ ...graph.value, edges: [...graph.value.edges, { id: uid("e"), source, target, sourceHandle: handle }] });
}

/* ---- editing ---- */
const openPicker = (after?: { sourceId: string; sourceHandle?: string | null }) => (panel.value = after ? { kind: "picker", after } : { kind: "picker" });

function onNodeClick(id: string) {
  if (suppressClick) return;
  selectedEdge.value = null;
  panel.value = { kind: "config", id };
}
function onEdgeClick(id: string) {
  if (suppressClick) return;
  selectedEdge.value = id;
}
function onPaneClick(e: MouseEvent) {
  if (suppressClick) return;
  if ((e.target as HTMLElement).closest("[data-slot=workflow-node],[data-flow-ui],[data-edge-id]")) return;
  selectedEdge.value = null;
  if (panel.value?.kind === "config") panel.value = null;
}

function insertOnEdge(id: string) {
  const ed = graph.value.edges.find((x) => x.id === id);
  if (ed) openPicker({ sourceId: ed.source, sourceHandle: ed.sourceHandle ?? null });
}

function pick(type: WorkflowStepType) {
  const after = panel.value?.kind === "picker" ? panel.value.after : undefined;
  const res = addStep(graph.value, typeById.value, type.id, after, props.direction);
  commit(res.graph);
  panel.value = { kind: "config", id: res.id };
  setTimeout(() => fit(0.3), 60);
}
function patchNode(id: string, patch: { label?: string; config?: Record<string, unknown> }) {
  commit({ ...graph.value, nodes: graph.value.nodes.map((n) => (n.id === id ? { ...n, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) } : n)) });
}
function removeNode(id: string) {
  commit(removeNodes(graph.value, [id]));
  panel.value = null;
}
function removeEdge(id: string) {
  commit({ ...graph.value, edges: graph.value.edges.filter((e) => e.id !== id) });
  selectedEdge.value = null;
}
function tidy() {
  const laid = autoLayout(graph.value, props.direction);
  commit({ ...graph.value, nodes: graph.value.nodes.map((n) => ({ ...n, position: laid.get(n.id) ?? n.position ?? { x: 0, y: 0 } })) });
  setTimeout(() => fit(0.25), 60);
}
async function save() {
  if (!props.onSave) return;
  busy.value = "save";
  message.value = null;
  let res: Result;
  try {
    res = await props.onSave(graph.value);
  } finally {
    busy.value = null;
  }
  if (res && res.error) message.value = res.error;
  else dirty.value = false;
}
async function startRun() {
  if (!props.onRun) return;
  busy.value = "run";
  message.value = null;
  let res: Result;
  try {
    res = await props.onRun(graph.value);
  } finally {
    busy.value = null;
  }
  if (res && res.error) message.value = res.error;
}

function onKeyDown(e: KeyboardEvent) {
  if (!editable.value || (e.key !== "Delete" && e.key !== "Backspace")) return;
  const el = e.target as HTMLElement;
  if (el.closest("input, textarea, select, [contenteditable=true], [role=combobox], [data-slot=workflow-side-panel]")) return;
  if (selectedEdge.value) removeEdge(selectedEdge.value);
  else if (panel.value?.kind === "config") removeNode(panel.value.id);
}

/* ---- derived for the template ---- */
const hasTrigger = computed(() => shown.value.nodes.some((n) => typeById.value.get(n.type)?.role === "trigger"));
const pickerTypes = computed(() => props.types.filter((s) => (hasTrigger.value ? s.role !== "trigger" : s.role === "trigger")));
const version = computed(() => props.currentVersion ?? (props.versions?.length ? Math.max(...props.versions.map((v) => v.version)) : 0));
const selectedNode = computed(() => (panel.value?.kind === "config" ? shown.value.nodes.find((n) => n.id === (panel.value as { id: string }).id) : undefined));
const afterName = computed(() => {
  const p = panel.value;
  if (p?.kind !== "picker" || !p.after) return undefined;
  const src = shown.value.nodes.find((n) => n.id === p.after!.sourceId);
  return src ? src.label?.trim() || typeById.value.get(src.type)?.label : undefined;
});
const nextHandle = computed(() => {
  const n = selectedNode.value;
  if (!n) return null;
  return typeById.value.get(n.type)?.outputs?.find((o) => !shown.value.edges.some((e) => e.source === n.id && (e.sourceHandle ?? "") === o.id))?.id ?? null;
});
const nameOf = (i: WorkflowIssue) => {
  const n = shown.value.nodes.find((x) => x.id === i.nodeId);
  return n ? n.label?.trim() || typeById.value.get(n.type)?.label || t.value.unknownType : "";
};
const fieldLabel = (i: WorkflowIssue) => {
  const n = shown.value.nodes.find((x) => x.id === i.nodeId);
  return typeById.value.get(n?.type ?? "")?.fields?.find((f) => f.name === i.field)?.label ?? String(i.field ?? "");
};
const nodeIssues = (id: string) => issues.value.filter((i) => i.nodeId === id);
const usedHandles = (id: string) => shown.value.edges.filter((e) => e.source === id).map((e) => e.sourceHandle ?? "");

/* ---- minimap ---- */
const MINI_W = 160;
const MINI_H = 104;
const miniBox = computed(() => {
  const vp: Bounds = { x: -view.value.x / view.value.k, y: -view.value.y / view.value.k, w: size.value.w / view.value.k, h: size.value.h / view.value.k };
  const all = nodeBounds([...(boxes.value as Bounds[]), ...(size.value.w > 0 ? [vp] : [])]) ?? { x: 0, y: 0, w: 1, h: 1 };
  const pad = Math.max(all.w, all.h) * 0.08;
  return { x: all.x - pad, y: all.y - pad, w: all.w + pad * 2, h: all.h + pad * 2, vp };
});
function onMiniPointer(e: PointerEvent) {
  const el = e.currentTarget as SVGSVGElement;
  const r = el.getBoundingClientRect();
  const b = miniBox.value;
  const s = Math.max(b.w / r.width, b.h / r.height);
  const cx = b.x + b.w / 2 + (e.clientX - r.left - r.width / 2) * s;
  const cy = b.y + b.h / 2 + (e.clientY - r.top - r.height / 2) * s;
  view.value = { ...view.value, x: size.value.w / 2 - cx * view.value.k, y: size.value.h / 2 - cy * view.value.k };
}
const zoomPct = computed(() => fmtNum(Math.round(view.value.k * 100)));
</script>

<template>
  <div
    data-slot="workflow-canvas"
    :dir="ar ? 'rtl' : 'ltr'"
    :style="{ height: typeof props.height === 'number' ? `${props.height}px` : props.height, minHeight: '480px' }"
    :class="cn('relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background', props.class)"
    @keydown="onKeyDown"
  >
    <div role="toolbar" :aria-label="t.canvas" class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
      <h2 v-if="props.title || $slots.title" class="me-2 min-w-0 truncate text-label text-foreground"><slot name="title">{{ props.title }}</slot></h2>
      <NqBadge v-if="dirty" variant="warning">{{ t.unsaved }}</NqBadge>
      <NqBadge v-else-if="props.onSave" variant="neutral">{{ t.saved }}</NqBadge>
      <NqBadge v-if="props.readOnly" variant="neutral">{{ t.readOnly }}</NqBadge>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <template v-if="editable">
          <NqButton variant="secondary" size="sm" :disabled="pickerTypes.length === 0" @click="openPicker()">
            <Plus aria-hidden="true" />
            {{ t.addStep }}
          </NqButton>
          <NqButton variant="ghost" size="sm" :disabled="shown.nodes.length < 2" @click="tidy">
            <Wand2 aria-hidden="true" />
            {{ t.tidy }}
          </NqButton>
        </template>
        <NqPopover>
          <NqPopoverTrigger as-child>
            <NqButton variant="ghost" size="sm" :aria-label="t.validate">
              <ShieldCheck v-if="problems.length === 0" aria-hidden="true" class="text-nq-success-text" />
              <TriangleAlert v-else aria-hidden="true" :class="errorCount ? 'text-nq-danger-text' : 'text-nq-warning-text'" />
              {{ problems.length === 0 ? t.validate : t.problems(fmtNum(problems.length)) }}
            </NqButton>
          </NqPopoverTrigger>
          <NqPopoverContent align="end" class="w-80">
            <p v-if="problems.length === 0" class="flex items-center gap-2 text-body-sm">
              <ShieldCheck aria-hidden="true" class="size-4 text-nq-success-text" />
              {{ t.noProblems }}
            </p>
            <ul v-else class="flex flex-col gap-1" :aria-label="t.validate">
              <li v-for="(i, k) in problems" :key="`${i.code}-${i.nodeId ?? ''}-${k}`">
                <button
                  type="button"
                  :disabled="!i.nodeId"
                  class="flex w-full items-start gap-2 rounded-control p-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent"
                  @click="i.nodeId && (panel = { kind: 'config', id: i.nodeId })"
                >
                  <TriangleAlert aria-hidden="true" :class="cn('mt-0.5 size-4 shrink-0', i.level === 'error' ? 'text-nq-danger-text' : 'text-nq-warning-text')" />
                  <span>{{ t.issue[i.code](nameOf(i), fieldLabel(i)) }}</span>
                </button>
              </li>
            </ul>
          </NqPopoverContent>
        </NqPopover>
        <NqButton v-if="props.runs" :variant="panel?.kind === 'runs' ? 'secondary' : 'ghost'" size="sm" :aria-pressed="panel?.kind === 'runs'" @click="panel = panel?.kind === 'runs' ? null : { kind: 'runs' }">
          <ListChecks aria-hidden="true" />
          {{ t.runs }}
        </NqButton>
        <NqButton v-if="props.versions" :variant="panel?.kind === 'versions' ? 'secondary' : 'ghost'" size="sm" :aria-pressed="panel?.kind === 'versions'" @click="panel = panel?.kind === 'versions' ? null : { kind: 'versions' }">
          <History aria-hidden="true" />
          {{ t.versions }}
        </NqButton>
        <NqButton v-if="props.onSave && editable" variant="secondary" size="sm" :loading="busy === 'save'" :disabled="!dirty || busy !== null" @click="save">
          <Save aria-hidden="true" />
          {{ busy === "save" ? t.saving : t.save }}
        </NqButton>
        <NqButton v-if="props.onRun && !previewing" variant="primary" size="sm" :loading="busy === 'run'" :disabled="errorCount > 0 || busy !== null" :title="errorCount > 0 ? t.runBlocked : undefined" @click="startRun">
          <Play aria-hidden="true" />
          {{ t.run }}
        </NqButton>
      </div>
    </div>
    <p v-if="message" role="alert" class="border-b border-border bg-nq-danger-soft px-3 py-1.5 text-body-sm text-nq-danger-text">{{ message }}</p>
    <div v-if="previewV" role="status" class="flex flex-wrap items-center gap-2 border-b border-border bg-nq-info-soft px-3 py-1.5 text-body-sm text-nq-info-text">
      {{ t.previewing(fmtNum(previewV.version)) }}
      <NqButton variant="ghost" size="sm" class="ms-auto" @click="previewV = null">{{ t.exitPreview }}</NqButton>
    </div>
    <div v-if="run" role="status" class="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-3 py-1.5 text-body-sm">
      <NqWorkflowStatusGlyph :status="run.status" />
      <span>{{ t.status[run.status] }}</span>
      <span v-if="baseRun?.durationMs !== undefined && cursor === null" class="text-muted-foreground"><bdi>{{ formatDuration(baseRun.durationMs) }}</bdi></span>
      <span v-if="cursor !== null" class="text-muted-foreground"><bdi>{{ fmtNum(Math.min(cursor + 1, order.length)) }} / {{ fmtNum(order.length) }}</bdi></span>
    </div>

    <div class="relative min-h-0 flex-1" dir="ltr">
      <div
        ref="surface"
        data-slot="workflow-surface"
        role="application"
        :aria-label="t.canvas"
        :class="cn('absolute inset-0 touch-none overflow-hidden bg-background', locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')"
        :style="{ backgroundImage: 'radial-gradient(circle, var(--nq-line) 1.2px, transparent 1.2px)', backgroundSize: `${20 * view.k}px ${20 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }"
        @pointerdown="onPanStart"
        @click="onPaneClick"
        @wheel="onWheel"
      >
        <div :class="cn('absolute left-0 top-0 origin-top-left', animate && 'transition-transform duration-200')" :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }">
          <svg class="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden="true">
            <defs>
              <marker v-for="(c, tone) in STROKE" :id="`${markerId}-${tone}`" :key="tone" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 z" :fill="c" />
              </marker>
            </defs>
            <g v-for="e in drawnEdges" :key="e.id" :data-edge-id="e.id" data-slot="workflow-edge" :data-selected="e.selected || undefined">
              <path
                :d="e.path"
                fill="none"
                :stroke="e.selected ? 'var(--nq-focus)' : STROKE[e.tone as keyof typeof STROKE]"
                stroke-width="1.5"
                :stroke-dasharray="e.live ? '6 4' : undefined"
                :class="e.live ? 'nq-edge-live' : undefined"
                :marker-end="`url(#${markerId}-${e.tone})`"
              />
              <path
                :d="e.path"
                fill="none"
                stroke="transparent"
                stroke-width="24"
                class="cursor-pointer"
                style="pointer-events: stroke"
                @pointerenter="hoverEdge = e.id"
                @pointerleave="hoverEdge = null"
                @click.stop="onEdgeClick(e.id)"
              />
            </g>
            <path v-if="connecting" :d="connectPath" fill="none" stroke="var(--nq-focus)" stroke-width="1.5" stroke-dasharray="4 3" />
          </svg>
          <template v-for="e in drawnEdges" :key="`l-${e.id}`">
            <div
              v-if="e.text || e.showInsert"
              data-flow-ui
              class="absolute flex items-center gap-1"
              :style="{ left: `${e.mid.x}px`, top: `${e.mid.y}px`, transform: 'translate(-50%, -50%)', pointerEvents: e.showInsert ? 'auto' : 'none' }"
              @pointerenter="hoverEdge = e.id"
              @pointerleave="hoverEdge = null"
            >
              <span v-if="e.text && !e.showInsert" class="rounded-full border border-border bg-card px-1.5 text-caption text-muted-foreground"><bdi>{{ e.text }}</bdi></span>
              <button
                v-if="e.showInsert"
                type="button"
                data-slot="workflow-edge-insert"
                :aria-label="t.insertHere"
                :title="t.insertHere"
                class="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click.stop="insertOnEdge(e.id)"
              >
                <Plus class="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </template>
          <div v-for="n in shown.nodes" :key="n.id" class="absolute" :style="{ left: `${posOf(n.id, n.position).x}px`, top: `${posOf(n.id, n.position).y}px` }">
            <NqWorkflowStepNode
              :node="n"
              :type="typeById.get(n.type)"
              :issues="nodeIssues(n.id)"
              :run="run?.nodes[n.id]"
              :used-handles="usedHandles(n.id)"
              :selected="panel?.kind === 'config' && panel.id === n.id"
              :editable="editable"
              :direction="props.direction"
              :rtl="ar"
              :t="t"
              :format-duration="formatDuration"
              :format-number="formatNumber"
              @select="onNodeClick(n.id)"
              @add="(h) => openPicker({ sourceId: n.id, sourceHandle: h })"
              @connect-start="(h, ev) => onConnectStart(n.id, h, ev)"
              @drag-start="(ev) => onNodeDragStart(n.id, ev)"
            />
          </div>
        </div>
      </div>

      <div data-flow-ui class="absolute bottom-3 left-3 z-[5] flex items-end gap-2">
        <div class="flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" :aria-label="t.canvas">
          <NqButton variant="ghost" size="icon-sm" class="rounded-none" :aria-label="t.zoomIn" :title="t.zoomIn" @click="zoomBy(1.25)"><Plus aria-hidden="true" /></NqButton>
          <NqButton variant="ghost" size="icon-sm" class="rounded-none border-t border-border" :aria-label="t.zoomOut" :title="t.zoomOut" @click="zoomBy(0.8)"><Minus aria-hidden="true" /></NqButton>
          <NqButton variant="ghost" size="icon-sm" class="rounded-none border-t border-border" :aria-label="t.fit" :title="t.fit" @click="fit(0.25)"><Maximize2 aria-hidden="true" /></NqButton>
          <NqButton variant="ghost" size="icon-sm" class="rounded-none border-t border-border" :aria-label="locked ? t.unlock : t.lock" :aria-pressed="locked" :title="locked ? t.unlock : t.lock" @click="locked = !locked">
            <Lock v-if="locked" aria-hidden="true" />
            <LockOpen v-else aria-hidden="true" />
          </NqButton>
        </div>
        <span class="rounded-control border border-border bg-card px-2 py-1 text-caption text-muted-foreground tabular-nums" aria-hidden="true"><bdi>{{ zoomPct }}%</bdi></span>
      </div>
      <svg
        data-flow-ui
        data-slot="workflow-minimap"
        role="img"
        :aria-label="t.minimap"
        :width="MINI_W"
        :height="MINI_H"
        :viewBox="`${miniBox.x} ${miniBox.y} ${miniBox.w} ${miniBox.h}`"
        preserveAspectRatio="xMidYMid meet"
        class="absolute bottom-3 right-3 z-[5] cursor-pointer rounded-control border border-border bg-card shadow-xs max-sm:hidden"
        @pointerdown.stop="onMiniPointer"
      >
        <rect v-for="b in boxes" :key="b.id" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="8" :fill="minimapColor(b.status)" />
        <rect
          v-if="size.w > 0"
          :x="miniBox.vp.x"
          :y="miniBox.vp.y"
          :width="miniBox.vp.w"
          :height="miniBox.vp.h"
          fill="color-mix(in oklab, var(--nq-bg) 70%, transparent)"
          fill-rule="evenodd"
          stroke="var(--nq-focus)"
          :stroke-width="miniBox.w / MINI_W"
        />
      </svg>

      <div v-if="shown.nodes.length === 0" class="pointer-events-none absolute inset-0 flex items-center justify-center p-6" :dir="ar ? 'rtl' : 'ltr'">
        <div class="pointer-events-auto flex max-w-xs flex-col items-center gap-3 text-center">
          <p class="text-body-sm text-muted-foreground">{{ t.issue.empty() }}</p>
          <NqButton v-if="editable" variant="primary" @click="openPicker()">
            <Plus aria-hidden="true" />
            {{ t.addStep }}
          </NqButton>
        </div>
      </div>

      <aside v-if="panel" data-slot="workflow-side-panel" :aria-label="t.canvas" :dir="ar ? 'rtl' : 'ltr'" class="absolute inset-y-0 end-0 z-10 flex w-full max-w-sm flex-col border-s border-border bg-card shadow-floating">
        <NqWorkflowNodePicker v-if="panel.kind === 'picker'" :types="pickerTypes" :categories="props.categories" :after-name="afterName" :labels="props.labels" @pick="pick" @close="panel = null" />
        <NqWorkflowConfigPanel
          v-else-if="panel.kind === 'config' && selectedNode"
          :key="selectedNode.id"
          :node="selectedNode"
          :type="typeById.get(selectedNode.type)"
          :issues="nodeIssues(selectedNode.id)"
          :run="run?.nodes[selectedNode.id]"
          :read-only="!editable"
          :can-remove="editable"
          :can-add-next="editable"
          :labels="props.labels"
          :format-duration="formatDuration"
          @change="(patch) => patchNode(selectedNode!.id, patch)"
          @remove="removeNode(selectedNode.id)"
          @add-next="openPicker({ sourceId: selectedNode.id, sourceHandle: nextHandle })"
          @close="panel = null"
        />
        <NqWorkflowRunsPanel
          v-else-if="panel.kind === 'runs' && props.runs"
          :runs="props.runs"
          :selected-id="runId"
          :replaying="cursor !== null"
          :format-duration="formatDuration"
          :labels="props.labels"
          @select="(id) => { runId = id; cursor = null; }"
          @replay="cursor = 0"
          @stop-replay="cursor = null"
          @close="panel = null"
        />
        <NqWorkflowVersionsPanel
          v-else-if="panel.kind === 'versions' && props.versions"
          :versions="props.versions"
          :current-version="version"
          :previewing="previewV?.version ?? null"
          :can-restore="editable || previewing"
          :on-restore="props.onRestoreVersion"
          :labels="props.labels"
          @preview="(v) => (previewV = v)"
          @close="panel = null"
        />
      </aside>
    </div>
  </div>
</template>
