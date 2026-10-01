---
name: ai-model-picker
title: AiModelPicker
category: ai-agents
status: beta
summary: Choose the model, its reasoning effort and a required agent or skill, as cards or one compact toolbar row, plus a PersonaPicker with prompt starters and the compact AiModelSelect that CopilotChat uses.
exports: [AiModelSelect, AiModelSelectProps, AiModelPicker, AiModelPickerProps, AiModelPickerLabels, AiModel, AiModelTier, AiAgentOption, AiModelSelection, PersonaPicker, PersonaPickerProps, AiPersona]
related: [copilot-chat, model-routing-editor, ai-usage-cost, radio-group, select]
story: components-ai-agents-ai-model-picker
base-ui: [radio-group, select, toggle-group, field]
keywords: [ai, model, reasoning, effort, agent, skill, persona, prompt starters, picker, llm]
---

# AiModelPicker

What runs an AI task, in one control. The **model** (name, tier, context window, price), the **reasoning effort** that model supports (Low to Max), and, when the run needs one, the **agent or skill** that executes it. `PersonaPicker` chooses who the assistant should be and offers that persona's prompt starters. `AiModelSelect` is the small select from a chat composer; `CopilotChat` renders it for its model menu, so both stay in step.

## When to use

- A run or chat settings panel, a task launcher, a "new agent run" dialog.
- A composer that needs a model menu (`AiModelSelect`, or `variant="compact"`).
- A first screen that offers assistant personas with example prompts.

## When not to use

- Deciding which model handles which task class automatically: use [`ModelRoutingEditor`](../model-routing-editor/README.md).
- Showing what a run cost: use [`AiUsageCost`](../ai-usage-cost/README.md).

## Import

```tsx
import { AiModelPicker, PersonaPicker, type AiModel } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AiModelPicker } from "@fadymondy/nasaq/web";

const models = [
  { id: "opus-5.5", label: "Opus 5.5", tier: "flagship", efforts: ["low", "medium", "high", "max"], contextWindow: 1_000_000 },
  { id: "haiku-4.5", label: "Haiku 4.5", tier: "fast", contextWindow: 200_000 },
] as const;

export function RunSettings() {
  return (
    <AiModelPicker
      models={models}
      defaultValue={{ model: "opus-5.5", effort: "high" }}
      agents={[{ id: "reviewer", label: "Code reviewer" }]}
      agentRequired
      onValueChange={(sel) => console.log(sel)}
    />
  );
}
```

## Anatomy

```
AiModelPicker      data-slot="ai-model-picker"  data-variant="cards|compact"
  RadioGroup       one RadioCard per model (cards)  |  AiModelSelect (compact)
  ToggleGroup      reasoning effort (only for models with efforts)
  Field + Select   agent, data-slot="ai-agent-select"
AiModelSelect      data-slot="ai-model-select"
PersonaPicker      data-slot="persona-picker"
  persona-starters prompt buttons of the selected persona
```

## API

### AiModelPicker

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `models` | `AiModel[]` | required | `{ id, label, description?, provider?, tier?, efforts?, contextWindow?, price?, disabled? }`. Names are not translated. |
| `value` / `defaultValue` | `{ model?, effort?, agent? }` | first model | The selection. |
| `onValueChange` | `(value) => void` | none | Called on every change. |
| `agents` | `{ id, label, description? }[]` | none | Agents or skills; omit to hide the field. |
| `agentRequired` | `boolean` | `false` | Marks the field required and invalid until one is chosen. |
| `effortLabels` | `Record<string, string>` | none | Names for effort ids other than low, medium, high, max. |
| `variant` | `"cards" \| "compact"` | `"cards"` | Full cards, or one row for a toolbar. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code for prices. |
| `disabled` | `boolean` | `false` | Disables every control. |
| `labels` | `AiModelPickerLabels` | en / ar | Override any string. |

Changing the model keeps the effort if the new model supports it, otherwise it lands on "medium" or the first supported effort, and clears it for models without efforts. The pure helpers `resolveEffort` and `selectionReady` are exported.

### PersonaPicker

`personas: { id, name, description?, icon?, starters? }[]`, `value` / `defaultValue`, `onValueChange`, `onStarter(prompt, persona)`, `disabled`, `labels`.

### AiModelSelect

`models` (`{ id, label }[]`), `value`, `onValueChange`, `label`, `disabled`, `className` (the trigger), `labels`.

## Examples

Toolbar row:

```tsx
import { AiModelPicker } from "@fadymondy/nasaq/web";

export const Bar = () => <AiModelPicker variant="compact" models={models} agents={agents} />;
```

Personas:

```tsx
import { PersonaPicker } from "@fadymondy/nasaq/web";

export const Who = () => (
  <PersonaPicker
    personas={[{ id: "analyst", name: "Analyst", description: "Reads your numbers", starters: ["Summarise last week"] }]}
    onStarter={(prompt) => send(prompt)}
  />
);
```

Arabic: use `NasaqProvider locale="ar"`; model names and providers stay left to right.

## Accessibility

Models are a radio group (arrow keys move and select). Effort is a segmented control with a group name. The agent field is a labelled Base UI Select; when it is required and empty after the menu was closed, the message has `role="alert"` and an icon. Persona starters are real buttons in a labelled list.

## RTL & i18n

- Logical properties; the cards, segmented control and menus follow the reading direction.
- Model and provider names are wrapped `dir="ltr"`; prices and context sizes use the active locale.
- Every string has an English and Arabic default; override with `labels`.

## Styling & tokens

- Selected card uses `--nq-selected` and `--primary` through `RadioCard`; the tier badge uses the `accent` (flagship) or `neutral` variant.
- Target `[data-slot="ai-model-picker"][data-variant="compact"]` to restyle the toolbar form.

## Do / Don't

- Do list only efforts the model really supports.
- Do mark `agentRequired` when the run cannot start without one.
- Don't translate model names or add vendor logos; the picker shows names as text.

## Related

- [`CopilotChat`](../copilot-chat/README.md)
- [`ModelRoutingEditor`](../model-routing-editor/README.md)
- [`RadioCard`](../radio-group/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-agents-ai-model-picker--docs
