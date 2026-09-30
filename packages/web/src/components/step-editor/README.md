---
name: step-editor
title: StepEditor
category: workflow
status: beta
summary: A linear, sortable, nestable step list with forms generated from each step type, continue-on-failure, a parameters editor with secret values, a node picker for adding steps, problem checking and a test-run panel.
exports: [StepEditor, StepEditorProps, StepEditorLabels]
related: [workflow-canvas, run-history, schema-repeater, repeater, cron-builder]
story: components-workflow-step-editor
base-ui: [tabs, switch, field]
keywords: [steps, workflow, automation, form, parameters, variables, placeholder, test run, nested, editor]
---

# StepEditor

The list view of a workflow, for people who think in order rather than in boxes. Steps can be reordered, duplicated and
nested (a loop's body). Each step's form is generated from its step type's field definitions, the same ones the
canvas uses. Parameters live beside the steps and are used as `{{name}}` in any text field; secret ones are masked and
scrubbed from test output. Problems (a required field empty, a placeholder nobody defines, a step with no type) are listed
and block the test run. It holds no backend: you keep `steps` and `params`, and `onTestRun` runs them.

## When to use

- A workflow, macro or automation edited as an ordered list.
- The mobile or accessible companion to `workflow-canvas`, on the same step types.

## When not to use

- Free-form graphs with branches and merges: use `workflow-canvas`.
- A plain list of one kind of row: use `repeater` or `schema-repeater`.

## Import

```tsx
import { StepEditor } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StepEditor, type StepNode, type StepParam } from "@fadymondy/nasaq/web";
import { Globe } from "lucide-react";
import { useState } from "react";

const types = [{ id: "http", label: "HTTP request", category: "data", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url" as const, required: true }] }];

export function Editor() {
  const [steps, setSteps] = useState<StepNode[]>([]);
  const [params, setParams] = useState<StepParam[]>([{ id: "p1", name: "host", value: "api.example.com" }]);
  return <StepEditor types={types} steps={steps} onStepsChange={setSteps} params={params} onParamsChange={setParams} />;
}
```

## Anatomy

```
StepEditor                data-slot="step-editor"
├─ Alert                  problems to fix
└─ Tabs
   ├─ Steps               Repeater of steps; nestable steps hold another Repeater
   │  └─ row              name, generated fields, continue-on-failure, inner steps
   │     (new row)        WorkflowNodePicker inline until a type is chosen
   ├─ Parameters          Repeater of name / value / secret
   └─ Test run            Run button and one result per step
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `types` | `WorkflowStepType[]` | required | Step types. `fields` drive the forms, `defaults` the starting config. |
| `categories` | `{ id, label }[]` | none | Group headings in the picker. |
| `steps / defaultSteps` | `StepNode[]` | `[]` | `{ id, type, label?, config, continueOnFailure?, children? }`. |
| `onStepsChange` | `(steps) => void` | none | Any edit, reorder, add or remove. |
| `params / defaultParams` | `StepParam[]` | `[]` | `{ id, name, value, secret? }`. |
| `onParamsChange` | `(params) => void` | none | Parameter edits. |
| `nestableTypes` | `readonly string[]` | `[]` | Step type ids that can contain steps. |
| `knownVariables` | `readonly string[]` | `[]` | Placeholder names always available, such as `trigger.body`. |
| `onTestRun` | `(steps, params) => Promise<StepTestResult[] \| { error: string }>` | none | Enables the Test run tab. Result: `{ stepId, status, durationMs?, output?, error? }`. |
| `disabled` | `boolean` | `false` | Read only. |
| `labels / canvasLabels` | partial strings | none | Override any English or Arabic string. |

### Helpers

`validateSteps`, `placeholders`, `resolvePlaceholders`, `maskSecrets`, `newStep`, `flattenSteps`, `countSteps` are exported and pure.

## Examples

A loop that holds steps:

```tsx
<StepEditor types={types} nestableTypes={["loop"]} defaultSteps={[{ id: "l", type: "loop", config: {}, children: [] }]} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through row headers, fields and buttons. |
| Arrow keys | On a row's drag handle: move the step up or down; Home and End jump. |
| Enter / Space | Expand or collapse a step, press a button. |

Reorder, add and remove are announced by the list. Problems are text, not colour. Secret values are `type="password"` with a labelled show/hide button. Localise `labels`.

## RTL & i18n

- The list mirrors. Placeholders, URLs and parameter names stay left-to-right.
- English and Arabic strings ship; step types bring their own localised labels.

## Styling & tokens

- Uses border, `--nq-danger-soft` and `--nq-danger-text` tokens. Extend with `className`; never pass raw hex.

## Do / Don't

- Do keep secrets in parameters and reference them as `{{name}}`, rather than pasting them into fields.
- Do run `validateSteps` again on the server.
- Don't put a secret in `output`: masking only hides values that match a secret parameter.

## Related

- [`workflow-canvas`](../workflow-canvas/README.md)
- [`repeater`](../repeater/README.md)
- [`run-history`](../run-history/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-step-editor--docs
