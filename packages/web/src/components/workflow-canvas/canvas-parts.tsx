"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, Handle, type Node, type NodeProps, Panel, Position, useReactFlow, useStore } from "@xyflow/react";
import { CircleAlert, Lock, LockOpen, Maximize2, Minus, Plus, TriangleAlert } from "lucide-react";
import { createContext, type ReactNode, use } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import type { WorkflowCanvasLabels } from "./canvas-labels";
import { StatusGlyph } from "./status-glyph";
import type { WorkflowDirection, WorkflowIssue, WorkflowNodeData, WorkflowNodeRun, WorkflowStatus, WorkflowStepType } from "./workflow-model";
import { NODE_HEIGHT, NODE_WIDTH } from "./workflow-model";

/** What the custom nodes and edges need from the canvas. Kept in context so `nodeTypes` stays stable. */
export interface CanvasContextValue {
  types: Map<string, WorkflowStepType>;
  t: WorkflowCanvasLabels;
  rtl: boolean;
  direction: WorkflowDirection;
  editable: boolean;
  onAddAfter: (sourceId: string, sourceHandle?: string | null) => void;
  onInsertOnEdge: (edgeId: string) => void;
  formatDuration: (ms: number) => string;
  formatNumber: (n: number) => string;
}

export const CanvasContext = createContext<CanvasContextValue | null>(null);
export function useCanvas(): CanvasContextValue {
  const ctx = use(CanvasContext);
  if (!ctx) throw new Error("Workflow canvas parts must be rendered inside <WorkflowCanvas>");
  return ctx;
}

/* ------------------------------------------------------------------ status */

export { StatusGlyph };

const STATUS_BORDER: Record<WorkflowStatus, string> = {
  idle: "border-border",
  running: "border-nq-info",
  success: "border-nq-success",
  error: "border-nq-danger",
  skipped: "border-border border-dashed",
  waiting: "border-nq-warning",
};

/* ------------------------------------------------------------------ node */

export interface StepNodeData extends Record<string, unknown> {
  node: WorkflowNodeData;
  issues: WorkflowIssue[];
  run?: WorkflowNodeRun;
  /** Output handle ids that already lead somewhere. */
  usedHandles: string[];
}
export type StepFlowNode = Node<StepNodeData, "step">;

const HANDLE_CLASS = "!size-2.5 !min-h-0 !min-w-0 !border !border-nq-line-strong !bg-card";

export function firstFilled(node: WorkflowNodeData, type: WorkflowStepType | undefined): string | undefined {
  for (const f of type?.fields ?? []) {
    const v = node.config[f.name];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { types, t, rtl, direction, editable, onAddAfter, formatDuration, formatNumber } = useCanvas();
  const { node, issues, run, usedHandles } = data;
  const type = types.get(node.type);
  const Icon = type?.icon ?? CircleAlert;
  const horizontal = direction === "horizontal";
  const trigger = type?.role === "trigger";
  const outputs = type?.outputs?.length ? type.outputs : [{ id: "", label: "" }];
  const branching = outputs.length > 1;
  const status = run?.status ?? "idle";
  const title = node.label?.trim() || type?.label || t.unknownType;
  const subtitle = firstFilled(node, type) ?? (node.label ? type?.label : type?.description) ?? "";
  const errors = issues.filter((i) => i.level === "error");
  const detail = run
    ? [run.durationMs !== undefined ? formatDuration(run.durationMs) : null, run.items !== undefined ? `${formatNumber(run.items)} ${t.items.toLowerCase()}` : null].filter(Boolean).join(" · ")
    : "";
  const statusText = run ? t.status[status] : undefined;
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      data-slot="workflow-node"
      data-status={status}
      data-selected={selected || undefined}
      data-type={node.type}
      style={{ width: NODE_WIDTH, minHeight: branching ? Math.max(NODE_HEIGHT, outputs.length * 34 + 12) : NODE_HEIGHT }}
      className={cn(
        "relative flex items-center gap-3 rounded-card border bg-card px-3 py-2.5 text-start text-foreground shadow-xs transition-colors",
        STATUS_BORDER[status],
        trigger && "rounded-s-[28px]",
        selected && "outline-2 outline-offset-2 outline-nq-focus",
        status === "running" && "shadow-[0_0_0_3px_color-mix(in_oklab,var(--nq-info)_18%,transparent)]",
        errors.length > 0 && status === "idle" && "border-nq-danger/60",
      )}
    >
      {!trigger ? <Handle type="target" position={horizontal ? Position.Left : Position.Top} isConnectable={editable} className={HANDLE_CLASS} /> : null}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4">
        <Icon aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label" title={title}>
          {title}
        </span>
        <span className="block truncate text-caption text-muted-foreground" title={subtitle}>
          {subtitle}
        </span>
        {detail ? (
          <span className="block truncate text-caption text-muted-foreground">
            <bdi>{detail}</bdi>
          </span>
        ) : null}
      </span>
      {run ? <StatusGlyph status={status} label={statusText} /> : null}
      {!run && issues.length > 0 ? (
        <span role="img" aria-label={errors.length ? t.issue[(errors[0] as WorkflowIssue).code](title, String((errors[0] as WorkflowIssue).field ?? "")) : t.issue[(issues[0] as WorkflowIssue).code](title, "")}>
          {errors.length ? <CircleAlert className="size-4 text-nq-danger-text" aria-hidden /> : <TriangleAlert className="size-4 text-nq-warning-text" aria-hidden />}
        </span>
      ) : null}
      {outputs.map((o, i) => {
        const frac = ((i + 1) / (outputs.length + 1)) * 100;
        const pos = horizontal ? { top: `${frac}%` } : { left: `${frac}%` };
        const used = usedHandles.includes(o.id);
        return (
          <span key={o.id || "out"}>
            <Handle
              type="source"
              id={o.id || undefined}
              position={horizontal ? Position.Right : Position.Bottom}
              isConnectable={editable}
              style={pos}
              className={HANDLE_CLASS}
            />
            {branching ? (
              <span
                aria-hidden
                style={horizontal ? { top: `${frac}%` } : { left: `${frac}%` }}
                className={cn(
                  "pointer-events-none absolute -translate-y-1/2 rounded-sm bg-secondary px-1 text-caption text-muted-foreground",
                  horizontal ? "end-3" : "-translate-x-1/2 bottom-1 translate-y-0",
                )}
              >
                {o.label}
              </span>
            ) : null}
            {editable && !used ? (
              <button
                type="button"
                data-slot="workflow-node-add"
                aria-label={t.addAfter(title)}
                title={t.addAfter(title)}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAfter(node.id, o.id || null);
                }}
                style={horizontal ? { ...pos, left: "calc(100% + 14px)" } : pos}
                className={cn(
                  "nodrag nopan absolute flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus",
                  !horizontal && "top-[calc(100%+14px)] -translate-x-1/2 translate-y-0",
                )}
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ edge */

export interface FlowEdgeData extends Record<string, unknown> {
  label?: string;
  items?: number;
  hover: boolean;
  insertable: boolean;
}

export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected, data }: EdgeProps) {
  const { t, onInsertOnEdge, formatNumber } = useCanvas();
  const d = (data ?? { hover: false, insertable: false }) as FlowEdgeData;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const showInsert = d.insertable && (d.hover || selected);
  const text = d.items !== undefined ? formatNumber(d.items) : d.label;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
      {text || showInsert ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex items-center gap-1"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: showInsert ? "all" : "none" }}
          >
            {text && !showInsert ? <span className="rounded-full border border-border bg-card px-1.5 text-caption text-muted-foreground"><bdi>{text}</bdi></span> : null}
            {showInsert ? (
              <button
                type="button"
                aria-label={t.insertHere}
                title={t.insertHere}
                onClick={() => onInsertOnEdge(id)}
                className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ controls */

/** Zoom, fit and lock, localised. React Flow's own Controls hard-code English titles, so these are ours. */
export function CanvasControls({ locked, onToggleLock, className, children }: { locked: boolean; onToggleLock: () => void; className?: string; children?: ReactNode }) {
  const { t, formatNumber } = useCanvas();
  const flow = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  return (
    <Panel position="bottom-left" className={cn("!m-3 flex items-end gap-2", className)}>
      <div className="flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" aria-label={t.canvas}>
        <Button variant="ghost" size="icon-sm" className="rounded-none" aria-label={t.zoomIn} title={t.zoomIn} onClick={() => void flow.zoomIn({ duration: 150 })}>
          <Plus aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-none border-t border-border" aria-label={t.zoomOut} title={t.zoomOut} onClick={() => void flow.zoomOut({ duration: 150 })}>
          <Minus aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-none border-t border-border" aria-label={t.fit} title={t.fit} onClick={() => void flow.fitView({ padding: 0.25, duration: 250, maxZoom: 1 })}>
          <Maximize2 aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-none border-t border-border" aria-label={locked ? t.unlock : t.lock} aria-pressed={locked} title={locked ? t.unlock : t.lock} onClick={onToggleLock}>
          {locked ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
        </Button>
      </div>
      <span className="rounded-control border border-border bg-card px-2 py-1 text-caption text-muted-foreground tabular-nums" aria-hidden>
        <bdi>{formatNumber(Math.round(zoom * 100))}%</bdi>
      </span>
      {children}
    </Panel>
  );
}
