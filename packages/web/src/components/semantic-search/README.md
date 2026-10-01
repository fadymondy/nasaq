---
name: semantic-search
title: SemanticSearch
category: ai
status: beta
summary: Semantic memory search with a query box, mode and limit, results with facet chips, highlighted words and a score with a level word.
exports: [SemanticSearchLabels, SemanticHit, SemanticSearchOptions, SemanticSearchProps, SemanticSearch]
related: [knowledge-gaps, brain-list, copilot-chat, command-palette]
story: components-ai-assistant-semantic-search
keywords: [semantic search, memory, recall, facets, score, brain, retrieval]
---

# SemanticSearch

Search a brain by meaning. The result list is filterable by facets (group, type, source, high importance) and every hit shows how strongly it matched.

## When to use

- A brain or knowledge base search page.
- Debugging retrieval: showing scores next to hits.

## When not to use

- Jumping to app pages and commands: use [`CommandPalette`](../command-palette/README.md).
- Answering a question with citations: use [`ResearchRun`](../research-run/README.md) or `CopilotChat`.

## Import

```tsx
import { SemanticSearch } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<SemanticSearch
  results={results}
  searching={pending}
  onSearch={async (query, { mode, limit }) => setResults(await api.recall(query, mode, limit))}
  onOpen={(hit) => open(hit.id)}
/>
```

## Anatomy

A search field with a mode toggle (semantic or keyword) and a result limit. Below it the facet chips, then hits. Each hit: content with the query words highlighted (`<mark>`), a score bar and level word, chips for group, type and source, and a context menu with Open and Copy.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `onSearch` | `(query, { mode, limit }) => void \| Promise` | Required. Called on submit. |
| `results` | `SemanticHit[]` | `undefined` means idle; an empty array means no results. |
| `searching`, `error`, `onRetry` | | Progress and failure. |
| `onOpen` | `(hit) => void` | Open a hit. |
| `modes`, `defaultMode`, `limits`, `defaultLimit`, `defaultQuery` | | Search options. |
| `showScores`, `contextMenu` | `boolean` | Show the score bar; enable the context menu. |
| `labels` | `Partial<SemanticSearchLabels>` | Override any string. |

`SemanticHit` is `{ id, content, score (0 to 1), group?, kind?, source?, sourceRef?, importance?, viaEntity? }`.

## Examples

**Keyword only**

```tsx
<SemanticSearch modes={["keyword"]} onSearch={search} />
```

## Accessibility

The score is shown as a word (strong, good, weak) as well as a bar. Facet chips are toggle buttons with `aria-pressed`. Highlighted words use `<mark>`. The result count is announced.

## RTL & i18n

- English and Arabic strings ship and follow the Nasaq locale. Pass `labels` to override any string.
- Layout uses logical properties, so it mirrors in right-to-left. Numbers follow the locale.

## Styling & tokens

- The score bar uses Nasaq status tokens by level. Facet chips use `Badge`-style surfaces on `bg-card` and `border-border`.

## Do / Don't

- Do send `score` on a 0 to 1 scale.
- Don't pass `[]` before the first search; leave `results` undefined.

## Related

- [`KnowledgeGaps`](../knowledge-gaps/README.md)
- [`CommandPalette`](../command-palette/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-assistant-semantic-search--docs
