---
name: artifact-renderer
title: Artifact Renderer
category: ai
status: beta
summary: Generative UI from a schema. Turns an agent's JSON into a card, table, chart, Markdown, code, stats, action buttons or picker, validated and safe. HTML is off by default and only shown in a sandboxed frame.
exports: [ArtifactRendererLabels, ActionsArtifact, ArtifactCell, ArtifactTone, ArtifactVariant, CardArtifact, ChartArtifact, CodeArtifact, ExtractedArtifacts, HtmlArtifact, MarkdownArtifact, PickerArtifact, StatsArtifact, TableArtifact, ArtifactView, ArtifactRenderer, ArtifactList, ArtifactViewProps, ArtifactRendererProps, ArtifactListProps, Artifact, ArtifactText, ArtifactAction, ArtifactParse, ArtifactKind, ARTIFACT_KINDS, ARTIFACT_LIMITS, parseArtifact, safeColor, localize, frameHeight, frameDocument, extractArtifacts, pieSlices, PieSlice]
related: [ai-states, copilot-chat, markdown, code-block, chart-container, table, stat-card]
story: components-ai-assistant-artifact-renderer
base-ui: [dialog, checkbox, radio]
keywords: [artifact, generative ui, a2ui, agent, schema, json, render, sandbox, iframe, safe]
---

# Artifact Renderer

An agent answers with data, not markup. You hand its JSON to `ArtifactRenderer`, it checks the shape, and renders a
Nasaq component. Anything it does not understand becomes a small warning instead of a crash or an injection.

## When to use

- Agent or copilot output that should be a table, chart, card, picker or set of buttons instead of prose.
- Answers that contain fenced ` ```artifact ` blocks, which `extractArtifacts` pulls out.

## When not to use

- Plain answers: render Markdown with [`Markdown`](../markdown/README.md).
- UI you author yourself. Use the real components directly.

## Import

```tsx
import { ArtifactRenderer, ArtifactList, extractArtifacts } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ArtifactRenderer
  artifact={{ kind: "table", title: "Overdue invoices", columns: [{ key: "n", label: "No." }, { key: "amt", label: "Amount", align: "end" }], rows: [{ n: "INV-1", amt: 1200 }] }}
  onAction={(id, artifact) => run(id)}
  onPick={(values, artifact) => choose(values)}
/>;
```

Answer with blocks in it:

```tsx
const { text, artifacts } = extractArtifacts(answer);
<Markdown>{text}</Markdown>
<ArtifactList artifacts={artifacts} />
```

## Kinds

| `kind` | Fields |
| --- | --- |
| `card` | `title`, `description`, `badges`, `fields`, `items` (`label`, `description`, `value`, `tone`), `body` (Markdown, string or `{ en, ar }`), `footer` (a muted note), `actions` |
| `table` | `columns` (`key`, `label`, `align`), `rows` |
| `chart` | `chart` (`bar`, `line`, `area`, `pie`, `donut`), `xKey`, `series` (`key`, `label`, `color`), `data`. Pie and donut use the first series as slice sizes; past 8 slices the smallest fold into "Other" (`pieSlices`). |
| `markdown` | `text` |
| `code` | `code`, `language`, `filename` (shown with [`CodeBlock`](../code-block/README.md)) |
| `stats` | `items` (`label`, `value`, `delta`, `invert`, `tone`, `sparkline`: up to 60 numbers) |
| `actions` | `actions` (`id`, `label`, `variant`, `confirm`) |
| `picker` | `mode` (`single`, `multiple`), `options`, `defaultValue`, `submitLabel` |
| `html` | `html`, `height`. See Safety. |

Text fields take a string or `{ en, ar }`. The older `title_en` and `title_ar` keys are accepted.

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `artifact` | `unknown` | Validated. `ArtifactView` takes an already typed `Artifact` instead. |
| `allowHtml` | `boolean` | Default false. See Safety. |
| `onAction` | `(actionId, artifact) => void or Promise<{ error? }>` | Buttons. An action with `confirm` asks in a dialog first. |
| `onPick` | `(values, artifact) => void or Promise<{ error? }>` | Picker submit. |
| `labels` | `Partial<ArtifactRendererLabels>` | |

`parseArtifact(input)` returns `{ ok: true, artifact }` or `{ ok: false, error, kind? }` and never throws.

## Safety

- The renderer builds React elements from validated data. It never uses `dangerouslySetInnerHTML`.
- Limits apply: 200 rows, 20 columns, 8 series, 200 points, 50 options, 8 actions.
- Colours must be `var(--token)`. Hex values, `url()` and expressions are dropped.
- Series keys are remapped before they become CSS variable names, so a key cannot inject CSS.
- Markdown and card bodies go through `Markdown`, which drops raw HTML.
- A `tone` shows as a dot with the tone named for screen readers ("Critical: …"), so it never relies on colour alone.
- `html` is shown as a code block unless `allowHtml` is set. Then it goes in `<iframe sandbox="" srcDoc>`: no scripts,
  no same-origin access, no forms, and a Content Security Policy that blocks network. Only enable it for output you
  would show in a preview, and never give the frame `allow-same-origin`.
- Links open with `rel="noopener noreferrer"`. Only `http`, `https` and `mailto` are followed.

## Accessibility

- Tables are real tables with header cells. Charts have a text title and a legend.
- Picker uses a radio group or checkboxes with the option label and description associated.
- Action confirmation is a focus-trapping dialog. A sent picker announces "Sent".

## RTL and i18n

- Labels come from `useOptionalNasaq()` and the `{ en, ar }` fields pick by locale.
- Table alignment uses `start` and `end`. Charts flip the x axis in RTL via the chart primitives.
- Numbers use the locale digits through `Num`.

## Styling and tokens

Everything is a Nasaq component, so tokens are inherited. Series colours default to the `--nq-chart-*` palette.

## Do / Don't

- Do validate on every render path. `ArtifactRenderer` does it for you.
- Do keep `allowHtml` off unless a sandboxed preview is the point.
- Don't pass model output to `ArtifactView` without `parseArtifact`.
- Don't add a kind that runs code.

## Related

[`Markdown`](../markdown/README.md), [`CodeBlock`](../code-block/README.md), [`CopilotChat`](../copilot-chat/README.md),
[`AgentSteps`](../agent-steps/README.md).
