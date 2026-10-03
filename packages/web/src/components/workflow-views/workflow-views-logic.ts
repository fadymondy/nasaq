import type { WorkflowNetworkKind, WorkflowNetworkLink, WorkflowNetworkStep } from "../workflow-network/workflow-network";

/** One step of a workflow, possibly holding more steps (a loop) or branches (a condition). */
export interface WorkflowTreeStep {
  id: string;
  title: string;
  description?: string;
  /** Who or what does it ("Billing API"). */
  owner?: string;
  /** Default `"decision"` when it has branches, else `"step"`. */
  kind?: WorkflowNetworkKind;
  /** Steps run inside this one, in order (a loop body, a group). */
  children?: readonly WorkflowTreeStep[];
  /** Alternative paths, each with a label ("Yes", "No"). */
  branches?: readonly WorkflowBranch[];
}

export interface WorkflowBranch {
  label: string;
  steps: readonly WorkflowTreeStep[];
}

export type WorkflowView = "steps" | "pipeline" | "editor";

export const workflowStepKind = (step: WorkflowTreeStep): WorkflowNetworkKind => step.kind ?? (step.branches?.length ? "decision" : "step");

/** Every step in reading order, with its outline number ("2", "2.1", "3.a.1"). */
export function numberWorkflow(steps: readonly WorkflowTreeStep[], prefix = ""): { step: WorkflowTreeStep; number: string; depth: number }[] {
  const out: { step: WorkflowTreeStep; number: string; depth: number }[] = [];
  const depth = prefix ? prefix.split(".").length - 1 : 0;
  steps.forEach((step, i) => {
    const number = `${prefix}${i + 1}`;
    out.push({ step, number, depth });
    if (step.children?.length) out.push(...numberWorkflow(step.children, `${number}.`));
    step.branches?.forEach((b, j) => out.push(...numberWorkflow(b.steps, `${number}.${String.fromCharCode(97 + j)}.`)));
  });
  return out;
}

export function countWorkflowSteps(steps: readonly WorkflowTreeStep[]): number {
  return numberWorkflow(steps).length;
}

/**
 * Flattens the tree into the cards and connectors a `WorkflowNetwork` draws. A sequence links each step to the
 * next; a step with children links into its first child and its last child on to what follows; a step with branches
 * links to each branch's first step (labelled), and every branch's end links on to what follows.
 */
export function workflowToNetwork(steps: readonly WorkflowTreeStep[]): { steps: WorkflowNetworkStep[]; links: WorkflowNetworkLink[] } {
  const cards: WorkflowNetworkStep[] = [];
  const links: WorkflowNetworkLink[] = [];

  /** Lays out a sequence; returns its entry id and the ids that flow out of its end. */
  const walk = (list: readonly WorkflowTreeStep[]): { entry: string | null; exits: { id: string; label?: string }[] } => {
    let entry: string | null = null;
    let open: { id: string; label?: string }[] = [];
    for (const step of list) {
      cards.push({ id: step.id, title: step.title, description: step.description, owner: step.owner, kind: workflowStepKind(step) });
      for (const from of open) links.push({ from: from.id, to: step.id, ...(from.label ? { label: from.label } : {}) });
      entry ??= step.id;
      let exits: { id: string; label?: string }[] = [{ id: step.id }];
      if (step.children?.length) {
        const inner = walk(step.children);
        if (inner.entry) {
          links.push({ from: step.id, to: inner.entry });
          exits = inner.exits;
        }
      }
      if (step.branches?.length) {
        exits = [];
        for (const branch of step.branches) {
          const inner = walk(branch.steps);
          if (inner.entry) {
            links.push({ from: step.id, to: inner.entry, label: branch.label });
            exits.push(...inner.exits);
          } else {
            // An empty branch goes straight on.
            exits.push({ id: step.id, label: branch.label });
          }
        }
      }
      open = exits;
    }
    return { entry, exits: open };
  };

  walk(steps);
  return { steps: cards, links };
}
