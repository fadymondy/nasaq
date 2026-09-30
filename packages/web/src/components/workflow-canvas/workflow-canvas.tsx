"use client";

import "@xyflow/react/dist/base.css";
import {
  applyNodeChanges,
  Background,
  type Connection,
  type Edge,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { History, ListChecks, Play, Plus, Save, ShieldCheck, TriangleAlert, Wand2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { useFormatNumber } from "../numeric";
import { CanvasContext, type CanvasContextValue, CanvasControls, FlowEdge, type FlowEdgeData, StatusGlyph, StepNode, type StepFlowNode } from "./canvas-parts";
import { type WorkflowCanvasLabels, useCanvasLabels } from "./canvas-labels";
import { WorkflowConfigPanel } from "./config-panel";
import { WorkflowNodePicker } from "./node-picker";
import { WorkflowRunsPanel } from "./runs-panel";
import { WorkflowVersionsPanel } from "./versions-panel";
import {
  addStep,
  autoLayout,
  canConnect,
  NODE_HEIGHT,
  NODE_WIDTH,
  removeNodes,
  runAtStep,
  runOrder,
  typeMap,
  uid,
  validateWorkflow,
  type WorkflowDirection,
  type WorkflowGraph,
  type WorkflowIssue,
  type WorkflowRun,
  type WorkflowStepType,
  type WorkflowVersion,
  withPositions,
} from "./workflow-model";

type Result = void | { error?: string };

export interface WorkflowCanvasProps {
  /** The workflow. The canvas keeps its own working copy and adopts a new `value` when the prop changes. */
  value: WorkflowGraph;
  /** Every structural change (add, remove, connect, config) and every drag stop. */
  onChange?: (graph: WorkflowGraph) => void;
  /** The step types that can be added. Triggers are offered first when the graph has none. */
  types: WorkflowStepType[];
  /** Group headings for the node picker, in order. */
  categories?: { id: string; label: string }[];
  /** Shown on the left of the toolbar: the workflow's name. */
  title?: ReactNode;
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
  /** Flow direction. Default "horizontal". */
  direction?: WorkflowDirection;
  /** No editing: nodes can be selected and inspected, the toolbar hides its edit actions. */
  readOnly?: boolean;
  /** Start with an execution drawn on the canvas. */
  defaultRunId?: string | null;
  /** Height of the canvas. Default fills the parent (`100%`), with a 480px minimum. */
  height?: number | string;
  labels?: Partial<WorkflowCanvasLabels>;
  className?: string;
}

const NODE_TYPES: NodeTypes = { step: StepNode } as NodeTypes;
const EDGE_TYPES: EdgeTypes = { flow: FlowEdge } as EdgeTypes;

type Panel = { kind: "picker"; after?: { sourceId: string; sourceHandle?: string | null } } | { kind: "config"; id: string } | { kind: "runs" } | { kind: "versions" } | null;

/**
 * An editable workflow: nodes with a status, a "what happens next" picker, a side panel to configure each
 * step, a minimap, zoom controls, validation, and an execution overlay that draws how a past run went (and
 * replays it). Built on @xyflow/react and themed with Nasaq tokens.
 *
 * The canvas itself stays left-to-right in Arabic, like a diagram; the toolbar, panels and node text follow
 * the page's direction, and every string comes in English and Arabic.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  value,
  onChange,
  types,
  categories,
  title,
  runs,
  versions,
  currentVersion,
  onSave,
  onRun,
  onRestoreVersion,
  direction = "horizontal",
  readOnly = false,
  defaultRunId = null,
  height = "100%",
  labels,
  className,
}: WorkflowCanvasProps) {
  const { t, ar } = useCanvasLabels(labels);
  const fmtNum = useFormatNumber();
  const flow = useReactFlow();
  const typeById = useMemo(() => typeMap(types), [types]);

  const [graph, setGraph] = useState<WorkflowGraph>(() => withPositions(value, direction));
  const lastEmitted = useRef<WorkflowGraph | null>(null);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    setGraph(withPositions(value, direction));
    setDirty(false);
  }, [value, direction]);

  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(defaultRunId);
  const [cursor, setCursor] = useState<number | null>(null);
  const [previewV, setPreviewV] = useState<WorkflowVersion | null>(null);
  const [flowNodes, setFlowNodes] = useState<StepFlowNode[]>([]);

  const previewing = previewV !== null;
  const editable = !readOnly && !previewing;
  const shown: WorkflowGraph = useMemo(() => (previewV ? withPositions(previewV.graph, direction) : graph), [previewV, graph, direction]);
  const issues = useMemo(() => validateWorkflow(shown, typeById), [shown, typeById]);
  const errorCount = issues.filter((i) => i.level === "error").length;

  const baseRun = runId ? runs?.find((r) => r.id === runId) : undefined;
  const run = useMemo(() => (baseRun && cursor !== null ? runAtStep(shown, baseRun, cursor) : baseRun), [baseRun, cursor, shown]);
  const order = useMemo(() => (baseRun ? runOrder(shown, baseRun) : []), [baseRun, shown]);

  // Replay: step through the order the nodes ran in.
  useEffect(() => {
    if (cursor === null) return;
    if (cursor > order.length) {
      setCursor(null);
      return;
    }
    const id = window.setTimeout(() => setCursor((c) => (c === null ? null : c + 1)), 650);
    return () => window.clearTimeout(id);
  }, [cursor, order.length]);

  const formatDuration = useCallback(
    (ms: number) => (ms < 1000 ? t.milliseconds(fmtNum(Math.round(ms))) : ms < 60_000 ? t.seconds(fmtNum(ms / 1000, { maximumFractionDigits: 1 })) : t.minutes(fmtNum(ms / 60_000, { maximumFractionDigits: 1 }))),
    [t, fmtNum],
  );

  const commit = useCallback(
    (next: WorkflowGraph) => {
      setGraph(next);
      setDirty(true);
      setMessage(null);
      lastEmitted.current = next;
      onChange?.(next);
    },
    [onChange],
  );

  /* ---- RF nodes/edges derived from the graph ---- */
  useEffect(() => {
    setFlowNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      const selectedId = panel?.kind === "config" ? panel.id : null;
      return shown.nodes.map((n) => {
        const before = old.get(n.id);
        const nodeIssues = issues.filter((i) => i.nodeId === n.id);
        const used = shown.edges.filter((e) => e.source === n.id).map((e) => e.sourceHandle ?? "");
        const dragging = before?.dragging;
        return {
          id: n.id,
          type: "step",
          position: dragging && before ? before.position : (n.position ?? { x: 0, y: 0 }),
          data: { node: n, issues: nodeIssues, run: run?.nodes[n.id], usedHandles: used },
          selected: selectedId === n.id,
          draggable: editable && !locked,
          connectable: editable,
          deletable: false,
          ...(before?.measured ? { measured: before.measured } : {}),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        } satisfies StepFlowNode;
      });
    });
  }, [shown, issues, run, panel, editable, locked]);

  const edges = useMemo<Edge[]>(
    () =>
      shown.edges.map((e) => {
        const src = run?.nodes[e.source];
        const dst = run?.nodes[e.target];
        const ran = Boolean(src && dst);
        const data: FlowEdgeData = {
          label: e.label ?? (typeById.get(shown.nodes.find((n) => n.id === e.source)?.type ?? "")?.outputs?.find((o) => o.id === (e.sourceHandle ?? ""))?.label || undefined),
          ...(run && src?.items !== undefined && ran ? { items: src.items } : {}),
          hover: hoverEdge === e.id,
          insertable: editable,
        };
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          type: "flow",
          data,
          selected: selectedEdge === e.id,
          className: run && src?.status === "success" && dst?.status === "running" ? "nq-edge-live" : undefined,
          style: { stroke: run ? (ran ? "var(--nq-success)" : "var(--nq-line)") : "var(--nq-line-strong)", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: run ? (ran ? "var(--nq-success)" : "var(--nq-line)") : "var(--nq-line-strong)" },
        } satisfies Edge;
      }),
    [shown, run, hoverEdge, selectedEdge, editable, typeById],
  );

  /* ---- editing ---- */
  const openPicker = useCallback((after?: { sourceId: string; sourceHandle?: string | null }) => setPanel(after ? { kind: "picker", after } : { kind: "picker" }), []);

  const onAddAfter = useCallback((sourceId: string, sourceHandle?: string | null) => openPicker({ sourceId, sourceHandle }), [openPicker]);
  const onInsertOnEdge = useCallback(
    (edgeId: string) => {
      const e = graph.edges.find((x) => x.id === edgeId);
      if (e) openPicker({ sourceId: e.source, sourceHandle: e.sourceHandle ?? null });
    },
    [graph.edges, openPicker],
  );

  function pick(type: WorkflowStepType) {
    const after = panel?.kind === "picker" ? panel.after : undefined;
    const res = addStep(graph, typeById, type.id, after, direction);
    commit(res.graph);
    setPanel({ kind: "config", id: res.id });
    window.setTimeout(() => void flow.fitView({ padding: 0.3, maxZoom: 1, duration: 250 }), 60);
  }

  function patchNode(id: string, patch: { label?: string; config?: Record<string, unknown> }) {
    commit({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) } : n)) });
  }

  function removeNode(id: string) {
    commit(removeNodes(graph, [id]));
    setPanel(null);
  }

  function removeEdge(id: string) {
    commit({ ...graph, edges: graph.edges.filter((e) => e.id !== id) });
    setSelectedEdge(null);
  }

  function onConnect(c: Connection) {
    if (!editable || !c.source || !c.target) return;
    if (!canConnect(graph, typeById, c.source, c.target, c.sourceHandle)) return;
    if (graph.edges.some((e) => e.source === c.source && e.target === c.target && (e.sourceHandle ?? null) === (c.sourceHandle ?? null))) return;
    commit({ ...graph, edges: [...graph.edges, { id: uid("e"), source: c.source, target: c.target, sourceHandle: c.sourceHandle ?? null }] });
  }

  function onNodesChange(changes: NodeChange<StepFlowNode>[]) {
    setFlowNodes((prev) => applyNodeChanges(changes, prev));
  }

  function tidy() {
    const laid = autoLayout(graph, direction);
    commit({ ...graph, nodes: graph.nodes.map((n) => ({ ...n, position: laid.get(n.id) ?? n.position ?? { x: 0, y: 0 } })) });
    window.setTimeout(() => void flow.fitView({ padding: 0.25, maxZoom: 1, duration: 300 }), 60);
  }

  async function save() {
    if (!onSave) return;
    setBusy("save");
    setMessage(null);
    const res = await onSave(graph);
    setBusy(null);
    if (res && res.error) setMessage(res.error);
    else setDirty(false);
  }

  async function startRun() {
    if (!onRun) return;
    setBusy("run");
    setMessage(null);
    const res = await onRun(graph);
    setBusy(null);
    if (res && res.error) setMessage(res.error);
  }

  const ctx = useMemo<CanvasContextValue>(
    () => ({ types: typeById, t, rtl: ar, direction, editable, onAddAfter, onInsertOnEdge, formatDuration, formatNumber: (n: number) => fmtNum(n) }),
    [typeById, t, ar, direction, editable, onAddAfter, onInsertOnEdge, formatDuration, fmtNum],
  );

  const hasTrigger = shown.nodes.some((n) => typeById.get(n.type)?.role === "trigger");
  const pickerTypes = useMemo(() => types.filter((s) => (hasTrigger ? s.role !== "trigger" : s.role === "trigger")), [types, hasTrigger]);
  const version = currentVersion ?? (versions?.length ? Math.max(...versions.map((v) => v.version)) : 0);
  const selectedNode = panel?.kind === "config" ? shown.nodes.find((n) => n.id === panel.id) : undefined;
  const afterName = (() => {
    if (panel?.kind !== "picker" || !panel.after) return undefined;
    const src = shown.nodes.find((n) => n.id === (panel.after as { sourceId: string }).sourceId);
    return src ? src.label?.trim() || typeById.get(src.type)?.label : undefined;
  })();

  // Fit when the graph shown swaps wholesale (version preview on/off).
  useEffect(() => {
    const id = window.setTimeout(() => void flow.fitView({ padding: 0.25, maxZoom: 1, duration: 200 }), 80);
    return () => window.clearTimeout(id);
  }, [previewV, flow]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editable || (e.key !== "Delete" && e.key !== "Backspace")) return;
    const el = e.target as HTMLElement;
    if (el.closest("input, textarea, select, [contenteditable=true], [role=combobox], [data-slot=workflow-side-panel]")) return;
    if (selectedEdge) removeEdge(selectedEdge);
    else if (panel?.kind === "config") removeNode(panel.id);
  }

  const problems = issues.filter((i) => i.level === "error" || i.level === "warning");
  const nameOf = (i: WorkflowIssue) => {
    const n = shown.nodes.find((x) => x.id === i.nodeId);
    if (!n) return "";
    return n.label?.trim() || typeById.get(n.type)?.label || t.unknownType;
  };
  const fieldLabel = (i: WorkflowIssue) => {
    const n = shown.nodes.find((x) => x.id === i.nodeId);
    return typeById.get(n?.type ?? "")?.fields?.find((f) => f.name === i.field)?.label ?? String(i.field ?? "");
  };

  return (
    <CanvasContext value={ctx}>
      <div data-slot="workflow-canvas" dir={ar ? "rtl" : "ltr"} style={{ height, minHeight: 480 }} className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background", className)} onKeyDown={onKeyDown}>
        {/* toolbar */}
        <div role="toolbar" aria-label={t.canvas} className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          {title ? <h2 className="me-2 min-w-0 truncate text-label text-foreground">{title}</h2> : null}
          {dirty ? <Badge variant="warning">{t.unsaved}</Badge> : onSave ? <Badge variant="neutral">{t.saved}</Badge> : null}
          {readOnly ? <Badge variant="neutral">{t.readOnly}</Badge> : null}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {editable ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => openPicker()} disabled={pickerTypes.length === 0}>
                  <Plus aria-hidden />
                  {t.addStep}
                </Button>
                <Button variant="ghost" size="sm" onClick={tidy} disabled={shown.nodes.length < 2}>
                  <Wand2 aria-hidden />
                  {t.tidy}
                </Button>
              </>
            ) : null}
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="sm" aria-label={t.validate} />}>
                {problems.length === 0 ? <ShieldCheck aria-hidden className="text-nq-success-text" /> : <TriangleAlert aria-hidden className={errorCount ? "text-nq-danger-text" : "text-nq-warning-text"} />}
                {problems.length === 0 ? t.validate : t.problems(fmtNum(problems.length))}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                {problems.length === 0 ? (
                  <p className="flex items-center gap-2 text-body-sm">
                    <ShieldCheck aria-hidden className="size-4 text-nq-success-text" />
                    {t.noProblems}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1" aria-label={t.validate}>
                    {problems.map((i, k) => (
                      <li key={`${i.code}-${i.nodeId ?? ""}-${k}`}>
                        <button
                          type="button"
                          disabled={!i.nodeId}
                          onClick={() => i.nodeId && setPanel({ kind: "config", id: i.nodeId })}
                          className="flex w-full items-start gap-2 rounded-control p-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent"
                        >
                          <TriangleAlert aria-hidden className={cn("mt-0.5 size-4 shrink-0", i.level === "error" ? "text-nq-danger-text" : "text-nq-warning-text")} />
                          <span>{t.issue[i.code](nameOf(i), fieldLabel(i))}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            {runs ? (
              <Button variant={panel?.kind === "runs" ? "secondary" : "ghost"} size="sm" aria-pressed={panel?.kind === "runs"} onClick={() => setPanel(panel?.kind === "runs" ? null : { kind: "runs" })}>
                <ListChecks aria-hidden />
                {t.runs}
              </Button>
            ) : null}
            {versions ? (
              <Button variant={panel?.kind === "versions" ? "secondary" : "ghost"} size="sm" aria-pressed={panel?.kind === "versions"} onClick={() => setPanel(panel?.kind === "versions" ? null : { kind: "versions" })}>
                <History aria-hidden />
                {t.versions}
              </Button>
            ) : null}
            {onSave && editable ? (
              <Button variant="secondary" size="sm" loading={busy === "save"} disabled={!dirty || busy !== null} onClick={() => void save()}>
                <Save aria-hidden />
                {busy === "save" ? t.saving : t.save}
              </Button>
            ) : null}
            {onRun && !previewing ? (
              <Button variant="primary" size="sm" loading={busy === "run"} disabled={errorCount > 0 || busy !== null} title={errorCount > 0 ? t.runBlocked : undefined} onClick={() => void startRun()}>
                <Play aria-hidden />
                {t.run}
              </Button>
            ) : null}
          </div>
        </div>
        {message ? (
          <p role="alert" className="border-b border-border bg-nq-danger-soft px-3 py-1.5 text-body-sm text-nq-danger-text">
            {message}
          </p>
        ) : null}
        {previewV ? (
          <div role="status" className="flex flex-wrap items-center gap-2 border-b border-border bg-nq-info-soft px-3 py-1.5 text-body-sm text-nq-info-text">
            {t.previewing(fmtNum(previewV.version))}
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setPreviewV(null)}>
              {t.exitPreview}
            </Button>
          </div>
        ) : null}
        {run ? (
          <div role="status" className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-3 py-1.5 text-body-sm">
            <StatusGlyph status={run.status} />
            <span>{t.status[run.status]}</span>
            {baseRun?.durationMs !== undefined && cursor === null ? <span className="text-muted-foreground"><bdi>{formatDuration(baseRun.durationMs)}</bdi></span> : null}
            {cursor !== null ? <span className="text-muted-foreground"><bdi>{fmtNum(Math.min(cursor + 1, order.length))} / {fmtNum(order.length)}</bdi></span> : null}
          </div>
        ) : null}

        {/* canvas */}
        <div className="relative min-h-0 flex-1" dir="ltr">
          <ReactFlow
            className="nq-flow"
            nodes={flowNodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            isValidConnection={(c) => Boolean(c.source && c.target && canConnect(graph, typeById, c.source, c.target, c.sourceHandle))}
            onNodeClick={(_, n) => {
              setSelectedEdge(null);
              setPanel({ kind: "config", id: n.id });
            }}
            onEdgeClick={(_, e) => setSelectedEdge(e.id)}
            onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
            onEdgeMouseLeave={() => setHoverEdge(null)}
            onPaneClick={() => {
              setSelectedEdge(null);
              if (panel?.kind === "config") setPanel(null);
            }}
            onNodeDragStop={(_, __, all) => {
              if (!editable) return;
              const pos = new Map(all.map((n) => [n.id, n.position]));
              commit({ ...graph, nodes: graph.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position ?? { x: 0, y: 0 } })) });
            }}
            deleteKeyCode={null}
            nodesDraggable={editable && !locked}
            nodesConnectable={editable}
            panOnDrag={!locked}
            zoomOnScroll={!locked}
            zoomOnPinch={!locked}
            zoomOnDoubleClick={false}
            minZoom={0.3}
            maxZoom={1.6}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            proOptions={{ hideAttribution: false }}
            attributionPosition="bottom-center"
            aria-label={t.canvas}
          >
            <Background gap={20} size={1.2} />
            <MiniMap
              pannable
              zoomable
              ariaLabel={t.minimap}
              className="max-sm:!hidden"
              nodeColor={(n) => {
                const s = (n.data as { run?: { status?: string } } | undefined)?.run?.status;
                return s === "success" ? "var(--nq-success)" : s === "error" ? "var(--nq-danger)" : s === "running" ? "var(--nq-info)" : "var(--nq-line-strong)";
              }}
              maskColor="color-mix(in oklab, var(--nq-bg) 70%, transparent)"
            />
            <CanvasControls locked={locked} onToggleLock={() => setLocked((v) => !v)} />
          </ReactFlow>
          {shown.nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6" dir={ar ? "rtl" : "ltr"}>
              <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 text-center">
                <p className="text-body-sm text-muted-foreground">{t.issue.empty()}</p>
                {editable ? (
                  <Button variant="primary" onClick={() => openPicker()}>
                    <Plus aria-hidden />
                    {t.addStep}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {panel ? (
            <aside
              data-slot="workflow-side-panel"
              aria-label={t.canvas}
              dir={ar ? "rtl" : "ltr"}
              className="absolute inset-y-0 end-0 z-10 flex w-full max-w-sm flex-col border-s border-border bg-card shadow-floating"
            >
              {panel.kind === "picker" ? (
                <WorkflowNodePicker types={pickerTypes} categories={categories} afterName={afterName} onPick={pick} onClose={() => setPanel(null)} labels={labels} />
              ) : panel.kind === "config" && selectedNode ? (
                <WorkflowConfigPanel
                  key={selectedNode.id}
                  node={selectedNode}
                  type={typeById.get(selectedNode.type)}
                  issues={issues.filter((i) => i.nodeId === selectedNode.id)}
                  run={run?.nodes[selectedNode.id]}
                  readOnly={!editable}
                  onChange={(patch) => patchNode(selectedNode.id, patch)}
                  onRemove={editable ? () => removeNode(selectedNode.id) : undefined}
                  onAddNext={editable ? () => openPicker({ sourceId: selectedNode.id, sourceHandle: typeById.get(selectedNode.type)?.outputs?.find((o) => !shown.edges.some((e) => e.source === selectedNode.id && (e.sourceHandle ?? "") === o.id))?.id ?? null }) : undefined}
                  onClose={() => setPanel(null)}
                  labels={labels}
                  formatDuration={formatDuration}
                />
              ) : panel.kind === "runs" && runs ? (
                <WorkflowRunsPanel
                  runs={runs}
                  selectedId={runId}
                  onSelect={(id) => {
                    setRunId(id);
                    setCursor(null);
                  }}
                  replaying={cursor !== null}
                  onReplay={() => setCursor(0)}
                  onStopReplay={() => setCursor(null)}
                  onClose={() => setPanel(null)}
                  formatDuration={formatDuration}
                  labels={labels}
                />
              ) : panel.kind === "versions" && versions ? (
                <WorkflowVersionsPanel
                  versions={versions}
                  currentVersion={version}
                  previewing={previewV?.version ?? null}
                  canRestore={editable || previewing}
                  onPreview={setPreviewV}
                  onRestore={onRestoreVersion}
                  onClose={() => setPanel(null)}
                  labels={labels}
                />
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </CanvasContext>
  );
}
