---
name: funnel-builder
title: FunnelBuilder
category: analytics
status: beta
summary: "A form for building a funnel: name it, add steps from events or pages, reorder them and set the conversion time window."
exports: [FunnelBuilderLabels, FunnelSourceKind, FunnelSource, FunnelBuilderStep, FunnelDefinition, EMPTY_FUNNEL, FunnelBuilderProps, FunnelBuilder]
related: [funnel-chart, rule-builder, repeater]
story: components-analytics-funnel-builder
base-ui: [select]
keywords: [funnel, builder, events, pages, steps, conversion window]
---

# FunnelBuilder

FunnelBuilder is the editor for a funnel definition. A funnel has a name, two or more ordered steps and a window in which someone must complete them. Steps come from a list of tracked events and pages. The same event can be used twice, and steps are reordered with up and down buttons, so it works with keyboard and touch.

## When to use

- Creating or editing a funnel in an analytics or marketing tool.

## When not to use

- Showing results: use [`FunnelChart`](../funnel-chart/README.md).
- Free-form conditions: use [`RuleBuilder`](../rule-builder/README.md).

## Import

```tsx
import { FunnelBuilder } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { FunnelBuilder, type FunnelSource } from "@fadymondy/nasaq/web";

const sources: FunnelSource[] = [
  { id: "home", kind: "page", label: "Home page", detail: "/" },
  { id: "signup", kind: "event", label: "Signed up", detail: "user_signed_up" },
];

<FunnelBuilder sources={sources} onSave={async (funnel) => { await api.saveFunnel(funnel); }} />;
```

## Anatomy

```
FunnelBuilder        data-slot="funnel-builder"   (Card + form)
  name               Field + Input
  steps              ordered list: number, label, detail, move up, move down, remove
  add step           Select of events and pages
  window             number + unit (hour, day, week)
  footer             Save, with an error message when onSave fails
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sources` | `FunnelSource[]` | required | `{ id, kind: "event" \| "page", label, detail? }`. |
| `defaultValue` | `FunnelDefinition` | `EMPTY_FUNNEL` | `{ name, steps, window: { amount, unit } }`. |
| `onChange` | `(value) => void` | none | Called on every edit. |
| `onSave` | `(value) => Promise<void \| { error?: string }>` | required | Save is enabled with a name and at least 2 steps. An `{ error }` keeps the form open. |
| `title / description` | `ReactNode` | built-in | Header. |
| `className / labels` | | none | Classes; `Partial<FunnelBuilderLabels>` strings. |

`FunnelBuilderStep` is `{ id, sourceId, kind, label, detail? }`; `id` is unique inside the funnel.

## Examples

Editing an existing funnel:

```tsx
import { FunnelBuilder } from "@fadymondy/nasaq/web";

<FunnelBuilder sources={sources} defaultValue={saved} onSave={update} />;
```

Live preview of steps:

```tsx
import { FunnelBuilder } from "@fadymondy/nasaq/web";

<FunnelBuilder sources={sources} onChange={(v) => setSteps(v.steps)} onSave={save} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through fields and step buttons. |
| Enter / Space | Press a move, remove or add button. |

Move buttons have names that include the step ("Move Signed up up") and are disabled at the ends.

## RTL & i18n

Step numbers, arrows and layout follow the writing direction. Event names and paths stay left-to-right. Built-in English and Arabic strings.

## Styling & tokens

Standard field, card and button tokens. Logical spacing only.

## Do / Don't

- Do give the time window a sensible default (7 days).
- Do show the event name under a friendly label so analysts can verify it.
- Don't allow saving with fewer than two steps.

## Related

- [FunnelChart](../funnel-chart/README.md)
- [RuleBuilder](../rule-builder/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-analytics-funnel-builder--docs
