---
name: research-run
title: ResearchRun
category: ai
status: beta
summary: A research run with an ask box, live stage progress, an answer whose sentences cite numbered evidence, the evidence list, sources, confidence and failed or cancelled states with retry.
exports: [ResearchRunLabels, ResearchStatus, ResearchStage, ResearchEvidence, ResearchAnswerBlock, ResearchRunData, ResearchRunResult, ResearchRunProps, ResearchRun]
related: [copilot-chat, ai-states, run-history, semantic-search]
story: components-ai-research-run
keywords: [research, run, evidence, citations, answer, progress]
---

# ResearchRun

Ask a question and follow a research run: the stages it goes through, how many sources it checked and read, and then an answer where each claim points to the evidence behind it.

## When to use

- A research or deep-analysis feature where the answer must be checkable.

## When not to use

- A conversational chat: use [`CopilotChat`](../copilot-chat/README.md).
- A history of past runs: use `RunHistory`.

## Import

```tsx
import { ResearchRun } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ResearchRun
  run={run}
  onAsk={(question) => start(question)}
  onCancel={() => cancel()}
  onRetry={(run) => start(run.question)}
/>
```

## Anatomy

An ask `Textarea` (Ctrl or Cmd + Enter) with suggestion chips, a Stages panel (`AiThinking` while running), the answer article (`AiGeneratedLabel`, `AiConfidenceMeter`, numbered citation buttons), the evidence list (plus Also found for uncited quotes), and `CopilotSources`. Failed and cancelled runs show a panel with retry.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `run` | `ResearchRunData \| null` | `{ id, question, status, stages?, sourcesChecked?, sourcesRead?, answer?, evidence?, sources?, confidence?, model?, finishedAt?, error? }`. |
| `onAsk` | `(question) => void \| { error? } \| Promise` | Required. |
| `onCancel` | `() => void` | Shows Stop while running. |
| `onRetry` | `(run) => void` | Retry a failed or cancelled run. |
| `suggestions`, `defaultQuestion`, `labels` | | |

Answer blocks are `{ id, text, cites: evidenceId[] }`; evidence is `{ id, sourceId?, quote, relevance? }`. Numbers follow the order evidence first appears.

## Examples

**Finished run**

```tsx
<ResearchRun run={{ id: "1", question, status: "done", answer, evidence, sources }} onAsk={ask} />
```

## Accessibility

Progress is a list with a text state per stage. Citations are buttons named by their number; activating one highlights and scrolls to that evidence. Generated content is labelled.

## RTL & i18n

- English and Arabic strings ship and follow the Nasaq locale. Pass `labels` to override any string.
- Layout uses logical properties, so it mirrors in right-to-left. Quotes use `dir="auto"`.

## Styling & tokens

- Uses `AiThinking`, `AiConfidenceMeter` and `AiGeneratedLabel` from `ai-states`. Cards use `bg-card` and `border-border`.

## Do / Don't

- Do cite every claim with at least one evidence id.
- Don't show an answer for a run that is not done.

## Related

- [`CopilotChat`](../copilot-chat/README.md)
- [`AiStates`](../ai-states/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-research-run--docs
