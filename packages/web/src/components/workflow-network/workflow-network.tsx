"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Cpu, Flag, GitBranch, UserCheck } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { type Box, type Connector, connector, networkLinks, rowsFor, sideConnector } from "./network-geometry";

export type WorkflowNetworkKind = "step" | "decision" | "human" | "system" | "output";

export interface WorkflowNetworkStep {
  id: string;
  title: string;
  description?: string;
  /** Overrides the icon the kind gives. */
  icon?: LucideIcon;
  /** Who or what does it ("Support agent", "Billing API"). */
  owner?: string;
  /** Default "step". Drives the card's look and the kind badge. */
  kind?: WorkflowNetworkKind;
}

export interface WorkflowNetworkLink {
  from: string;
  to: string;
  /** Text on the connector ("Approved", "Yes"). */
  label?: string;
}

export interface WorkflowNetworkLabels {
  kind: Record<WorkflowNetworkKind, string>;
  network: string;
  stepCount: (n: string) => string;
}

const STRINGS: { en: WorkflowNetworkLabels; ar: WorkflowNetworkLabels } = {
  en: {
    kind: { step: "Step", decision: "Decision", human: "Human review", system: "Automated", output: "Result" },
    network: "Workflow",
    stepCount: (n) => `${n} steps`,
  },
  ar: {
    kind: { step: "خطوة", decision: "قرار", human: "مراجعة بشرية", system: "آلية", output: "النتيجة" },
    network: "سير العمل",
    stepCount: (n) => `${n} خطوات`,
  },
};

const KIND_ICON: Record<WorkflowNetworkKind, LucideIcon> = { step: ArrowRight, decision: GitBranch, human: UserCheck, system: Cpu, output: Flag };
const KIND_STYLE: Record<WorkflowNetworkKind, string> = {
  step: "",
  decision: "border-nq-accent/60",
  human: "border-dashed",
  system: "bg-secondary",
  output: "border-nq-brand/50",
};

export interface WorkflowNetworkProps {
  steps: WorkflowNetworkStep[];
  /** Connectors. Without any, the steps run in order. Ids that match no step are ignored. */
  links?: WorkflowNetworkLink[];
  /**
   * `horizontal`: rows that wrap and balance, following the reading direction (right to left in Arabic).
   * `vertical`: one column. `auto` (default): vertical when the container is narrow.
   */
  layout?: "horizontal" | "vertical" | "auto";
  /** Step id to emphasise: its card gets a ring and its connectors the brand colour. */
  highlight?: string;
  /** Makes the cards buttons. */
  onStepClick?: (step: WorkflowNetworkStep) => void;
  /** Draw the connectors in when the diagram first appears. Skipped with reduced motion. */
  animate?: boolean;
  /** Optional heading and caption around the diagram. */
  title?: string;
  caption?: string;
  labels?: Partial<WorkflowNetworkLabels>;
  className?: string;
}

interface Drawn extends Connector {
  label?: string;
  hot: boolean;
}

function StepCard({ step, hot, kindLabel, onClick }: { step: WorkflowNetworkStep; hot: boolean; kindLabel: string; onClick?: () => void }) {
  const kind = step.kind ?? "step";
  const Icon = step.icon ?? KIND_ICON[kind];
  const body = (
    <>
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4",
            kind === "decision" && "rotate-45 rounded-[8px]",
            kind === "output" && "border-nq-brand/40 bg-nq-brand text-white",
          )}
        >
          <span className={cn("flex", kind === "decision" && "-rotate-45")}>
            <Icon aria-hidden className={cn(kind === "step" && !step.icon && "rtl:-scale-x-100")} />
          </span>
        </span>
        <span className="min-w-0 flex-1 text-label leading-tight text-foreground">{step.title}</span>
      </span>
      {step.description ? <span className="text-caption text-muted-foreground">{step.description}</span> : null}
      {step.owner || kind !== "step" ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {step.owner ? <Badge variant="neutral">{step.owner}</Badge> : null}
          {kind !== "step" ? <Badge variant="outline">{kindLabel}</Badge> : null}
        </span>
      ) : null}
    </>
  );
  const cls = cn(
    "relative flex w-full min-w-0 flex-col items-stretch gap-1.5 rounded-card border border-border bg-card p-3 text-start shadow-xs",
    KIND_STYLE[kind],
    hot && "ring-2 ring-nq-brand ring-offset-2 ring-offset-background",
  );
  return onClick ? (
    <button type="button" data-step={step.id} data-kind={kind} onClick={onClick} className={cn(cls, "cursor-pointer outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus")}>
      {body}
    </button>
  ) : (
    <div data-step={step.id} data-kind={kind} className={cls}>
      {body}
    </div>
  );
}

/**
 * A workflow drawn as cards joined by connectors, for explaining a process: who does what, where a decision
 * branches, where it ends. Read-only and responsive: rows wrap and balance, and on a narrow container it
 * becomes one column. Rows follow the reading direction, so an Arabic flow runs right to left. Connectors are
 * measured from the rendered cards, so they always meet them.
 */
export function WorkflowNetwork({ steps, links, layout = "auto", highlight, onStepClick, animate = false, title, caption, labels, className }: WorkflowNetworkProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as WorkflowNetworkLabels;
  const flow = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [em, setEm] = useState(16);
  const [paths, setPaths] = useState<Drawn[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/[^\w-]/g, "");
  const indexed = useMemo(
    () =>
      networkLinks(
        steps.map((s) => s.id),
        links,
      ),
    [steps, links],
  );
  const n = steps.length;
  const jumps = indexed.some((e) => Math.abs(e.to - e.from) > 1);
  const linkKey = JSON.stringify(indexed);

  const vertical = layout === "vertical" || (layout !== "horizontal" && width > 0 && width < em * 30);
  const perRow = Math.max(2, Math.min(6, Math.floor((width + em * 2.6) / (em * 11.5)) || 4));
  const rows = vertical ? steps.map(() => 1) : rowsFor(n, layout === "horizontal" ? Math.max(perRow, Math.min(n, 4)) : perRow);
  const arcs = !vertical && jumps;

  useLayoutEffect(() => {
    const el = flow.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setEm(Number.parseFloat(getComputedStyle(el).fontSize) || 16);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = flow.current;
    if (!el || width === 0) return;
    const origin = el.getBoundingClientRect();
    const scale = el.offsetWidth ? origin.width / el.offsetWidth : 1;
    const boxes: Box[] = Array.from(el.querySelectorAll<HTMLElement>("[data-step]")).map((c) => {
      const r = c.getBoundingClientRect();
      return { x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale };
    });
    if (boxes.length !== n) return;
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    const next: Drawn[] = [];
    for (const e of indexed) {
      const a = boxes[e.from];
      const b = boxes[e.to];
      if (!a || !b) continue;
      const skip = Math.abs(e.to - e.from) > 1;
      const c = vertical && skip ? sideConnector(a, b, ar ? "left" : "right") : connector(a, b);
      const hot = Boolean(highlight) && (steps[e.from]?.id === highlight || steps[e.to]?.id === highlight);
      next.push({ ...c, ...(e.label ? { label: e.label } : {}), hot });
    }
    setPaths(next);
    // Geometry depends on layout inputs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, vertical, perRow, n, ar, arcs, linkKey, highlight]);

  let start = 0;
  return (
    <figure data-slot="workflow-network" data-layout={vertical ? "vertical" : "horizontal"} className={cn("m-0 w-full", className)}>
      {title ? <h3 className="mb-2 text-h3 text-foreground">{title}</h3> : null}
      <p className="sr-only">{t.stepCount(String(n))}</p>
      <div ref={flow} className={cn("relative", arcs && "pt-12", vertical && jumps && "px-12")}>
        <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}>
          <defs>
            <marker id={`nq-net-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
            </marker>
            <marker id={`nq-net-${uid}-hot`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-nq-brand" />
            </marker>
          </defs>
          {paths.map((p, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: connectors are positional
              key={i}
              d={p.d}
              pathLength={1}
              data-edge={i}
              fill="none"
              strokeWidth={p.hot ? 2 : 1.5}
              strokeLinecap="round"
              className={cn(p.hot ? "stroke-nq-brand" : "stroke-current", animate && "nq-net-draw")}
              style={animate ? { animationDelay: `${i * 90}ms` } : undefined}
              markerEnd={`url(#nq-net-${uid}${p.hot ? "-hot" : ""})`}
            />
          ))}
        </svg>
        <div className={cn("relative flex flex-col p-2", vertical ? "gap-9" : "gap-10")}>
          {rows.map((count, r) => {
            const row = steps.slice(start, start + count);
            start += count;
            return (
              <div key={r} className={cn("flex items-stretch justify-center", vertical ? "mx-auto w-full max-w-[26rem]" : "gap-10")}>
                {row.map((s) => (
                  <div key={s.id} className={cn("flex min-w-0", vertical ? "w-full" : "max-w-64 flex-1 basis-0")}>
                    <StepCard step={s} hot={s.id === highlight} kindLabel={t.kind[s.kind ?? "step"]} onClick={onStepClick ? () => onStepClick(s) : undefined} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {paths.map((p, i) =>
          p.label ? (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: labels are positional
              key={i}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-background px-2 text-caption text-muted-foreground"
              style={{ left: p.mid.x, top: p.mid.y }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
      {caption ? <figcaption className="mt-3 text-body-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}
