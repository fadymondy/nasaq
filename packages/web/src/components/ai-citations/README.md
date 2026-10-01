---
name: ai-citations
title: AI Citations and Provenance
category: ai
status: beta
summary: Show where an AI answer came from. Inline numbered markers that open a quote, source chips, evidence cards with the quoted passage, and a provenance line with model, latency, grounding and confidence.
exports: [AiCitationsLabels, AiCitationSource, AiEvidenceCard, AiCitedText, AiSourceChips, AiProvenanceInfo, AiProvenance, AiCitedAnswer, AiEvidenceCardProps, AiCitedTextProps, AiSourceChipsProps, AiProvenanceProps, AiCitedAnswerProps, citationHref, parseCitationHref, markerNumbers, linkCitations, citedNumbers, citationCoverage, splitHighlight, latencyParts, HighlightPart]
related: [ai-states, copilot-chat, markdown, popover, collapsible]
story: components-ai-assistant-ai-citations-and-provenance
base-ui: [popover, collapsible]
keywords: [ai, citations, sources, provenance, grounding, evidence, quote, footnote, rag, references]
---

# AI Citations and Provenance

An answer people can check. The text carries `[1]` style markers, each marker opens the quote it rests on, the sources
sit below as chips, and a provenance line says which model answered, how long it took and whether the answer was
grounded in sources. They hold no retrieval or model logic: you pass the answer and the sources you used.

## When to use

- Answers from retrieval (RAG), search or a knowledge base, where the reader must be able to verify a claim.
- Any AI output where you want to show the model, latency and confidence in one calm line.

## When not to use

- A plain summary with a source list only: [`AiSummary`](../ai-states/README.md) already has that.
- A full conversation: use [`CopilotChat`](../copilot-chat/README.md), which has its own non-interactive source row.

## Import

```tsx
import { AiCitedAnswer, type AiCitationSource } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const sources: AiCitationSource[] = [
  { id: "s1", title: "Q3 report", url: "https://example.com/q3", quote: "Revenue grew 12% year on year.", locator: "p. 4" },
  { id: "s2", title: "Board notes", quote: "Churn fell to 2.1%." },
];

<AiCitedAnswer
  text="Revenue grew 12% [1] while churn fell [2]."
  sources={sources}
  provenance={{ model: "claude-sonnet", latencyMs: 1240, grounded: true, confidence: 0.86 }}
  onFeedback={(v) => save(v)}
/>;
```

## Anatomy

| Part | What it is |
| --- | --- |
| `AiCitedAnswer` | The whole answer: label, text, chips, evidence, coverage note, provenance, thumbs. |
| `AiCitedText` | Just the Markdown text with `[n]` markers turned into buttons. |
| `AiSourceChips` | The row of source chips. Hover or press one to light up its markers. |
| `AiEvidenceCard` | One source with its quote, locator, kind and match score. |
| `AiProvenance` | Model, latency, grounded state, source count, tokens, retrieval time, confidence. |

## API

### `AiCitationSource`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable id. Used for highlight state. |
| `title` | `string` | Shown on the chip and card. |
| `url` | `string?` | Only `http`, `https` and `mailto` links are rendered as links. |
| `quote` | `string?` | The passage the answer rests on. |
| `snippet` | `string?` | Fallback when there is no quote. |
| `locator` | `string?` | Page, section or timestamp: "p. 4". |
| `kind` | `string?` | "PDF", "Web", "Ticket". |
| `score` | `number?` | 0 to 1 match strength, shown as a percentage. |
| `highlight` | `string \| string[]?` | Words to mark inside the quote. Plain data, never HTML. |

### `AiCitedAnswer`

| Prop | Type | Notes |
| --- | --- | --- |
| `text` | `string` | Markdown with `[1]`, `[1, 2]` or `[2-4]` markers. Numbers with no source stay plain text. |
| `sources` | `AiCitationSource[]` | Marker 1 is `sources[0]`. |
| `provenance` | `AiProvenanceInfo?` | `model`, `latencyMs`, `grounded`, `sourceCount`, `tokens`, `retrieved`, `at`, `confidence`, `extra`. |
| `model` | `string?` | Name after the "AI generated" label. Defaults to `provenance.model`. |
| `defaultEvidenceOpen` | `boolean` | Start with the evidence cards open. |
| `feedback`, `onFeedback` | | Thumbs, controlled. |
| `onSourceOpen` | `(source) => void` | Fires when a chip is pressed. |
| `labels` | `Partial<AiCitationsLabels>` | Override any text. |

`AiCitedText`, `AiSourceChips`, `AiEvidenceCard` and `AiProvenance` take the matching subset, plus `activeId` and
`onActiveChange` where marker, chip and card share a highlight.

## Examples

- Text only, in a chat bubble: `<AiCitedText text={answer} sources={sources} />`.
- Sources you cite in a summary card: `<AiSourceChips sources={sources} citedIds={["s1"]} />`.
- Ungrounded answer: `provenance={{ model: "x", grounded: false }}` shows a "not grounded" state, so nobody reads it as checked.

## Accessibility

- A marker is a real button named "Source 1: title". Its popover shows the quote, and Escape closes it.
- Chips are buttons, and the evidence list is a labelled list.
- Grounded and confidence are text, never colour alone.
- Nothing moves on its own, so reduced motion needs no special handling.

## RTL and i18n

- English and Arabic labels come from `useOptionalNasaq()`, and every text can be replaced with `labels`.
- Markers and quotes use `dir="auto"`, so an Arabic answer with an English source title reads correctly.
- Numbers, latency, model names and URLs stay left to right inside their own `bdi`.

## Styling and tokens

Uses `--nq-accent`, `--nq-hover`, `--nq-success-text` and the border and popover tokens. The active marker, chip and
card share the accent ring, so there is one highlight to learn.

## Do / Don't

- Do put the quote the model actually used, not a paraphrase.
- Do list only sources the answer used.
- Don't show markers for sources that do not exist. Out-of-range numbers are left as text on purpose.
- Don't pass user-written HTML in `quote`. It is rendered as text.

## Related

[`AiSummary`](../ai-states/README.md), [`CopilotChat`](../copilot-chat/README.md), [`Markdown`](../markdown/README.md),
[`Popover`](../popover/README.md), [`AgentSteps`](../agent-steps/README.md).
