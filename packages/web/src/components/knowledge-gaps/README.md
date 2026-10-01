---
name: knowledge-gaps
title: KnowledgeGaps
category: ai-agents
status: beta
summary: Queries a knowledge base could not answer, grouped as open, indexed or dismissed, with hit counts, first and last asked, and actions to mark indexed, dismiss or reopen.
exports: [KnowledgeGapsLabels, KnowledgeGap, KnowledgeGapResult, KnowledgeGapsProps, KnowledgeGaps]
related: [semantic-search, brain-list, copilot-chat]
story: components-ai-agents-knowledge-gaps
keywords: [knowledge gap, unanswered, memory, brain, triage, search]
---

# KnowledgeGaps

A triage list of questions people asked that the brain had no answer for. Each gap shows how often it came up and when, and can be marked indexed (you added the missing knowledge), dismissed, or reopened.

## When to use

- A brain admin page that reviews unanswered questions.
- Any list where items move between open, done and dismissed with a server round trip.

## When not to use

- Searching memories: use [`SemanticSearch`](../semantic-search/README.md).
- General status workflows: use `EntityList` with status filters.

## Import

```tsx
import { KnowledgeGaps } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { KnowledgeGaps, type KnowledgeGap } from "@fadymondy/nasaq/web";

export function Gaps({ gaps }: { gaps: KnowledgeGap[] }) {
  return (
    <KnowledgeGaps
      gaps={gaps}
      onResolve={async (gap, status) => {
        const res = await api.setGapStatus(gap.id, status);
        if (!res.ok) return { error: res.message };
      }}
    />
  );
}
```

## Anatomy

A status filter (`ToggleGroup`) with counts, then a list per status. Each row: the query, a hits bar, first and last asked (`DateTime`), an optional resolution note, and Mark indexed, Dismiss or Reopen buttons. The same actions are in a context menu (`ContextMenuActions`).

## API

| Prop | Type | Description |
| --- | --- | --- |
| `gaps` | `KnowledgeGap[]` | `{ id, query, hits, firstSeen, lastSeen, status, resolution? }`. |
| `status` / `defaultStatus` / `onStatusChange` | `KnowledgeGapStatus \| "all"` | The active filter. |
| `onResolve` | `(gap, status) => void \| { error? } \| Promise` | Called for each action. Return `{ error }` to show it and keep the row unchanged. |
| `loading`, `error`, `onRetry` | | Loading skeleton, error state and retry. |
| `contextMenu` | `boolean` | Context menu on rows. Default true. |
| `labels` | `Partial<KnowledgeGapsLabels>` | Override any string. |

## Examples

**Uncontrolled filter, open first**

```tsx
<KnowledgeGaps gaps={gaps} defaultStatus="open" onResolve={save} />
```

## Accessibility

Status is text plus an icon, never colour alone. Action buttons carry the query in their accessible name. A busy button shows a spinner and is disabled while the request runs. Errors are announced.

## RTL & i18n

- English and Arabic strings ship and follow the Nasaq locale. Pass `labels` to override any string.
- Layout uses logical properties, so it mirrors in right-to-left. Numbers and dates follow the locale.

## Styling & tokens

- Status tones come from `Status` (neutral, success, warning). The hits bar uses `bg-nq-accent` on `bg-secondary`.

## Do / Don't

- Do return `{ error }` from `onResolve` instead of throwing.
- Don't hide the dismissed list; people reopen gaps.

## Related

- [`SemanticSearch`](../semantic-search/README.md)
- [`BrainList`](../brain-list/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-agents-knowledge-gaps--docs
