---
name: agent-persona-editor
title: AgentPersonaEditor
category: ai-agents
status: beta
summary: Editor for an AI agent persona with name, tagline, colour, icon, traits, model, greeting and a markdown persona with write and preview tabs, section chips, counts, save and revert.
exports: [AgentPersonaEditorLabels, AgentPersona, AgentPersonaModel, AgentPersonaSaveResult, AgentPersonaEditorProps, AgentPersonaPreviewProps, AgentPersonaPreview, AgentPersonaEditor]
related: [ai-model-picker, markdown, tag-input, copilot-chat]
story: components-ai-agents-agent-persona-editor
keywords: [agent, persona, prompt, markdown, colour, icon, traits, editor]
---

# AgentPersonaEditor

Define who an agent is: its identity (name, colour, icon), voice (traits, greeting) and the markdown persona instructions, with a live preview card.

## When to use

- Creating or editing an agent in an admin area.

## When not to use

- Editing generic markdown: use `RichTextEditor` or [`Markdown`](../markdown/README.md).
- Picking only a model: use `AiModelSelect`.

## Import

```tsx
import { AgentPersonaEditor } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AgentPersonaEditor
  value={agent}
  models={models}
  onSave={async (draft) => {
    const res = await api.saveAgent(draft);
    if (!res.ok) return { error: res.message };
  }}
/>
```

## Anatomy

A form: name and tagline, colour and icon pickers, traits (`TagInput`, up to 8), model (`AiModelSelect`), greeting, then the persona in Write and Preview tabs (`Textarea` and `Markdown`) with section chips (Role, Tone, Rules and more), word and character counts and Save and Revert. `AgentPersonaPreview` shows the identity card.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `AgentPersona` | `{ name, tagline?, color, icon, persona, traits, model?, greeting? }`. The saved baseline. |
| `onChange` | `(draft) => void` | Called on every edit. |
| `onSave` | `(draft) => void \| { error? } \| Promise` | Required. |
| `models` | `AgentPersonaModel[]` | Model options. Hides the picker when empty. |
| `traitSuggestions` | `string[]` | Suggestions for the traits input. |
| `maxLength` | `number` | Persona limit. Default 4000; 0 turns it off. |
| `hidePreview`, `disabled`, `labels` | | |

The editor keeps its own draft and resets when `value` changes to something different.

## Examples

**Without the preview card**

```tsx
<AgentPersonaEditor value={agent} hidePreview onSave={save} />
```

## Accessibility

Every field has a label. Errors are tied to their field. The Write and Preview tabs use `Tabs`. Save is disabled until the draft changes and is valid. The save result is announced in a status line.

## RTL & i18n

- English and Arabic strings ship and follow the Nasaq locale. Pass `labels` to override any string.
- Layout uses logical properties, so it mirrors in right-to-left. The persona text uses `dir="auto"`.

## Styling & tokens

- The colour is a `--nq-tag-*` token, rendered with `colorToCss`. Cards use `bg-card` and `border-border`.

## Do / Don't

- Do keep the persona in markdown so it can be diffed and versioned.
- Don't put secrets in the persona.

## Related

- [`AiModelSelect`](../ai-model-picker/README.md)
- [`Markdown`](../markdown/README.md)
- [`TagInput`](../tag-input/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-ai-agents-agent-persona-editor--docs
