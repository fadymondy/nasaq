---
name: ask-ai
title: Ask AI and Insight Card
category: ai
status: beta
summary: Ask AI about selected text with a popover that appears on selection, quick actions and a question box. Plus an inline AI insight card with finding, metric, reasoning, sources, confidence and next actions.
exports: [AskAiLabels, AskAiRequest, AskAiSelection, AskAiSelectionProps, AiInsightCard, AiInsightAction, AiInsightMetric, AiInsightCardProps, normalizeSelection, shortenMiddle, isIgnoredTarget, readOutcome, deltaTone, AskAiOutcome, NormalizedSelection]
related: [ai-states, ai-citations, copilot-chat, popover, markdown]
story: components-ai-ask-ai-and-insight-card
base-ui: [popover]
keywords: [ask ai, selection, highlight, explain, summarize, translate, insight, popover, inline ai]
---

# Ask AI and Insight Card

`AskAiSelection` wraps read-only content. Select text and a small "Ask AI" pill appears by the selection. Press it and
a panel offers quick actions and a question box, then shows the answer in place. `AiInsightCard` is the other half:
something the AI noticed, placed where it applies.

## When to use

- Articles, docs, reports, emails and tickets where a reader may want a word or passage explained.
- A dashboard or record that should surface one AI finding with its reasoning and next step.

## When not to use

- A conversation: use [`CopilotChat`](../copilot-chat/README.md).
- Editing text: this never changes the page. Offer `onReplace` and change the text yourself.

## Import

```tsx
import { AskAiSelection, AiInsightCard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AskAiSelection onAsk={async ({ prompt, selection, actionId }) => (await model.ask(prompt, selection)).text}>
  <article>...</article>
</AskAiSelection>

<AiInsightCard
  title="Signups fell 18% on mobile"
  tone="warning"
  metric={{ label: "Mobile signups", value: 1240, delta: -0.18 }}
  body="The drop starts on the day the new form shipped. [Details](#)"
  confidence={0.78}
  actions={[{ id: "open", label: "Open the funnel" }]}
  onAction={(id) => go(id)}
  onAsk={() => openChat()}
/>
```

## API

### `AskAiSelection`

| Prop | Type | Notes |
| --- | --- | --- |
| `children` | `ReactNode` | The content to watch. |
| `onAsk` | `(req: { prompt, selection, actionId? }) => Promise<AskAiOutcome>` | Return Markdown text, `{ text }` or `{ error }`. A rejection shows the failure with Try again. |
| `onReplace` | `(answer, selection) => void` | Adds "Replace selection" under an answer. |
| `actions` | `AiAction[]` | Quick actions. Default: explain, summarize, translate, improve, define. `[]` for none. |
| `minLength` | `number` | Default 3. Shorter selections are ignored. |
| `maxLength` | `number` | Default 2000. Longer selections are cut and the panel says so. |
| `hotkey` | `string \| null` | Default `mod shift space`. `null` turns it off. |
| `disabled` | `boolean` | |
| `labels` | `Partial<AskAiLabels>` | |

Selections inside inputs, textareas, editors and any `data-ask-ai-ignore` element are ignored.

### `AiInsightCard`

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | `ReactNode` | The finding in one line. |
| `body` | `string` | Markdown. |
| `tone` | `neutral \| info \| success \| warning \| danger` | Edge colour and small label. |
| `metric` | `{ label, value, format?, delta?, invert? }` | `delta` is a fraction, so 0.124 shows +12.4%. `invert` makes down good. |
| `confidence` | `number` | 0 to 1. |
| `sources` | `AiCitationSource[]` | Shown as chips. |
| `model` | `string` | |
| `actions`, `onAction` | | Buttons for the next step. |
| `onAsk` | `() => void` | Adds "Ask AI about this". |
| `onDismiss` | `() => void` | Adds a close button. |
| `feedback`, `onFeedback` | | Thumbs. |
| `loading`, `streaming` | `boolean` | Shimmer, or a streaming body. |
| `variant` | `card \| inline` | `inline` is a tinted strip with no card chrome. |

## Examples

- Only explain and translate: `actions={[{ id: "explain", label: "Explain" }, { id: "translate", label: "Translate" }]}`.
- A cost metric where lower is better: `metric={{ label: "Cost", value: 92, delta: -0.1, invert: true }}` shows green.

## Accessibility

- The pill is a button, and the keyboard shortcut does the same for people who select with the keyboard.
- Opening the panel moves focus to the question box. Escape closes it and clears the selection.
- The pill does not steal focus, so a screen reader keeps its place in the text.
- The insight card is a labelled section. The tone is written out, not colour only.

## RTL and i18n

- English and Arabic labels come from `useOptionalNasaq()`, and every text can be replaced with `labels`.
- The quote, question and answer use `dir="auto"`. The card accent sits on the start edge, so it flips in RTL.
- Percent and number values use locale digits through `Num`.

## Styling and tokens

The popup uses the popover and floating tokens. The insight edge uses `--nq-accent` and the status families.

## Do / Don't

- Do return short answers. The panel is small.
- Do mark unsure findings with a `confidence`.
- Don't send the selection anywhere before the reader asks. Nothing is sent until they press an action.
- Don't wrap forms or editors. They are ignored anyway.

## Related

[`AiStates`](../ai-states/README.md), [`AiCitedAnswer`](../ai-citations/README.md),
[`CopilotChat`](../copilot-chat/README.md), [`Popover`](../popover/README.md).
