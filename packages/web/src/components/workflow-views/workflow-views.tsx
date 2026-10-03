"use client";

import { GitBranch, ListTree, Pencil, Workflow as WorkflowIcon } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { WorkflowNetwork } from "../workflow-network";
import { countWorkflowSteps, workflowStepKind, type WorkflowTreeStep, type WorkflowView, workflowToNetwork } from "./workflow-views-logic";

export * from "./workflow-views-logic";

const STRINGS = {
  en: {
    title: "Workflow",
    views: "View",
    steps: "Steps",
    pipeline: "Pipeline",
    editor: "Editor",
    count: "{n} steps",
    emptyTitle: "No steps yet",
    empty: "Add a step to start this workflow.",
    kinds: { step: "Step", decision: "Decision", human: "Person", system: "System", output: "Result" },
  },
  ar: {
    title: "سير العمل",
    views: "العرض",
    steps: "الخطوات",
    pipeline: "المسار",
    editor: "المحرّر",
    count: "{n} خطوات",
    emptyTitle: "لا خطوات بعد",
    empty: "أضف خطوة لبدء سير العمل هذا.",
    kinds: { step: "خطوة", decision: "قرار", human: "شخص", system: "نظام", output: "نتيجة" },
  },
};

export type WorkflowViewsLabels = (typeof STRINGS)["en"];

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export interface WorkflowViewsProps extends Omit<ComponentProps<"section">, "title"> {
  /** The workflow, the one source every view draws from. */
  steps: readonly WorkflowTreeStep[];
  view?: WorkflowView;
  /** Default `"steps"`. */
  defaultView?: WorkflowView;
  onViewChange?: (view: WorkflowView) => void;
  /** Remembers the view in `localStorage`, read after mount. */
  storageKey?: string;
  /** The editor for the same steps, e.g. a `StepEditor`. Adds the Editor view. */
  editor?: ReactNode;
  /** Makes steps clickable in both read views. */
  onStepClick?: (step: WorkflowTreeStep) => void;
  /** A step id to emphasise, e.g. the one running or selected. */
  highlight?: string;
  /** `null` hides the heading. */
  title?: ReactNode;
  headingAs?: ElementType;
  /** More controls in the header, after the view switch. */
  actions?: ReactNode;
  labels?: Partial<WorkflowViewsLabels>;
}

const VIEW_ICON = { steps: ListTree, pipeline: GitBranch, editor: Pencil } as const;

function StepList({
  steps,
  prefix,
  t,
  onStepClick,
  highlight,
}: {
  steps: readonly WorkflowTreeStep[];
  prefix: string;
  t: WorkflowViewsLabels;
  onStepClick?: (step: WorkflowTreeStep) => void;
  highlight?: string;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const number = `${prefix}${i + 1}`;
        const kind = workflowStepKind(step);
        const active = step.id === highlight;
        const Body = onStepClick ? "button" : "div";
        return (
          <li key={step.id} data-slot="workflow-step" data-step={step.id} data-kind={kind} className="flex flex-col gap-2">
            <Body
              {...(onStepClick ? { type: "button" as const, onClick: () => onStepClick(step) } : {})}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-start gap-3 rounded-control border bg-card px-3 py-2.5 text-start",
                active ? "border-primary bg-nq-selected" : "border-border",
                onStepClick &&
                  "outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
              )}
            >
              <bdi dir="ltr" className="min-w-8 pt-px font-mono text-caption text-muted-foreground tabular-nums">
                {number}
              </bdi>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span dir="auto" className="text-label text-foreground">
                    {step.title}
                  </span>
                  {kind !== "step" ? <Badge variant={kind === "decision" ? "info" : "neutral"}>{t.kinds[kind]}</Badge> : null}
                </span>
                {step.description ? (
                  <span dir="auto" className="text-caption text-muted-foreground">
                    {step.description}
                  </span>
                ) : null}
              </span>
              {step.owner ? (
                <span dir="auto" className="shrink-0 text-caption text-muted-foreground">
                  {step.owner}
                </span>
              ) : null}
            </Body>
            {step.children?.length ? (
              <div className="ms-5 border-s border-border ps-4">
                <StepList steps={step.children} prefix={`${number}.`} t={t} onStepClick={onStepClick} highlight={highlight} />
              </div>
            ) : null}
            {step.branches?.map((branch, j) => (
              <div key={`${branch.label}-${j}`} data-slot="workflow-branch" className="ms-5 flex flex-col gap-2 border-s border-dashed border-nq-line-strong ps-4">
                <span className="flex items-center gap-2 text-caption text-muted-foreground">
                  <GitBranch aria-hidden className="size-3.5" />
                  <span dir="auto">{branch.label}</span>
                </span>
                {branch.steps.length ? (
                  <StepList steps={branch.steps} prefix={`${number}.${String.fromCharCode(97 + j)}.`} t={t} onStepClick={onStepClick} highlight={highlight} />
                ) : null}
              </div>
            ))}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One workflow, three ways: a readable outline of its steps, a pipeline diagram, and (with `editor`) your editor
 * for the same steps. A switch in the header moves between them and can remember the choice.
 */
export function WorkflowViews({
  steps,
  view,
  defaultView = "steps",
  onViewChange,
  storageKey,
  editor,
  onStepClick,
  highlight,
  title,
  headingAs: Heading = "h3",
  actions,
  labels,
  className,
  ...props
}: WorkflowViewsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: WorkflowViewsLabels = { ...base, ...labels, kinds: { ...base.kinds, ...labels?.kinds } };
  const id = useId();
  const views: WorkflowView[] = editor ? ["steps", "pipeline", "editor"] : ["steps", "pipeline"];

  const [own, setOwn] = useState<WorkflowView>(defaultView);
  const raw = view ?? own;
  const current = views.includes(raw) ? raw : "steps";

  useEffect(() => {
    if (!storageKey || view) return;
    try {
      const saved = localStorage.getItem(storageKey) as WorkflowView | null;
      if (saved && (saved === "steps" || saved === "pipeline" || saved === "editor")) setOwn(saved);
    } catch {
      // Storage can be blocked; the default view is fine.
    }
  }, [storageKey, view]);

  const pick = (next: WorkflowView) => {
    setOwn(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Ignore: the choice just is not remembered.
      }
    }
    onViewChange?.(next);
  };

  const network = current === "pipeline" ? workflowToNetwork(steps) : null;
  const heading = title === undefined ? t.title : title;
  const total = countWorkflowSteps(steps);
  const byId = new Map<string, WorkflowTreeStep>();
  if (network && onStepClick) {
    const visit = (list: readonly WorkflowTreeStep[]) =>
      list.forEach((s) => {
        byId.set(s.id, s);
        if (s.children) visit(s.children);
        s.branches?.forEach((b) => visit(b.steps));
      });
    visit(steps);
  }

  return (
    <section
      data-slot="workflow-views"
      data-view={current}
      aria-labelledby={heading ? `${id}-title` : undefined}
      className={cn("flex flex-col rounded-card border border-border bg-card", className)}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        {heading ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Heading id={`${id}-title`} className="text-h4 text-foreground">
              {heading}
            </Heading>
            {total ? <Badge variant="neutral">{fill(t.count, { n: formatNumber(total, locale) })}</Badge> : null}
          </div>
        ) : (
          <span className="flex-1" />
        )}
        <ToggleGroup aria-label={t.views} value={[current]} onValueChange={(v: unknown[]) => v[0] && pick(v[0] as WorkflowView)}>
          {views.map((v) => {
            const Icon = VIEW_ICON[v];
            return (
              <Toggle key={v} value={v} aria-controls={`${id}-panel`} data-view={v}>
                <Icon aria-hidden />
                {t[v]}
              </Toggle>
            );
          })}
        </ToggleGroup>
        {actions}
      </header>

      <div id={`${id}-panel`} data-slot="workflow-views-panel" className="min-w-0 p-4">
        {current === "editor" ? (
          editor
        ) : !steps.length ? (
          <EmptyState icon={WorkflowIcon} title={t.emptyTitle} description={t.empty} />
        ) : current === "pipeline" && network ? (
          <WorkflowNetwork
            steps={network.steps}
            links={network.links}
            highlight={highlight}
            onStepClick={onStepClick ? (s) => byId.get(s.id) && onStepClick(byId.get(s.id)!) : undefined}
          />
        ) : (
          <StepList steps={steps} prefix="" t={t} onStepClick={onStepClick} highlight={highlight} />
        )}
      </div>
    </section>
  );
}
