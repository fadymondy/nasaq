---
name: weighted-criteria-card
title: WeightedCriteriaCard
category: ai
status: beta
summary: "A human-in-the-loop step: the assistant suggests criteria, the person switches each on or off, sets its weight, adds their own and confirms."
exports: [WeightedCriteriaCard, WeightedCriteriaCardProps, WeightedCriteriaCardLabels, WeightedCriterion, CriterionWeight, CRITERION_WEIGHTS, criteriaShares, cycleWeight, addCriterion]
related: [artifact-renderer, copilot-chat, toggle-group, switch]
story: components-ai-assistant-weighted-criteria-card
base-ui: [switch, toggle-group, input]
keywords: [criteria, factors, weights, priorities, compare, decision, human in the loop, ai, assistant, ranking]
---

# WeightedCriteriaCard

Before an assistant compares vendors, ranks candidates or recommends a plan, it can ask what matters. This card shows
the criteria it suggests. The person:

- switches each criterion on or off;
- sets its weight to Low, Medium or High;
- adds their own criteria;
- confirms.

A thin bar under each enabled criterion shows its share of the decision.

## When to use

- Inside a copilot answer, before a comparison or a ranking.
- Anywhere a person tunes a short list of weighted factors before an automated step runs.

## When not to use

- A single or multiple choice with no weights: use the `picker` artifact of [`ArtifactRenderer`](../artifact-renderer/README.md).
- Numeric weights or long lists: use a form with sliders or a table.

## Import

```tsx
import { WeightedCriteriaCard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<WeightedCriteriaCard
  description="I will rank the three vendors with these."
  defaultCriteria={[
    { id: "price", label: "Price", weight: "high", enabled: true },
    { id: "support", label: "Support", description: "Arabic support, response time", weight: "medium", enabled: true },
    { id: "speed", label: "Delivery speed", weight: "low", enabled: false },
  ]}
  onAccept={async (criteria) => {
    await copilot.send("Rank with these criteria", undefined, { hidden: true, data: { type: "criteria", criteria } });
  }}
/>
```

## Anatomy

```
Card                      data-slot="weighted-criteria-card"  data-sent
├─ CardHeader             title, description
├─ ul                     labelled by the title
│  └─ li                  data-slot="weighted-criterion"  data-enabled
│     ├─ Switch           include / exclude
│     ├─ label, description
│     ├─ ToggleGroup      Low / Medium / High
│     ├─ remove           custom criteria only
│     └─ share bar        decorative
├─ form                   add your own (Input + Add)
└─ CardFooter             "2 of 3 included" (polite live region) + Accept
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultCriteria` | `WeightedCriterion[]` | `[]` | The suggested criteria, uncontrolled. |
| `criteria` / `onCriteriaChange` | | | Controlled list. |
| `onAccept` | `(criteria) => void \| { error? } \| Promise<…>` | | Confirm. On success the card locks and shows Sent; an `{ error }` or a rejection shows an alert. |
| `title` / `description` | `ReactNode` | "What matters most?" | |
| `allowCustom` | `boolean` | `true` | Show the add form. Custom criteria can be removed; suggested ones can only be switched off. |
| `showShares` | `boolean` | `true` | Bars with each enabled criterion's share. |
| `disabled` | `boolean` | `false` | |
| `labels` | `WeightedCriteriaCardLabels` | | Override any string. |

`WeightedCriterion`: `{ id, label, description?, weight: "low" | "medium" | "high", enabled, custom? }`.

Pure helpers:

- `criteriaShares(criteria)`: a map from id to share. Low counts 1, Medium 2 and High 3, and the enabled shares sum to 1.
- `cycleWeight(weight)`: the next weight.
- `addCriterion(criteria, label, id)`: adds a trimmed label and ignores blanks and duplicates.

## Accessibility

- The list is labelled by the card title.
- Each switch is named "Include {label}", and each weight group "Weight of {label}". The weight group follows arrow keys in the reading direction.
- The weight group is disabled while its criterion is off.
- The count in the footer is a polite live region. Errors show as an alert.
- The share bars are decorative; the weights carry the meaning in text.

## RTL & i18n

Strings ship in English and Arabic. Labels use `dir="auto"`, so mixed-language criteria read correctly. The layout
mirrors with logical properties.

## Styling & tokens

`Card`, `rounded-control` list with `divide-border`, share bars in `bg-primary` on `bg-secondary`, `ease-nq` width
transition.

## Do / Don't

- Do suggest three to six criteria with a short description each.
- Do send the accepted list back to the assistant as data, not as visible text.
- Don't use it for a plain choice; the picker artifact is lighter.

## Related

- [`artifact-renderer`](../artifact-renderer/README.md)
- [`copilot-chat`](../copilot-chat/README.md)
- [`toggle-group`](../toggle-group/README.md)
- [`switch`](../switch/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-assistant-weighted-criteria-card--docs
