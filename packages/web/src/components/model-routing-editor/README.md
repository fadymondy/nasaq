---
name: model-routing-editor
title: ModelRoutingEditor
category: ai-agents
status: beta
summary: Admin editor for AI model routing with an automatic-routing switch, a task class to model and fallback route table, an active backend switch and provider or node registration with modality chips.
exports: [ModelRoutingEditor, ModelRoutingEditorProps, ModelRoutingEditorLabels, RoutingTaskClass, RoutingModel, RoutingProvider, RegisterProviderInput, RoutingResult]
related: [ai-model-picker, ai-usage-cost, select, switch, dialog]
story: components-ai-agents-model-routing-editor
base-ui: [select, switch, toggle-group, dialog, field]
keywords: [ai, model, routing, fallback, provider, node, modality, backend, llm, admin]
---

# ModelRoutingEditor

Decides which model does which job. **Automatic routing** lets the system choose; the **route table** sets the preferred model and a fallback per task class (chat, summaries, image understanding). Models are filtered by the task's modality, so an image task only lists models that see images. Below it, **providers and nodes** are listed with what each can do (text, vision, audio, image, embedding), one is chosen as the active backend, and a dialog registers new ones.

## When to use

- An admin screen for an AI product that routes work across several models or hosts.
- Registering a self-hosted node next to cloud providers.

## When not to use

- Picking a model for one run or one chat: use [`AiModelPicker`](../ai-model-picker/README.md).
- Reporting what the models cost: use [`AiUsageCost`](../ai-usage-cost/README.md).

## Import

```tsx
import { ModelRoutingEditor, type RoutingValue } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ModelRoutingEditor } from "@fadymondy/nasaq/web";

export function Routing() {
  return (
    <ModelRoutingEditor
      taskClasses={[{ id: "chat", label: "Chat" }, { id: "vision", label: "Image understanding", modality: "vision" }]}
      models={[{ id: "sonnet", label: "Sonnet 5.5", modalities: ["text", "vision"] }, { id: "haiku", label: "Haiku 4.5" }]}
      providers={[{ id: "cloud", name: "Cloud API", kind: "cloud", modalities: ["text", "vision"], status: "online" }]}
      defaultValue={{ auto: false, routes: { chat: { model: "sonnet", fallback: "haiku" } }, backend: "cloud" }}
      onSave={async (value) => {
        await api.saveRouting(value);
      }}
      onRegisterProvider={async (input) => {
        await api.addProvider(input);
      }}
    />
  );
}
```

## Anatomy

```
ModelRoutingEditor   data-slot="model-routing-editor"  (a form)
  Card               automatic routing Switch
  Card               data-slot="routing-routes"  one data-slot="routing-route" per task: Model + Fallback selects
  Card               data-slot="routing-providers"  backend ToggleGroup, one data-slot="routing-provider" per provider
  routing-footer     data-slot="routing-footer"  Discard and Save (when onSave is set)
  Dialog             data-slot="routing-register"  name, type, endpoint, modalities
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `taskClasses` | `RoutingTaskClass[]` | required | `{ id, label, description?, modality? }`. |
| `models` | `RoutingModel[]` | required | `{ id, label, modalities? }`. A model with no modalities counts as text. |
| `providers` | `RoutingProvider[]` | required | `{ id, name, kind?, endpoint?, modalities, status? }`. |
| `value` / `defaultValue` | `RoutingValue` | auto on, no routes | `{ auto, routes: { [taskId]: { model?, fallback? } }, backend? }`. |
| `onValueChange` | `(value) => void` | none | Called on every edit. |
| `onSave` | `(value) => Promise<void \| { error? }>` | none | Adds the footer. Return `{ error }` or throw to show a failure. |
| `onRegisterProvider` | `(input) => Promise<void \| { error? }>` | none | Shows the Register button. Add the provider to `providers` when it resolves. |
| `onRemoveProvider` | `(id) => Promise<void \| { error? }>` | none | Shows a remove button per provider. |
| `disabled` | `boolean` | `false` | Read-only editor. |
| `labels` | `ModelRoutingEditorLabels` | en / ar | Override any string. |

With automatic routing off every task class needs a model; a fallback must differ from its model. Save is blocked and the rows are marked until fixed. The pure helpers `modelsFor`, `routingIssues`, `routingEquals`, `toggleModality`, `validateProvider` and `isValidEndpoint` are exported.

## Examples

Read-only view:

```tsx
import { ModelRoutingEditor } from "@fadymondy/nasaq/web";

export const View = (props) => <ModelRoutingEditor {...props} disabled />;
```

Arabic: use `NasaqProvider locale="ar"`. Model names, provider names and endpoints stay left to right.

## Accessibility

Every select is named with its task class and role ("Chat: Model"). Errors sit under the field and are announced by Base UI Field; the form-level warning explains why Save is blocked. The backend choice and the modalities are labelled segmented groups; the modality chips of each provider are a labelled list with text, never colour alone. The register dialog is modal and returns focus to its button.

## RTL & i18n

- Logical properties; the route grid, the dialog and the toggles follow the reading direction.
- Model and provider names and endpoints are `dir="ltr"`; the endpoint input is forced left to right.
- Every string has an English and Arabic default.

## Styling & tokens

- Status badges use `--nq-success` and `--nq-danger`; cards use `--card`.
- Target `[data-slot="routing-route"][data-invalid]` for rows with a problem, `[data-slot="routing-provider"][data-active]` for the active backend.

## Do / Don't

- Do set a fallback on important task classes.
- Do keep model names as plain text without vendor logos.
- Don't register a provider without saying what it can do; a modality is required.

## Related

- [`AiModelPicker`](../ai-model-picker/README.md)
- [`AiUsageCost`](../ai-usage-cost/README.md)
- [`Select`](../select/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-agents-model-routing-editor--docs
