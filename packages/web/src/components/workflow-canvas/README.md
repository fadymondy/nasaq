---
name: workflow-canvas
title: Workflow canvas
category: workflow
status: beta
summary: Editable workflow graph with status nodes, a what-happens-next picker, a config side panel, minimap, validation, versions and an execution overlay with replay.
exports: [WorkflowCanvas, WorkflowCanvasProps]
related: [timeline, stepper, kanban-board, log-viewer, workflow-network]
story: components-workflow-workflow-canvas
base-ui: [popover, alert-dialog, tabs, select, switch]
keywords: [workflow, automation, canvas, flow, nodes, graph, builder, trigger, action, executions, react-flow]
---

# Workflow canvas

Build and inspect an automation: a trigger, then steps, joined by edges. Every node shows its status, a "+" adds the next step from a searchable picker, a side panel configures the selected step, and a past execution can be drawn on top of the graph (and replayed) to see exactly how it ran. Built on `@xyflow/react`, themed with Nasaq tokens.

## When to use

- A visual automation, pipeline or approval-flow editor.
- Reading how a run went: which step failed, how long each took, how many items passed.

## When not to use

- A linear checklist of steps the user walks through: use [`Stepper`](../stepper/README.md).
- A read-only list of events: use [`Timeline`](../timeline/README.md).
- An overview of many workflows and how they trigger each other: use [`WorkflowNetwork`](../workflow-network/README.md).

## Import

```tsx
import { WorkflowCanvas } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

The component imports `@xyflow/react/dist/base.css` itself (structure only). Its Nasaq theming ships in `styles.css` (`.react-flow.nq-flow`), so load `@nasaq/web/styles.css` as usual.

## Quick start

```tsx
import { WorkflowCanvas, type WorkflowGraph, type WorkflowStepType } from "@fadymondy/nasaq/web";
import { Globe, Mail, Webhook } from "lucide-react";
import { useState } from "react";

const types: WorkflowStepType[] = [
  { id: "webhook", label: "Webhook", category: "trigger", icon: Webhook, role: "trigger", fields: [{ name: "path", label: "Path", kind: "text", required: true }] },
  { id: "http", label: "HTTP request", category: "action", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url", required: true }] },
  { id: "mail", label: "Send email", category: "action", icon: Mail },
];

export function Builder() {
  const [graph, setGraph] = useState<WorkflowGraph>({ nodes: [], edges: [] });
  return (
    <div className="h-[640px]">
      <WorkflowCanvas
        title="New workflow"
        value={graph}
        onChange={setGraph}
        types={types}
        categories={[{ id: "trigger", label: "Triggers" }, { id: "action", label: "Actions" }]}
        onSave={async (g) => {
          await fetch("/api/flows", { method: "PUT", body: JSON.stringify(g) });
        }}
      />
    </div>
  );
}
```

## Anatomy

```
WorkflowCanvas                    data-slot="workflow-canvas"
├─ toolbar                        Add step, Tidy, Validation popover, Executions, Versions, Save, Run
├─ banners                        error message, version preview, run overlay status
└─ canvas (always LTR)
   ├─ ReactFlow.nq-flow           nodes: data-slot="workflow-node" [data-status]
   │                              edges: label / item count, "+" insert on hover
   ├─ MiniMap, CanvasControls     localised zoom, fit, lock
   └─ aside                       data-slot="workflow-side-panel"
      ├─ WorkflowNodePicker       "What happens next?"
      ├─ WorkflowConfigPanel      Settings / Output tabs
      ├─ WorkflowRunsPanel        executions, Replay
      └─ WorkflowVersionsPanel    history, preview, restore (with confirmation)
```

The four panels are also exported, so a host app can lay them out itself.

## API

### `WorkflowCanvas`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `WorkflowGraph` | required | `{ nodes, edges }`. Nodes without a `position` are laid out automatically. The canvas keeps a working copy and adopts a new `value` when the prop changes. |
| `onChange?` | `(graph) => void` | none | Called on add, remove, connect, config edit and drag stop. |
| `types` | `WorkflowStepType[]` | required | What can be added. `role: "trigger"` steps are offered while the graph has no trigger, the rest afterwards. |
| `categories?` | `{ id; label }[]` | none | Group headings and their order in the picker. |
| `title?` | `ReactNode` | none | Name shown in the toolbar. |
| `runs?` | `WorkflowRun[]` | none | Executions. Adds the Executions panel and the overlay. |
| `versions?` | `WorkflowVersion[]` | none | Saved versions. Adds the Versions panel and read-only preview. |
| `currentVersion?` | `number` | highest in `versions` | Which version is live. |
| `onSave?` | `(graph) => Promise<void \| { error?: string }>` | none | Shows a Save button, enabled while there are unsaved changes. |
| `onRun?` | `(graph) => Promise<void \| { error?: string }>` | none | Shows a Run button, disabled while validation has errors. |
| `onRestoreVersion?` | `(version) => Promise<void \| { error?: string }>` | none | Restore. The parent saves the current graph as a new version. |
| `direction?` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction. |
| `readOnly?` | `boolean` | `false` | Inspect only. |
| `defaultRunId?` | `string \| null` | `null` | Draw this execution on load. |
| `height?` | `number \| string` | `"100%"` | Minimum 480px. |
| `labels?` | `Partial<WorkflowCanvasLabels>` | en/ar | Override any string. |

### Types

- `WorkflowStepType`: `{ id, label, description?, category, icon, role?, fields?, defaults?, outputs?, keywords? }`. `fields` builds the config form (`text`, `textarea`, `number`, `boolean`, `select`, `url`, `code`). `outputs` gives a step named branches (an If's Yes / No).
- `WorkflowNodeData`: `{ id, type, label?, config, position? }`. `WorkflowEdgeData`: `{ id, source, target, sourceHandle?, label? }`.
- `WorkflowRun`: `{ id, status, startedAt, durationMs?, trigger?, nodes: Record<nodeId, { status, startedAtMs?, durationMs?, items?, output?, error? }> }`.
- Pure helpers exported for hosts and tests: `validateWorkflow`, `addStep`, `removeNodes`, `autoLayout`, `canConnect`, `runOrder`, `runAtStep`.

## Examples

### Execution overlay

```tsx
<WorkflowCanvas value={graph} types={types} runs={runs} defaultRunId="run-42" readOnly />
```

Each node shows its status (icon plus text, never colour alone), duration and item count; edges that carried data show the count. Opening a node shows its Output tab: JSON, error message and timing. Replay steps through the nodes in the order they ran.

### Versions

```tsx
<WorkflowCanvas
  value={graph}
  types={types}
  versions={versions}
  onRestoreVersion={async (v) => {
    await api.restore(v.version);
  }}
/>
```

Choosing a version draws it read-only on the canvas under a "Previewing version 3" banner. Restore asks for confirmation.

## Accessibility

- The toolbar is a `role="toolbar"`; every icon button has an accessible name and a tooltip.
- The picker is a combobox and listbox: type to filter, Up / Down to move, Enter to add, Escape to close.
- Nodes are focusable; Delete removes the selected node or edge when focus is on the canvas.
- Status uses a distinct icon per state plus a text label. Validation problems are listed with the node they belong to and jump to it when chosen.
- The minimap is labelled and hidden on narrow screens.

## RTL & i18n

- The canvas surface stays left-to-right, like any diagram: edges run from the trigger on the left. Node text, the toolbar and every panel follow the page direction and use logical classes.
- All strings come in English and Arabic from the provider locale; pass `labels` to override. Step type labels and field labels are yours to localise.
- Numbers and durations use Latin digits and sit in `<bdi>`; URLs, code and JSON stay LTR.
- The graph's own arrows do not mirror.

## Styling & tokens

- Nodes are `bg-card` with `border-border`; status swaps the border to `nq-info`, `nq-success`, `nq-danger` or `nq-warning`. Edges use `--nq-line-strong`, turning `--nq-success` when an execution passed through them.
- `styles.css` maps React Flow's `--xy-*` variables to Nasaq tokens under `.react-flow.nq-flow`; nothing else of React Flow's is themed. Never use raw hex.
- Target `[data-slot=workflow-node][data-status=error]` for custom treatment.

## Bundle

`@xyflow/react` (with its zustand and d3 dependencies) is roughly 60 to 70 kB gzipped and is imported only by this component, so apps that do not use the canvas do not pay for it with a tree-shaking bundler or path imports.

## Do / Don't

- **Do** keep `types` stable (define it outside the component or memoise it).
- **Do** save from `onSave` rather than on every `onChange`; drag stops fire `onChange` too.
- **Don't** put more than one trigger in a graph; validation reports it.
- **Don't** write your own edge colours; overlay state drives them.

## Related

- [WorkflowNetwork](../workflow-network/README.md) · [Timeline](../timeline/README.md) · [LogViewer](../log-viewer/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-workflow-canvas--docs
