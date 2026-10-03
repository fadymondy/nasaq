---
name: workflow-views
title: Workflow Views
category: workflow
status: beta
summary: One workflow shown three ways from the same nested steps. A numbered outline with loops and labelled branches, a pipeline diagram, and your editor, with a view switch that can remember the choice.
exports: [WorkflowViewsLabels, WorkflowViewsProps, WorkflowViews]
related: [workflow-network, step-editor, workflow-canvas, view-toggle]
story: components-workflow-workflow-views
base-ui: [toggle-group]
keywords: [workflow, pipeline, steps, outline, flow, diagram, branches, condition, loop, view switch, editor, automation]
---

# Workflow Views

A workflow is one tree of steps: some hold more steps (a loop, a group), some split into labelled branches (a
condition). This shows that tree three ways and lets people switch:

- **Steps**: a numbered outline (1, 2, 2.1, 3.a.1) that reads top to bottom, with loops indented and branches under
  their label.
- **Pipeline**: the same steps as a `WorkflowNetwork` diagram, branches fanning out and joining again.
- **Editor**: whatever you pass as `editor`, usually a `StepEditor` bound to the same data.

Every view reads the same `steps`, so an edit shows up everywhere.

## When to use

- A workflow, automation or pipeline page where people mostly read the flow and sometimes change it.

## When not to use

- A free-form graph with arbitrary connections: use `WorkflowCanvas`.
- Only a diagram: use `WorkflowNetwork` directly.

## Import

```tsx
import { WorkflowViews } from "@fadymondy/nasaq";
```

## Quick start

```tsx
<WorkflowViews
  steps={steps}
  storageKey="workflow:view"
  editor={<StepEditor types={types} steps={editorSteps} onStepsChange={save} />}
  onStepClick={(s) => openStep(s.id)}
  highlight={runningStepId}
/>
```

## Anatomy

- `data-slot="workflow-views"` (`data-view`): a `section` named by its heading.
- Header: title, step count, the view switch (a `ToggleGroup`), your `actions`.
- `workflow-views-panel`: the outline (`workflow-step` items with `data-kind`, `workflow-branch` groups), the
  `WorkflowNetwork`, or the editor.
- An empty state when there are no steps.

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `steps` | `WorkflowTreeStep[]` | `{ id, title, description?, owner?, kind?, children?, branches?: { label, steps }[] }`. |
| `view`, `defaultView`, `onViewChange` | `"steps" \| "pipeline" \| "editor"` | Default `"steps"`. |
| `storageKey` | `string` | Remembers the view in `localStorage`, read after mount. |
| `editor` | `ReactNode` | Adds the Editor view. |
| `onStepClick` | `(step) => void` | Steps become buttons in both read views. |
| `highlight` | `string` | A step id to emphasise (selected, running). |
| `title`, `headingAs`, `actions` | | `title={null}` hides the heading. `headingAs` defaults to `h3`. |
| `labels` | `Partial<WorkflowViewsLabels>` | `kinds` merges with the built-in names. |

`kind` is a `WorkflowNetworkKind`: `step`, `decision`, `human`, `system`, `output`. A step with branches is a
`decision` unless you say otherwise.

### Helpers

From `workflow-views-logic.ts`, pure: `workflowToNetwork(steps)` gives the `{ steps, links }` a `WorkflowNetwork`
draws (into children, out of their last step, a labelled link to each branch, every branch end on to what follows,
an empty branch straight on); `numberWorkflow(steps)` gives outline numbers and depth; `countWorkflowSteps`;
`workflowStepKind`. Types `WorkflowTreeStep`, `WorkflowBranch`, `WorkflowView`.

## Accessibility

- The view switch is a toggle group named "View"; each button controls the panel.
- The outline is nested ordered lists; the highlighted step has `aria-current="step"`.
- Outline numbers are text, so "3.a.1" is read out and a branch is named by its label, not shown only by indentation.

## RTL & i18n

English and Arabic strings are built in. Indentation and the branch rules use logical sides, so they mirror in
Arabic; outline numbers stay left to right. The pipeline follows the reading direction.

## Styling & tokens

`bg-card`, `border-border`; loops use a solid start rule and branches a dashed `border-nq-line-strong` one. The
highlighted step uses `border-primary` and `bg-nq-selected`.

## Do / Don't

- Do keep `id`s stable so the highlight and the remembered view survive edits.
- Do label branches with the answer ("Yes", "Over 500"), not the question.
- Don't nest more than three levels; split the workflow instead.

## Related

`workflow-network`, `step-editor`, `workflow-canvas`, `view-toggle`.

## Lab

Workflow › Workflow Views: Default, Read only, Empty, Arabic.
