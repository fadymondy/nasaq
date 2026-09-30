---
name: rule-builder
title: RuleBuilder
category: workflow
status: beta
summary: An IFTTT style rule editor with an event trigger, nested all-of and any-of condition groups, and an ordered list of actions, read back as a plain-language sentence with the missing pieces listed.
exports: [RuleBuilder, RuleBuilderProps, RuleBuilderLabels]
related: [workflow-canvas, step-editor, cron-builder, run-history, schema-repeater]
story: components-workflow-rule-builder
base-ui: [select, toggle-group, field]
keywords: [rule, automation, if this then that, ifttt, conditions, trigger, actions, filter, and, or]
---

# RuleBuilder

For automations that fit "when this happens, if these are true, do that". Choose the event, build conditions as
groups that match all or any of their members (groups nest), and stack the actions. A sentence at the top reads the
rule back ("When an order is placed, if Amount is greater than 100 and Country is Saudi Arabia, then send an email"), in
English or Arabic, so the rule can be checked at a glance. What is still missing is listed. The builder edits a
`RuleDefinition` you store; `evaluateConditions` runs the condition tree against a record if you want to evaluate it.

## When to use

- Notification rules, routing, automations, filters: anything with one trigger and a yes/no test.
- Non-technical people configuring behaviour.

## When not to use

- Branching flows, loops and merges: use `workflow-canvas` or `step-editor`.
- A saved search over a table: use `filter-builder`.

## Import

```tsx
import { RuleBuilder } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { RuleBuilder, type RuleDefinition } from "@fadymondy/nasaq/web";
import { useState } from "react";

const events = [{ id: "order.created", label: "an order is placed" }];
const fields = [{ id: "amount", label: "Amount", kind: "number" as const }];
const actionTypes = [{ id: "email", label: "Send an email", fields: [{ name: "to", label: "To", kind: "text" as const, required: true }] }];

export function Rule() {
  const [rule, setRule] = useState<RuleDefinition | undefined>();
  return <RuleBuilder events={events} fields={fields} actionTypes={actionTypes} value={rule} onValueChange={(next) => setRule(next)} />;
}
```

## Anatomy

```
RuleBuilder               data-slot="rule-builder"
├─ summary sentence       data-slot="rule-summary", aria-live polite
├─ Alert                  what is still missing
├─ 1 When                 event Select
├─ 2 If                   group (role="group"): Match all / any, condition rows, nested groups
│  └─ condition row       field, operator, value
└─ 3 Then                 Repeater of actions with fields from the action type
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `events` | `RuleEvent[]` | required | `{ id, label, description? }`. |
| `fields` | `RuleField[]` | required | `{ id, label, kind: "text" \| "number" \| "select" \| "boolean", options? }`. |
| `actionTypes` | `RuleActionType[]` | required | `{ id, label, description?, fields?, defaults? }`; fields use the workflow field definitions. |
| `value / defaultValue` | `RuleDefinition` | empty rule | `{ event, conditions: RuleGroup, actions: RuleAction[] }`. |
| `onValueChange` | `(rule, issues) => void` | none | Every change, with what is still wrong. |
| `maxDepth` | `number` | `3` | How deep condition groups may nest. |
| `disabled` | `boolean` | `false` | Read only. |
| `header` | `ReactNode` | none | Extra content under the sentence, such as a name field or Save button. |
| `labels` | `RuleBuilderLabels` | none | Override any English or Arabic string, including operator names. |

### Helpers

`emptyRule`, `validateRule`, `evaluateConditions(group, data, fields)`, `describeRule` are exported and pure.

## Examples

Save only when nothing is missing:

```tsx
<RuleBuilder events={events} fields={fields} actionTypes={actionTypes} onValueChange={(rule, issues) => setCanSave(issues.length === 0)} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through the event, each condition's field, operator, value and remove button, then add buttons. |
| Arrow keys | Move between "All of these" and "Any of these". |
| Enter / Space | Open a select, press a button. |

Every group has `role="group"` with its match mode as the name. The sentence is a polite live region. Problems are listed as text. Remove buttons carry names.

## RTL & i18n

- The whole builder mirrors; the sentence uses `dir="auto"`.
- Operators, "all of these", "if" and "then" ship in English and Arabic; event, field and action names come from your data.
- Numbers stay left-to-right.

## Styling & tokens

- Nested groups get `--nq-surface-soft`. Extend with `className`; never pass raw hex.

## Do / Don't

- Do name events, fields and actions in the user's words.
- Do validate again where the rule runs.
- Don't nest deeper than three levels; nobody can read it.

## Related

- [`workflow-canvas`](../workflow-canvas/README.md)
- [`step-editor`](../step-editor/README.md)
- [`cron-builder`](../cron-builder/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-rule-builder--docs
