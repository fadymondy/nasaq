---
name: workflow-network
title: Workflow network
category: workflow
status: beta
summary: Read-only process diagram of step cards joined by measured connectors, with decision, human and result kinds, that wraps by width and follows the reading direction.
exports: [WorkflowNetwork, WorkflowNetworkKind, WorkflowNetworkStep, WorkflowNetworkLink, WorkflowNetworkLabels, WorkflowNetworkProps]
related: [workflow-canvas, stepper, timeline]
story: components-workflow-workflow-network
base-ui: []
keywords: [workflow, network, process, diagram, flow, steps, connectors, decision, approval]
---

# Workflow network

A process explained as cards joined by connectors: who does what, where a decision branches, where it ends. It is for showing a workflow, not editing one, so it is light (no graph library), prints well and reads right to left in Arabic. Use it in documentation, onboarding, approval explainers and presentations.

## When to use

- Explaining how a process works to the people who take part in it.
- A workflow summary next to a run or a policy.

## When not to use

- Building or configuring a workflow: use [`WorkflowCanvas`](../workflow-canvas/README.md).
- A strictly linear list of steps to walk through: use [`Stepper`](../stepper/README.md).

## Import

```tsx
import { WorkflowNetwork } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WorkflowNetwork } from "@fadymondy/nasaq/web";

export function Refunds() {
  return (
    <WorkflowNetwork
      title="Refund requests"
      steps={[
        { id: "ask", title: "Customer asks", owner: "Customer" },
        { id: "check", title: "Within 14 days?", kind: "decision" },
        { id: "review", title: "Manager reviews", kind: "human", owner: "Support" },
        { id: "pay", title: "Refund issued", kind: "output" },
      ]}
      links={[
        { from: "ask", to: "check" },
        { from: "check", to: "pay", label: "Yes" },
        { from: "check", to: "review", label: "No" },
        { from: "review", to: "pay", label: "Approved" },
      ]}
    />
  );
}
```

## Anatomy

```
WorkflowNetwork                 data-slot="workflow-network"   <figure>
├─ heading, caption
├─ svg                          connectors (aria-hidden), arrowheads, optional draw-in
├─ rows                         flex rows of cards, wrapped and balanced
│  └─ card                      data-step="id" data-kind="decision"   <div>, or <button> with onStepClick
└─ connector labels             pills on the connectors
```

## API

### `WorkflowNetwork`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `WorkflowNetworkStep[]` | required | `{ id, title, description?, icon?, owner?, kind? }`. `kind` is `step`, `decision`, `human`, `system` or `output`. |
| `links?` | `{ from; to; label? }[]` | steps in order | Connectors by step id. Unknown ids are ignored. |
| `layout?` | `"horizontal" \| "vertical" \| "auto"` | `"auto"` | `auto` becomes one column when the container is narrow (a phone, a sidebar). |
| `highlight?` | `string` | none | A step id: its card gets a ring and its connectors the brand colour. |
| `onStepClick?` | `(step) => void` | none | Makes cards buttons. |
| `animate?` | `boolean` | `false` | Draws the connectors in once. Ignored with reduced motion. |
| `title?`, `caption?` | `string` | none | Heading above and note below. |
| `labels?` | `Partial<WorkflowNetworkLabels>` | en/ar | Kind names and the screen-reader summary. |

## Examples

### Jumping links

A link that skips over cards on its row arcs above them; in a single column it is routed round the side. No configuration is needed.

### Clickable steps

```tsx
<WorkflowNetwork steps={steps} onStepClick={(s) => openDetails(s.id)} highlight={current} />
```

## Accessibility

- Connectors are decorative; the order is the DOM order of the cards, and a screen-reader line states the step count.
- With `onStepClick` each card is a real button with a visible focus ring.
- Kinds are not colour only: each has its own icon shape and a text badge.
- Motion is off with `prefers-reduced-motion`.

## RTL & i18n

- Rows are ordinary flex rows, so in Arabic the first step is on the right and the flow runs right to left. Connectors are measured from the rendered cards and always meet them.
- The default step arrow mirrors; kind icons do not. Kind badge text is localised (en and ar) and can be overridden with `labels`.
- Step titles and owners are yours to localise.

## Styling & tokens

- Cards `bg-card` with `border-border`; decision `border-nq-accent/60`, human `border-dashed`, system `bg-secondary`, output `border-nq-brand/50`. Highlight uses `nq-brand`.
- Target `[data-slot=workflow-network] [data-kind=decision]`. Never use raw hex.

## Do / Don't

- **Do** keep titles to a few words and put detail in `description`.
- **Do** keep `steps` in reading order; layout follows the array.
- **Don't** use it for more than about a dozen steps; split the process instead.

## Related

- [WorkflowCanvas](../workflow-canvas/README.md) · [Stepper](../stepper/README.md) · [Timeline](../timeline/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-workflow-network--docs
