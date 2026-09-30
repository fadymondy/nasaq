---
name: score-explainer
title: ScoreExplainer
category: ai
status: beta
summary: A 0 to 100 score badge that opens the reasons behind it, one line per dimension with points, source chips, an inferred mark and confidence.
exports: [ScoreExplainerLabels, ScoreSource, ScoreDimension, ScoreExplainerProps, ScoreInferredMark, ScoreSourceChip, ScoreExplainer, ScoreBadgeProps, ScoreBadge]
related: [ai-states, leads-inbox, contact-list]
story: components-ai-score-explainer
keywords: [score, lead score, explain, evidence, sources, confidence, inferred, ai, reasons]
---

# ScoreExplainer

A number people should not have to trust blindly. `ScoreBadge` shows the score in a table cell; pressing it opens the
`ScoreExplainer`: what each dimension contributed and why, which sources back it, whether it was inferred, and how
confident the model is.

## When to use

- Lead, fit or health scores in a list or a record.
- Any AI number that drives a decision.

## When not to use

- A plain metric: use `Meter` or a stat.
- A yes/no verdict.

## Import

```tsx
import { ScoreBadge, ScoreExplainer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<ScoreBadge
  score={72}
  confidence={0.8}
  aiGenerated
  dimensions={[
    { id: "size", label: "Company size", points: 30, maxPoints: 40, reason: "51 to 200 employees", sources: [{ label: "LinkedIn", url: "https://example.com" }] },
    { id: "intent", label: "Intent", points: 42, maxPoints: 60, reason: "Visited pricing twice", inferred: true },
  ]}
/>
```

## Anatomy

- Badge: number and band word (High, Medium, Low), a dashed border and "≈" when inferred.
- Explainer: total, summary, confidence meter, dimensions sorted by points, each with a bar, reason, matched words, source chips and an inferred mark. Points that no dimension explains show as "Other".

## API

`ScoreExplainerProps`: `score`, `max` (100), `dimensions`, `summary`, `confidence` (0 to 1), `model`, `aiGenerated`, `compact`, `onSourceClick`, `labels`.

`ScoreDimension`: `{ id, label, points, maxPoints?, reason, matched?, sources?, inferred?, confidence? }`.
`ScoreSource`: `{ label, url?, kind?, inferred? }`.
`ScoreBadge` takes the same props plus `side` and `defaultOpen`.

Pure helpers: `clampScore`, `scoreExplainerBand`, `sortScoreDimensions`, `sumScorePoints`, `scoreRemainder`, `scoreDimensionFill`.

## Examples

Inline (no popover): `<ScoreExplainer score={72} dimensions={dims} />`.

## Accessibility

The badge is a button named "Score 72 of 100, High. Show why". Band is a word, never colour alone. Bars have text values.

## RTL & i18n

English and Arabic ship. Numbers use the locale; source URLs and matched keywords are isolated.

## Styling & tokens

Bands use success, warning and danger tokens. Extend with `className`.

## Do / Don't

- Do mark anything the model guessed as inferred.
- Don't show a score without a way to see why.

## Related

- [`AiGeneratedLabel`, `AiConfidenceMeter`](../ai-states/README.md)
- [`LeadsInbox`](../leads-inbox/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-score-explainer--docs
