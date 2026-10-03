import type { WorkflowCanvasLabels } from "../workflow-canvas/labels";
import type { WorkflowStepType } from "../workflow-canvas/workflow-model";
import type { StepIssue } from "./step-model";
import type { StepEditorLabels } from "./step-strings";

/** What every step list in the tree needs to know. */
export interface StepContext {
  types: Map<string, WorkflowStepType>;
  pickable: WorkflowStepType[];
  categories?: { id: string; label: string }[];
  nestable: ReadonlySet<string>;
  issues: StepIssue[];
  t: StepEditorLabels;
  canvasLabels?: Partial<WorkflowCanvasLabels>;
  disabled?: boolean;
}
